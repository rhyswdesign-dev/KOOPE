/**
 * Want-list sync — the durable half of src/store/useWishlist.ts.
 *
 * AsyncStorage stays the source of truth: the want-list must work offline
 * and signed out, and no UI action ever waits on this file. Everything here
 * is a best-effort mirror into `want_list_items` (migration 035), written
 * alongside each local mutation and pulled-and-merged once on sign-in.
 *
 * Consent-gated and fire-and-forget, matching scanContextService and
 * recipeSignalService exactly: never throws, never blocks, and degrades to a
 * logged warning if the migration has not been applied yet.
 *
 * Price sightings are deliberately NOT mirrored here — they already have a
 * single write path (spottedPriceService -> spotted_prices, migration 031)
 * that every price capture point in the app calls. A want-list row and its
 * price sightings join on (user_id, bottle_id).
 */
import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';
import { getConsentChoices } from '../lib/consentStore';
import type { WishlistItem } from '../store/useWishlist';

/** The server row shape, minus the columns the client never writes. */
export interface RemoteWantListItem {
  bottleId: string;
  name: string;
  brand: string;
  type: string;
  imageUri?: string;
  dateSaved: string;
}

async function resolveUserId(explicit?: string | null): Promise<string | null> {
  if (explicit) return explicit;
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function hasAnalyticsConsent(): Promise<boolean> {
  try {
    const choices = await getConsentChoices();
    return choices.analytics === true;
  } catch (error) {
    log.warn('wantListService', 'Failed to read consent choices', { error });
    return false;
  }
}

/**
 * Mirror one saved want-list item to the server. Upsert, not insert — the
 * table has a UNIQUE (user_id, bottle_id) constraint, so re-saving a bottle
 * or a repeated sync is idempotent rather than an error.
 */
export async function syncWantListItemSaved(
  item: Pick<WishlistItem, 'bottleId' | 'name' | 'brand' | 'type' | 'imageUri' | 'dateSaved'>,
  userId?: string | null,
): Promise<boolean> {
  const resolvedUserId = await resolveUserId(userId);
  if (!resolvedUserId) return false;
  if (!(await hasAnalyticsConsent())) return false;

  try {
    const { error } = await supabase.from('want_list_items').upsert(
      {
        user_id: resolvedUserId,
        bottle_id: item.bottleId,
        name: item.name,
        brand: item.brand || null,
        type: item.type || null,
        image_uri: item.imageUri ?? null,
        date_saved: item.dateSaved,
      },
      { onConflict: 'user_id,bottle_id' },
    );

    if (error) {
      log.warn('wantListService', 'Failed to upsert want_list_items row (migration 035 applied?)', {
        error,
        bottleId: item.bottleId,
      });
      return false;
    }
    return true;
  } catch (error) {
    log.error('wantListService', 'want_list_items upsert threw', error as Error, {
      bottleId: item.bottleId,
    });
    return false;
  }
}

/** Mirror a want-list removal. Same best-effort contract as the save path. */
export async function syncWantListItemRemoved(
  bottleId: string,
  userId?: string | null,
): Promise<boolean> {
  const resolvedUserId = await resolveUserId(userId);
  if (!resolvedUserId) return false;
  if (!(await hasAnalyticsConsent())) return false;

  try {
    const { error } = await supabase
      .from('want_list_items')
      .delete()
      .eq('user_id', resolvedUserId)
      .eq('bottle_id', bottleId);

    if (error) {
      log.warn('wantListService', 'Failed to delete want_list_items row', { error, bottleId });
      return false;
    }
    return true;
  } catch (error) {
    log.error('wantListService', 'want_list_items delete threw', error as Error, { bottleId });
    return false;
  }
}

/**
 * The whole server-side want-list for a user, newest first. Returns an empty
 * array on any failure — a missing table must degrade to "nothing to merge,"
 * never to a thrown error or a wiped local list.
 */
export async function fetchWantList(userId?: string | null): Promise<RemoteWantListItem[]> {
  const resolvedUserId = await resolveUserId(userId);
  if (!resolvedUserId) return [];

  try {
    const { data, error } = await supabase
      .from('want_list_items')
      .select('bottle_id, name, brand, type, image_uri, date_saved')
      .eq('user_id', resolvedUserId)
      .order('date_saved', { ascending: false });

    if (error || !data) {
      log.warn('wantListService', 'Failed to read want_list_items', { error });
      return [];
    }

    return data.map((row: any) => ({
      bottleId: row.bottle_id as string,
      name: row.name as string,
      brand: (row.brand ?? '') as string,
      type: (row.type ?? 'spirit') as string,
      imageUri: (row.image_uri ?? undefined) as string | undefined,
      dateSaved: row.date_saved as string,
    }));
  } catch (error) {
    log.error('wantListService', 'want_list_items read threw', error as Error);
    return [];
  }
}
