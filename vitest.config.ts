import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  define: {
    __DEV__: true,
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      // Phase 0.9 guardrail: "Vitest coverage requirement scoped to the
      // money paths only (tierAccess, SubscriptionContext entitlement
      // mapping, makeLogService)" — deliberately narrow, not repo-wide.
      // SubscriptionContext's entitlement-mapping logic lives in
      // src/contexts/entitlementMapping.ts (extracted specifically so it's
      // testable without rendering the provider or mocking react-native).
      provider: 'v8',
      include: [
        'src/config/tierAccess.ts',
        'src/contexts/entitlementMapping.ts',
        'src/services/makeLogService.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 75,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
