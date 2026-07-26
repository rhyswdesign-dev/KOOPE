/**
 * Parses a price typed on a `decimal-pad` keyboard, which shows a comma
 * instead of a period as the decimal separator on comma-decimal locales
 * (most of continental Europe). A plain `parseFloat` or a digits-only
 * regex silently mangles "12,50" into 12 or 1250 on those devices.
 *
 * Comma with no period → comma is the decimal separator ("12,50" → 12.5).
 * Comma alongside a period → comma is a thousands separator ("1,234.56").
 */
export function parseLocalePrice(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return NaN;

  const hasComma = trimmed.includes(',');
  const hasDot = trimmed.includes('.');

  const normalized = hasComma && !hasDot ? trimmed.replace(',', '.') : trimmed.replace(/,/g, '');

  return parseFloat(normalized.replace(/[^0-9.]/g, ''));
}
