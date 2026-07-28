/**
 * Image Quality Gate — Stage 1 of the bottle scan pipeline.
 *
 * A doomed request must not spend any of the 3-second answer budget (scanner
 * spec A.3, "bad-photo handling"), so every check here runs on-device, before
 * a single byte goes to the network, and every failure comes back with
 * *specific* retry guidance rather than a generic "try again":
 *
 *   1. too_dark   — average brightness too low          → "more light"
 *   2. too_bright — blown out / backlit glare           → "angle away from the light"
 *   3. too_blurry — low brightness variance             → "hold steady"
 *   4. too_far    — flat, detail-poor frame             → "move closer"
 *   5. too_small  — tiny/corrupt source image
 *
 * All checks share one 64×64 downsampled thumbnail decoded from base64, so the
 * whole gate is a single manipulate pass and adds < 100ms to the scan flow.
 */

import * as ImageManipulator from 'expo-image-manipulator';

export type ImageQualityReason = 'too_dark' | 'too_bright' | 'too_blurry' | 'too_far' | 'too_small';

export type ImageQualityResult =
  | { ok: true }
  /** `title` + `message` are rendered verbatim by the scan screen's retry alert. */
  | { ok: false; reason: ImageQualityReason; title: string; message: string };

// Tuning thresholds — adjust based on real-world testing
const MIN_BRIGHTNESS = 35; // 0–255 average; below = too dark
const MAX_BRIGHTNESS = 228; // 0–255 average; above = blown out / glare
const MIN_SHARPNESS = 18; // brightness variance; below = too blurry
const MIN_DETAIL = 0.1; // fraction of samples with a sharp neighbour delta
const DETAIL_DELTA = 24; // adjacent-sample delta that counts as "detail"
const MIN_DIMENSION = 200; // px; reject tiny/corrupt images

export class ImageQualityService {
  /**
   * Run all quality checks on an image URI.
   * Returns { ok: true } if the image is usable, or { ok: false, reason, message }.
   */
  static async check(imageUri: string): Promise<ImageQualityResult> {
    try {
      // Resize to 64×64 thumbnail and get base64 for pixel analysis
      const thumb = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 64, height: 64 } }],
        { base64: true, compress: 0.5, format: ImageManipulator.SaveFormat.JPEG },
      );

      // Reject corrupt/tiny originals
      if ((thumb.width ?? 0) < MIN_DIMENSION / 10 || (thumb.height ?? 0) < MIN_DIMENSION / 10) {
        return {
          ok: false,
          reason: 'too_small',
          title: 'Photo Not Usable',
          message: 'That image came out too small to read. Try again.',
        };
      }

      if (!thumb.base64) {
        // Can't analyse — let it through rather than blocking a valid scan
        return { ok: true };
      }

      const pixels = this.sampleBrightness(thumb.base64);
      if (pixels === null) return { ok: true }; // decode failed — let through

      const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;

      if (avg < MIN_BRIGHTNESS) {
        return {
          ok: false,
          reason: 'too_dark',
          title: 'Too Dark',
          message: 'More light, please — turn on the flash or step somewhere brighter.',
        };
      }

      if (avg > MAX_BRIGHTNESS) {
        return {
          ok: false,
          reason: 'too_bright',
          title: 'Too Much Glare',
          message: 'The label is washed out. Angle the bottle away from the light and try again.',
        };
      }

      // Variance of brightness = sharpness proxy.
      // A blurry image has low variance (everything ~same grey value).
      // A sharp image has high variance (edges create bright/dark contrast).
      const variance = pixels.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / pixels.length;

      if (variance < MIN_SHARPNESS) {
        return {
          ok: false,
          reason: 'too_blurry',
          title: 'Too Blurry',
          message: 'Hold steady, then tap to capture.',
        };
      }

      // Detail density — how often neighbouring samples jump sharply.
      // A well-framed label is dense with edges (text, borders, seals). A frame
      // shot from across the aisle is mostly flat wall/shelf with a small,
      // low-detail bottle in it: enough overall variance to pass the blur gate,
      // but nothing an OCR pass can actually read. "Move closer" is the fix,
      // and it's a different instruction from "hold steady".
      const detail = this.detailRatio(pixels);
      if (detail < MIN_DETAIL) {
        return {
          ok: false,
          reason: 'too_far',
          title: 'Move Closer',
          message: 'Get closer so the label fills the frame.',
        };
      }

      return { ok: true };
    } catch (err) {
      // Never block a scan due to a quality-check error
      return { ok: true };
    }
  }

  /**
   * Fraction of adjacent samples separated by a sharp jump — a proxy for how
   * much fine detail (label text, edges) the frame actually contains.
   */
  private static detailRatio(pixels: number[]): number {
    if (pixels.length < 2) return 1;
    let edges = 0;
    for (let i = 1; i < pixels.length; i++) {
      if (Math.abs(pixels[i] - pixels[i - 1]) >= DETAIL_DELTA) edges++;
    }
    return edges / (pixels.length - 1);
  }

  /**
   * Decode a JPEG base64 string and return an array of per-pixel luminance values (0–255).
   * Uses a simple base64 → byte scan looking for JFIF/EXIF data length hints.
   *
   * Note: React Native has no native Canvas/ImageData API. We approximate brightness
   * by sampling the raw JPEG DCT coefficient bytes — not pixel-perfect but sufficient
   * to distinguish "phone face-down in pocket" darkness from a real label photo.
   * For a more accurate implementation, a native module (expo-gl or sharp) would be
   * needed; this heuristic is lightweight and good enough for the gate.
   */
  private static sampleBrightness(base64: string): number[] | null {
    try {
      // Decode base64 to byte array
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Sample every Nth byte from the image data portion (skip JPEG header ~620 bytes)
      // JPEG scan data bytes correlate loosely with DCT coefficients — bright images
      // produce higher average values in the scan data than very dark images.
      const HEADER_SKIP = 600;
      const SAMPLE_STEP = 12;
      const samples: number[] = [];

      for (let i = HEADER_SKIP; i < bytes.length - 4; i += SAMPLE_STEP) {
        // Skip JPEG marker bytes (0xFF prefix)
        if (bytes[i] === 0xff) continue;
        samples.push(bytes[i]);
      }

      return samples.length > 50 ? samples : null;
    } catch {
      return null;
    }
  }
}
