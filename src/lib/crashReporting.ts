/**
 * CRASH REPORTING
 *
 * Thin wrapper around Sentry. Fully inert (does nothing) until
 * EXPO_PUBLIC_SENTRY_DSN is set — safe to ship as-is with no account yet.
 * Once a DSN is added to .env, crashes and logged errors start flowing
 * to Sentry automatically with zero other code changes needed.
 */
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const crashReportingEnabled = Boolean(DSN);

// @sentry/react-native pulls in the raw react-native package, which the
// vitest setup deliberately avoids transforming (see vitest.config.ts).
// Requiring it lazily, only when a DSN is actually configured, keeps it
// out of the module graph for tests and dev-without-DSN entirely.
function loadSentry() {
  return require('@sentry/react-native');
}

export function initCrashReporting() {
  if (!DSN) {
    return;
  }

  const Sentry = loadSentry();
  Sentry.init({
    dsn: DSN,
    debug: __DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enabled: !__DEV__, // avoid noisy dev-only errors polluting the dashboard
  });
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!crashReportingEnabled) return;
  const Sentry = loadSentry();
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
