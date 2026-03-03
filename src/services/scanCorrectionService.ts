/**
 * Scan Correction Service — Weighted Voting Anti-Fraud System
 * Prevents database poisoning from malicious or accidental scan corrections.
 *
 * How it works:
 * - Each user has an accuracy score (starts at 0.5, max 1.0)
 * - Every correction vote is weighted by the user's accuracy score
 * - The bottle with the highest weighted vote sum wins for that barcode
 * - Wrong corrections reduce accuracy (making future votes count less)
 * - Correct corrections increase accuracy (trusted users get more influence)
 * - Users below 0.15 accuracy are flagged for moderation
 * - Trusted users (>0.7) can auto-approve new bottle submissions
 *
 * (Update 3 from KŌOPE strategy addendum)
 */

import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';

export const TRUST_THRESHOLD = 0.7;   // Above this: auto-approve new bottles
export const FLAG_THRESHOLD = 0.15;   // Below this: flagged for review

/**
 * Get a user's current accuracy score.
 * Returns 0.5 (neutral) for new users or on error.
 */
export async function getUserAccuracyScore(userId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('user_correction_stats')
      .select('accuracy_score')
      .eq('user_id', userId)
      .single();

    if (error || !data) return 0.5;
    return Number(data.accuracy_score);
  } catch {
    return 0.5;
  }
}

/**
 * Submit a weighted correction vote.
 * Records that this user believes `correctBottleId` is the right match for `barcode`.
 * Vote weight = user's accuracy score (0.001–1.0).
 */
export async function submitWeightedCorrection(params: {
  userId: string;
  barcode: string;
  correctBottleId: string | null;
  newBottleData?: Record<string, unknown>;
}): Promise<void> {
  const { userId, barcode, correctBottleId, newBottleData } = params;

  try {
    if (correctBottleId) {
      // Vote for an existing bottle
      const { error } = await supabase.rpc('submit_weighted_correction', {
        p_user_id: userId,
        p_barcode: barcode,
        p_correct_bottle_id: correctBottleId,
      });

      if (error) {
        log.error('ScanCorrectionService', 'RPC submit_weighted_correction failed', error);
      }
    } else if (newBottleData) {
      // New bottle submission — route through moderation if low trust
      await submitNewBottle(newBottleData, userId, barcode);
    }
  } catch (err) {
    log.error('ScanCorrectionService', 'submitWeightedCorrection failed', err);
  }
}

/**
 * Get the current winning bottle for a barcode (highest vote_count).
 * Returns null if no votes exist yet.
 */
export async function getWinnerForBarcode(barcode: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('get_barcode_winner', {
      p_barcode: barcode,
    });

    if (error || !data) return null;
    return data as string;
  } catch {
    return null;
  }
}

/**
 * Submit a new bottle to the database.
 * - Trusted users (accuracy > 0.7): auto-approved immediately
 * - New/low-accuracy users: goes to moderation queue
 *
 * Returns 'added' if auto-approved, 'queued' if sent to moderation.
 */
export async function submitNewBottle(
  bottleData: Record<string, unknown>,
  userId: string,
  barcode?: string
): Promise<'added' | 'queued'> {
  try {
    const accuracy = await getUserAccuracyScore(userId);

    if (accuracy >= TRUST_THRESHOLD) {
      // Trusted user — auto-approve and add directly to bottles table
      const { error } = await supabase.from('bottles').insert({
        ...bottleData,
        upc: barcode ?? null,
        source: 'user_submitted',
        verified: true,
        submitted_by: userId,
      });

      if (error) {
        log.error('ScanCorrectionService', 'Auto-approve bottle insert failed', error);
        return 'queued';
      }

      // Update user accuracy positively (auto-approved = trusted action)
      await supabase.rpc('update_user_correction_accuracy', {
        p_user_id: userId,
        p_was_correct: true,
      });

      return 'added';
    } else {
      // Lower accuracy — send to moderation queue
      const { error } = await supabase.from('scan_moderation_queue').insert({
        user_id: userId,
        barcode: barcode ?? null,
        bottle_data: bottleData,
        user_accuracy_score: accuracy,
        status: 'pending',
      });

      if (error) {
        log.error('ScanCorrectionService', 'Moderation queue insert failed', error);
      }

      return 'queued';
    }
  } catch (err) {
    log.error('ScanCorrectionService', 'submitNewBottle failed', err);
    return 'queued';
  }
}

/**
 * Called after peer validation confirms or denies a user's correction.
 * E.g. when 3 subsequent users scan the same barcode and confirm the correct bottle.
 */
export async function updateUserAccuracy(
  userId: string,
  wasCorrect: boolean
): Promise<void> {
  try {
    await supabase.rpc('update_user_correction_accuracy', {
      p_user_id: userId,
      p_was_correct: wasCorrect,
    });
  } catch (err) {
    log.error('ScanCorrectionService', 'updateUserAccuracy failed', err);
  }
}

/**
 * Check if a user is trusted (accuracy >= TRUST_THRESHOLD).
 * Trusted users get their corrections auto-applied and can submit new bottles directly.
 */
export async function isUserTrusted(userId: string): Promise<boolean> {
  const score = await getUserAccuracyScore(userId);
  return score >= TRUST_THRESHOLD;
}
