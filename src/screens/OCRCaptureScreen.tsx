import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
  Platform,
  PanResponder,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { OCRService } from '../services/ocrService';
import { AIRecipeFormatter } from '../services/aiRecipeFormatter';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { log } from '../lib/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Minimum selection size in px
const MIN_SIZE = 60;

interface SelectionBox {
  x: number; // 0–1 relative to image
  y: number;
  w: number;
  h: number;
}

type Mode = 'initial' | 'loading' | 'crop' | 'result';

// ─── Spec parser ─────────────────────────────────────────────────────────────
// Light client-side parse for the result preview. AI does the real formatting.
function parseSpec(text: string): { title: string | null; lines: string[] } {
  const allLines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let title: string | null = null;
  const rest: string[] = [];

  allLines.forEach((line, i) => {
    const wordCount = line.split(/\s+/).length;

    // Drop all-caps menu noise that slips through OCR cleaning
    // e.g. "ABOUT MENU DR", "COCKTAILS", "SPECIALS"
    const isAllCapsNoise =
      /^[A-Z][A-Z\s]{2,}$/.test(line) && wordCount <= 5;

    if (isAllCapsNoise) return;

    const looksLikeTitle =
      !title &&
      i < 4 &&
      wordCount >= 1 && wordCount <= 6 &&
      /^[A-Z]/.test(line) &&
      !/^\d/.test(line) &&
      !/[\$£€%@#]/.test(line) &&
      !/,/.test(line) &&
      !/\d\s*(oz|ml|tsp|tbsp|dash)/i.test(line) &&
      !isAllCapsNoise;

    if (looksLikeTitle) {
      title = line;
    } else {
      rest.push(line);
    }
  });

  return { title, lines: rest };
}

export default function OCRCaptureScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<Mode>('initial');
  const [loadingLabel, setLoadingLabel] = useState('Reading recipe...');
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState({ w: 1, h: 1 });
  const [visionLoading, setVisionLoading] = useState(false);
  // True when the text was extracted from a cropped menu region
  const [fromMenu, setFromMenu] = useState(false);

  // Crop state — stored as absolute px within the displayed image container
  const cropContainerRef = useRef<{ x: number; y: number; w: number; h: number }>({
    x: 0, y: 0, w: 0, h: 0,
  });
  // Selection box in px (within the displayed image)
  const [sel, setSel] = useState({ x: 40, y: 40, w: 220, h: 160 });
  const selRef = useRef(sel);
  selRef.current = sel;

  useLayoutEffect(() => {
    nav.setOptions({
      title: 'Scan Recipe',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '700', fontFamily: serif },
      headerShadowVisible: false,
    });
  }, [nav]);

  // ─── Image capture ──────────────────────────────────────────────────────

  const captureAndExtract = async (source: 'camera' | 'gallery') => {
    try {
      setMode('loading');
      setLoadingLabel('Reading recipe...');
      const result = source === 'camera'
        ? await OCRService.takePhotoAndExtractText()
        : await OCRService.pickImageAndExtractText();

      if (result) {
        setFromMenu(false);
        setExtractedText(result.text);
        setImageUri(result.imageUri);
        setMode('result');
      } else {
        setMode('initial');
      }
    } catch (error: any) {
      log.error('OCRCaptureScreen', 'Capture error', error);
      Alert.alert('Error', 'Could not process the image. Please try again.');
      setMode('initial');
    }
  };

  // ─── Menu isolation: capture image then go to crop mode ─────────────────

  const captureForCrop = async (source: 'camera' | 'gallery') => {
    try {
      setMode('loading');
      setLoadingLabel('Loading image...');

      // Capture only — no OCR yet (OCR runs after the user selects a crop region)
      const result = await OCRService.captureImage(source);

      if (!result) { setMode('initial'); return; }

      // Get image dimensions
      await new Promise<void>((resolve) => {
        Image.getSize(result.imageUri, (w, h) => {
          setImageDims({ w, h });
          resolve();
        }, () => resolve());
      });

      setFromMenu(true);
      setImageUri(result.imageUri);
      // Default selection: centre 60% of image
      setSel({ x: SCREEN_WIDTH * 0.1, y: 80, w: SCREEN_WIDTH * 0.8, h: 200 });
      setMode('crop');
    } catch (error: any) {
      log.error('OCRCaptureScreen', 'Capture for crop error', error);
      Alert.alert('Error', 'Could not load the image. Please try again.');
      setMode('initial');
    }
  };

  // ─── Crop and extract ────────────────────────────────────────────────────

  const cropAndExtract = async () => {
    if (!imageUri) return;
    setMode('loading');
    setLoadingLabel('Extracting recipe...');

    try {
      const container = cropContainerRef.current;
      if (container.w === 0) {
        // Fallback — no container measured yet, just use full image
        setMode('result');
        return;
      }

      // Convert px selection → proportional coords within displayed image
      const ratioX = sel.x / container.w;
      const ratioY = sel.y / container.h;
      const ratioW = sel.w / container.w;
      const ratioH = sel.h / container.h;

      // Scale to actual image pixel dimensions
      const cropX = Math.max(0, Math.round(ratioX * imageDims.w));
      const cropY = Math.max(0, Math.round(ratioY * imageDims.h));
      const cropW = Math.min(imageDims.w - cropX, Math.round(ratioW * imageDims.w));
      const cropH = Math.min(imageDims.h - cropY, Math.round(ratioH * imageDims.h));

      const cropped = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      setImageUri(cropped.uri);

      // Run OCR on the cropped region via the edge function
      const text = await OCRService.extractTextFromImage(cropped.uri);

      setExtractedText(text);
      setMode('result');
    } catch (error: any) {
      log.error('OCRCaptureScreen', 'Crop extract error', error);
      // If crop fails, proceed with original full image
      setMode('result');
    }
  };

  // ─── Format & save ───────────────────────────────────────────────────────

  const handleFormatAndSave = async () => {
    if (!extractedText) return;

    if (imageUri) {
      try {
        setVisionLoading(true);
        const analysisResult = await AIRecipeFormatter.analyzeRecipeImage(imageUri, 'cocktail');
        nav.navigate('AIRecipeFormat', {
          recipe: {
            id: `vision-${Date.now()}`,
            title: analysisResult.title,
            sourceUrl: null,
            imageUrl: imageUri,
            extractedText: `Vision Analysis: ${analysisResult.description}`,
            userNotes: 'Recipe scanned from image',
            fromMenu,
            createdAt: new Date(),
            visionAnalysis: analysisResult,
          },
        });
      } catch (error: any) {
        log.warn('OCRCaptureScreen', 'Vision failed, falling back to text', error);
        nav.navigate('AIRecipeFormat', {
          recipe: {
            id: `ocr-${Date.now()}`,
            title: 'Scanned Recipe',
            sourceUrl: null,
            imageUrl: imageUri,
            extractedText,
            userNotes: 'Recipe extracted from image',
            fromMenu,
            createdAt: new Date(),
          },
        });
      } finally {
        setVisionLoading(false);
      }
    } else {
      nav.navigate('AIRecipeFormat', {
        recipe: {
          id: `ocr-${Date.now()}`,
          title: 'Scanned Recipe',
          sourceUrl: null,
          imageUrl: null,
          extractedText,
          userNotes: 'Recipe extracted from image',
          fromMenu,
          createdAt: new Date(),
        },
      });
    }
  };

  // ─── Crop PanResponder helpers ───────────────────────────────────────────

  // We use four corner handles + a drag-whole-box handle
  const makeDragResponder = useCallback((
    onMove: (dx: number, dy: number) => void
  ) => {
    const start = { x: 0, y: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gs) => {
        start.x = gs.x0;
        start.y = gs.y0;
      },
      onPanResponderMove: (_, gs) => {
        onMove(gs.dx, gs.dy);
      },
    });
  }, []);

  const boxPan = useRef(makeDragResponder((dx, dy) => {
    const c = cropContainerRef.current;
    setSel(prev => ({
      ...prev,
      x: Math.max(0, Math.min(c.w - prev.w, prev.x + dx)),
      y: Math.max(0, Math.min(c.h - prev.h, prev.y + dy)),
    }));
  })).current;

  // Corner handles
  const makeCornerPan = (corner: 'tl' | 'tr' | 'bl' | 'br') => {
    let last = { dx: 0, dy: 0 };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { last = { dx: 0, dy: 0 }; },
      onPanResponderMove: (_, gs) => {
        const ddx = gs.dx - last.dx;
        const ddy = gs.dy - last.dy;
        last = { dx: gs.dx, dy: gs.dy };
        const c = cropContainerRef.current;
        setSel(prev => {
          let { x, y, w, h } = prev;
          if (corner === 'tl') { x += ddx; y += ddy; w -= ddx; h -= ddy; }
          if (corner === 'tr') { y += ddy; w += ddx; h -= ddy; }
          if (corner === 'bl') { x += ddx; w -= ddx; h += ddy; }
          if (corner === 'br') { w += ddx; h += ddy; }
          // Clamp
          w = Math.max(MIN_SIZE, w); h = Math.max(MIN_SIZE, h);
          x = Math.max(0, Math.min(c.w - w, x));
          y = Math.max(0, Math.min(c.h - h, y));
          return { x, y, w, h };
        });
      },
    });
  };

  const tlPan = useRef(makeCornerPan('tl')).current;
  const trPan = useRef(makeCornerPan('tr')).current;
  const blPan = useRef(makeCornerPan('bl')).current;
  const brPan = useRef(makeCornerPan('br')).current;

  // ─── Render ──────────────────────────────────────────────────────────────

  if (mode === 'loading') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconWrap}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
          <Text style={styles.loadingTitle}>{loadingLabel}</Text>
          <Text style={styles.loadingSubtitle}>This takes a moment</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'crop' && imageUri) {
    // Image fills width, height is proportional
    const displayW = SCREEN_WIDTH;
    const displayH = Math.round((imageDims.h / imageDims.w) * displayW);
    const containerH = Math.min(displayH, SCREEN_HEIGHT * 0.58);

    return (
      <View style={styles.cropScreen}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View style={[styles.cropHeader, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => setMode('initial')} style={styles.cropHeaderBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.cropHeaderTitle}>Select Recipe</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Instruction */}
        <View style={styles.cropInstructionWrap}>
          <Text style={styles.cropInstruction}>
            Drag the box over the recipe you want to extract
          </Text>
        </View>

        {/* Image + selection overlay */}
        <View
          style={[styles.cropImageContainer, { height: containerH }]}
          onLayout={e => {
            const { width, height } = e.nativeEvent.layout;
            cropContainerRef.current = { x: 0, y: 0, w: width, h: height };
            // Centre the initial selection
            const sw = width * 0.75;
            const sh = height * 0.4;
            setSel({ x: (width - sw) / 2, y: (height - sh) / 2, w: sw, h: sh });
          }}
        >
          <Image
            source={{ uri: imageUri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="contain"
          />

          {/* Dark overlay — four quadrants around selection */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Top */}
            <View style={[styles.overlay, { top: 0, left: 0, right: 0, height: sel.y }]} />
            {/* Bottom */}
            <View style={[styles.overlay, {
              top: sel.y + sel.h,
              left: 0, right: 0,
              bottom: 0,
            }]} />
            {/* Left */}
            <View style={[styles.overlay, {
              top: sel.y, left: 0,
              width: sel.x, height: sel.h,
            }]} />
            {/* Right */}
            <View style={[styles.overlay, {
              top: sel.y, left: sel.x + sel.w,
              right: 0, height: sel.h,
            }]} />
          </View>

          {/* Selection border */}
          <View
            style={[styles.selectionBorder, {
              left: sel.x, top: sel.y,
              width: sel.w, height: sel.h,
            }]}
            pointerEvents="box-none"
          >
            {/* Drag whole box */}
            <View
              style={styles.selectionDragArea}
              {...boxPan.panHandlers}
            />

            {/* Corner handles */}
            <View style={[styles.handle, styles.handleTL]} {...tlPan.panHandlers} />
            <View style={[styles.handle, styles.handleTR]} {...trPan.panHandlers} />
            <View style={[styles.handle, styles.handleBL]} {...blPan.panHandlers} />
            <View style={[styles.handle, styles.handleBR]} {...brPan.panHandlers} />

            {/* Rule-of-thirds guides */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={[styles.gridLine, styles.gridV1]} />
              <View style={[styles.gridLine, styles.gridV2]} />
              <View style={[styles.gridLine, styles.gridH1]} />
              <View style={[styles.gridLine, styles.gridH2]} />
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.cropActions, { paddingBottom: insets.bottom + spacing(2) }]}>
          <TouchableOpacity style={styles.cropExtractBtn} onPress={cropAndExtract} activeOpacity={0.85}>
            <Ionicons name="scan" size={20} color={colors.goldText} />
            <Text style={styles.cropExtractText}>Extract This Recipe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cropSkipBtn} onPress={() => {
            // Skip crop — use full image
            setMode('loading');
            setLoadingLabel('Reading recipe...');
            cropAndExtract();
          }}>
            <Text style={styles.cropSkipText}>Use full image</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mode === 'result' && extractedText) {
    const spec = parseSpec(extractedText);
    const hasContent = spec.lines.length > 0;

    // Heuristic: if the raw text has many lines (menu page) but we're not in crop mode,
    // the user probably scanned a full menu and only wants one drink.
    const rawLineCount = extractedText.split('\n').filter(l => l.trim()).length;
    const looksLikeMenuPage = !fromMenu && rawLineCount >= 6;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.resultScroll}
          contentContainerStyle={styles.resultContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero image ── */}
          {imageUri ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(26,18,13,0.65)', colors.bg]}
                locations={[0, 0.55, 1]}
                style={styles.imageFade}
              />
            </View>
          ) : (
            <View style={styles.noImageSpacer} />
          )}

          {/* ── Spec card ── */}
          <View style={[styles.specCard, imageUri ? styles.specCardOverlap : null]}>
            {/* Eyebrow */}
            <View style={styles.specEyebrow}>
              <Ionicons name="scan-outline" size={11} color={colors.gold} />
              <Text style={styles.specEyebrowText}>
                {fromMenu ? 'ISOLATED FROM MENU' : 'SCANNED RECIPE'}
              </Text>
            </View>

            {/* Title */}
            {spec.title ? (
              <Text style={styles.specTitle}>{spec.title}</Text>
            ) : (
              <Text style={styles.specTitlePlaceholder}>Recipe Detected</Text>
            )}

            {/* Divider */}
            <View style={styles.specRule} />

            {/* Content lines */}
            {hasContent ? (
              <View style={styles.specLines}>
                {spec.lines.map((line, i) => (
                  <View key={i} style={styles.specLine}>
                    <View style={styles.specBullet} />
                    <Text style={styles.specLineText}>{line}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.specFallback}>{extractedText}</Text>
            )}

            {/* AI hint */}
            <View style={styles.specHintRow}>
              <Ionicons name="sparkles-outline" size={12} color={colors.subtext} />
              <Text style={styles.specHintText}>
                AI will structure and complete this into a full recipe card
              </Text>
            </View>
          </View>

          {/* ── Menu page nudge ── */}
          {looksLikeMenuPage && imageUri && (
            <TouchableOpacity
              style={styles.menuNudge}
              onPress={() => {
                // Re-enter crop mode with the same image
                Image.getSize(imageUri, (w, h) => setImageDims({ w, h }), () => {});
                setSel({ x: SCREEN_WIDTH * 0.1, y: 80, w: SCREEN_WIDTH * 0.8, h: 200 });
                setFromMenu(true);
                setMode('crop');
              }}
              activeOpacity={0.82}
            >
              <Ionicons name="crop-outline" size={15} color={colors.gold} />
              <View style={styles.menuNudgeText}>
                <Text style={styles.menuNudgePrimary}>Scanning a menu?</Text>
                <Text style={styles.menuNudgeSecondary}>Tap to crop and isolate a single drink</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color={colors.gold} />
            </TouchableOpacity>
          )}

          {/* ── Actions ── */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={[styles.primaryButton, visionLoading && styles.buttonDisabled]}
              onPress={handleFormatAndSave}
              disabled={visionLoading}
              activeOpacity={0.82}
            >
              {visionLoading
                ? <ActivityIndicator size="small" color={colors.goldText} />
                : <Ionicons name="sparkles" size={18} color={colors.goldText} />
              }
              <Text style={styles.primaryButtonText}>
                {visionLoading ? 'Formatting...' : 'Format & Save to My Recipes'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={() => {
              setExtractedText(null);
              setImageUri(null);
              setMode('initial');
            }} activeOpacity={0.75}>
              <Ionicons name="camera-outline" size={18} color={colors.gold} />
              <Text style={styles.secondaryButtonText}>Scan Another</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => nav.goBack()} style={styles.ghostButton}>
              <Text style={styles.ghostButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Initial state ────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.initialContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroIconRing}>
            <Ionicons name="document-text" size={32} color={colors.gold} />
          </View>
          <Text style={styles.heroTitle}>Scan a Recipe</Text>
          <Text style={styles.heroSubtitle}>
            Point at a recipe card, spec sheet, or bar menu. We'll extract and format it automatically.
          </Text>
        </View>

        <View style={styles.tipsCard}>
          {[
            { icon: 'sunny-outline', text: 'Good lighting — avoid shadows on the text' },
            { icon: 'scan-outline', text: 'Fill the frame with the recipe' },
            { icon: 'hand-left-outline', text: 'Hold steady — blur kills accuracy' },
          ].map((tip, i) => (
            <View key={i} style={[styles.tipRow, i < 2 && styles.tipRowBorder]}>
              <Ionicons name={tip.icon as any} size={16} color={colors.gold} />
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </View>

        {/* Standard scan */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => captureAndExtract('camera')} activeOpacity={0.82}>
            <Ionicons name="camera" size={20} color={colors.goldText} />
            <Text style={styles.primaryButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => captureAndExtract('gallery')} activeOpacity={0.75}>
            <Ionicons name="images-outline" size={18} color={colors.gold} />
            <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Menu isolation option */}
        <View style={styles.menuSection}>
          <View style={styles.menuDivider}>
            <View style={styles.menuDividerLine} />
            <Text style={styles.menuDividerText}>Scanning a menu?</Text>
            <View style={styles.menuDividerLine} />
          </View>

          <TouchableOpacity style={styles.menuIsolateBtn} onPress={() => captureForCrop('camera')} activeOpacity={0.82}>
            <View style={styles.menuIsolateIcon}>
              <Ionicons name="crop" size={18} color={colors.gold} />
            </View>
            <View style={styles.menuIsolateText}>
              <Text style={styles.menuIsolatePrimary}>Isolate from Menu</Text>
              <Text style={styles.menuIsolateSecondary}>Crop to one recipe before extracting</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuIsolateBtn} onPress={() => captureForCrop('gallery')} activeOpacity={0.82}>
            <View style={styles.menuIsolateIcon}>
              <Ionicons name="images-outline" size={18} color={colors.gold} />
            </View>
            <View style={styles.menuIsolateText}>
              <Text style={styles.menuIsolatePrimary}>Pick from Gallery & Crop</Text>
              <Text style={styles.menuIsolateSecondary}>Select and isolate one recipe</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const HANDLE_SIZE = 22;
const HANDLE_HIT = 36;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing(4) },
  loadingIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: `${colors.gold}18`,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing(3),
  },
  loadingTitle: { fontFamily: serif, fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing(1) },
  loadingSubtitle: { fontSize: 14, color: colors.subtext },

  // Initial
  initialContent: { flexGrow: 1, paddingHorizontal: spacing(3), paddingTop: spacing(4), paddingBottom: spacing(6) },
  heroSection: { alignItems: 'center', marginBottom: spacing(4) },
  heroIconRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${colors.gold}15`, borderWidth: 1, borderColor: `${colors.gold}30`,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing(2.5),
  },
  heroTitle: { fontFamily: serif, fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: spacing(1), textAlign: 'center' },
  heroSubtitle: { fontSize: 15, color: colors.subtext, textAlign: 'center', lineHeight: 22, maxWidth: 300 },
  tipsCard: {
    backgroundColor: colors.card, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.line, marginBottom: spacing(4), overflow: 'hidden',
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), paddingHorizontal: spacing(2.5), paddingVertical: spacing(1.75) },
  tipRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  tipText: { fontSize: 14, color: colors.subtext },
  buttonGroup: { gap: spacing(2) },

  // Menu isolation
  menuSection: { marginTop: spacing(4) },
  menuDivider: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.5), marginBottom: spacing(2.5) },
  menuDividerLine: { flex: 1, height: 1, backgroundColor: colors.line },
  menuDividerText: { fontSize: 12, color: colors.subtext, fontWeight: '600' },
  menuIsolateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing(2),
    backgroundColor: colors.card, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.line,
    paddingHorizontal: spacing(2.5), paddingVertical: spacing(2),
    marginBottom: spacing(1.5),
  },
  menuIsolateIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: `${colors.gold}15`, borderWidth: 1, borderColor: `${colors.gold}25`,
    alignItems: 'center', justifyContent: 'center',
  },
  menuIsolateText: { flex: 1 },
  menuIsolatePrimary: { fontSize: 15, fontWeight: '600', color: colors.text },
  menuIsolateSecondary: { fontSize: 12, color: colors.subtext, marginTop: 2 },

  // Crop screen
  cropScreen: { flex: 1, backgroundColor: '#0A0704' },
  cropHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing(2), paddingBottom: spacing(1),
  },
  cropHeaderBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  cropHeaderTitle: { fontFamily: serif, fontSize: 17, fontWeight: '700', color: colors.text },
  cropInstructionWrap: { paddingHorizontal: spacing(3), paddingBottom: spacing(2) },
  cropInstruction: { fontSize: 13, color: colors.subtext, textAlign: 'center' },
  cropImageContainer: { width: SCREEN_WIDTH, overflow: 'hidden' },
  overlay: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.62)' },
  selectionBorder: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  selectionDragArea: {
    position: 'absolute',
    top: HANDLE_SIZE / 2,
    left: HANDLE_SIZE / 2,
    right: HANDLE_SIZE / 2,
    bottom: HANDLE_SIZE / 2,
  },
  handle: {
    position: 'absolute',
    width: HANDLE_HIT, height: HANDLE_HIT,
    alignItems: 'center', justifyContent: 'center',
  },
  handleTL: { top: -HANDLE_HIT / 2, left: -HANDLE_HIT / 2 },
  handleTR: { top: -HANDLE_HIT / 2, right: -HANDLE_HIT / 2 },
  handleBL: { bottom: -HANDLE_HIT / 2, left: -HANDLE_HIT / 2 },
  handleBR: { bottom: -HANDLE_HIT / 2, right: -HANDLE_HIT / 2 },
  // Visual handle nub rendered via border
  gridLine: { position: 'absolute', backgroundColor: 'rgba(214,138,56,0.25)' },
  gridV1: { left: '33.3%', top: 0, bottom: 0, width: 1 },
  gridV2: { left: '66.6%', top: 0, bottom: 0, width: 1 },
  gridH1: { top: '33.3%', left: 0, right: 0, height: 1 },
  gridH2: { top: '66.6%', left: 0, right: 0, height: 1 },
  cropActions: {
    flex: 1, justifyContent: 'flex-end',
    paddingHorizontal: spacing(3), paddingTop: spacing(3), gap: spacing(1.5),
  },
  cropExtractBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.gold, borderRadius: radii.pill,
    paddingVertical: spacing(2), gap: spacing(1.25),
  },
  cropExtractText: { fontSize: 16, fontWeight: '700', color: colors.goldText },
  cropSkipBtn: { alignItems: 'center', paddingVertical: spacing(1) },
  cropSkipText: { fontSize: 14, color: colors.subtext },

  // Result
  resultScroll: { flex: 1 },
  resultContent: { paddingBottom: spacing(6) },
  imageWrap: { height: 240, position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  imageFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 },
  noImageSpacer: { height: spacing(4) },

  // Spec card
  specCard: {
    marginHorizontal: spacing(3),
    marginBottom: spacing(2),
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.18)',
    padding: spacing(3),
  },
  specCardOverlap: {
    marginTop: -28,
  },
  specEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    marginBottom: spacing(1.25),
  },
  specEyebrowText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: colors.gold,
    textTransform: 'uppercase',
  },
  specTitle: {
    fontFamily: serif,
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 30,
    marginBottom: spacing(2),
  },
  specTitlePlaceholder: {
    fontFamily: serif,
    fontSize: 22,
    color: colors.subtext,
    fontStyle: 'italic',
    marginBottom: spacing(2),
  },
  specRule: {
    height: 1,
    backgroundColor: 'rgba(214,138,56,0.22)',
    marginBottom: spacing(2),
  },
  specLines: {
    gap: spacing(1.25),
    marginBottom: spacing(2),
  },
  specLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(1.25),
  },
  specBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.gold,
    marginTop: 7,
    flexShrink: 0,
  },
  specLineText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  specFallback: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing(2),
  },
  specHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    paddingTop: spacing(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  specHintText: {
    fontSize: 12,
    color: colors.subtext,
    flex: 1,
    lineHeight: 17,
  },

  // Menu nudge banner
  menuNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    marginHorizontal: spacing(3),
    marginBottom: spacing(2),
    backgroundColor: `${colors.gold}0E`,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: `${colors.gold}28`,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.75),
  },
  menuNudgeText: { flex: 1 },
  menuNudgePrimary: { fontSize: 14, fontWeight: '700', color: colors.gold },
  menuNudgeSecondary: { fontSize: 12, color: colors.subtext, marginTop: 1 },

  // Extra bottom padding so the TrialBanner (position:absolute, bottom:92, h:44)
  // never overlaps the action buttons and intercepts their taps.
  actionsSection: { paddingHorizontal: spacing(3), gap: spacing(2), paddingBottom: spacing(9) },

  // Shared buttons
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.gold, borderRadius: radii.pill,
    paddingVertical: spacing(2), paddingHorizontal: spacing(3), gap: spacing(1.25),
  },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: colors.goldText },
  secondaryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent', borderRadius: radii.pill,
    borderWidth: 1.5, borderColor: colors.gold,
    paddingVertical: spacing(2), paddingHorizontal: spacing(3), gap: spacing(1.25),
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: colors.gold },
  ghostButton: { alignItems: 'center', paddingVertical: spacing(1.5) },
  ghostButtonText: { fontSize: 15, color: colors.subtext, fontWeight: '500' },
  buttonDisabled: { opacity: 0.6 },
});
