import type { UserTier } from '../store/useUserTier';

export interface ScannerTierAccess {
  tierLabel: string;
  scannerStack: string;
  supportsBarcode: boolean;
  supportsAiPhotoScan: boolean;
  supportsMultiIngredientDetection: boolean;
  notes: string;
}

export function getScannerTierAccess(tier: UserTier, hasPrestige: boolean = false): ScannerTierAccess {
  if (tier === 'FREE') {
    return {
      tierLabel: 'FREE',
      scannerStack: 'Barcode + AI Smart Scan',
      supportsBarcode: true,
      supportsAiPhotoScan: true,
      supportsMultiIngredientDetection: true,
      notes: 'Full scanner stack enabled. Monetization gate is inventory capacity, not scan access.',
    };
  }

  if (tier === 'PLUS') {
    return {
      tierLabel: 'PLUS',
      scannerStack: 'Barcode + AI Smart Scan',
      supportsBarcode: true,
      supportsAiPhotoScan: true,
      supportsMultiIngredientDetection: true,
      notes: 'AI label/bottle/ingredient photo analysis enabled.',
    };
  }

  return {
    tierLabel: hasPrestige ? 'PRO (Prestige)' : 'PRO',
    scannerStack: 'Barcode + AI Smart Scan',
    supportsBarcode: true,
    supportsAiPhotoScan: true,
    supportsMultiIngredientDetection: true,
    notes: hasPrestige
      ? 'Same scanner stack as PRO, with prestige entitlement active.'
      : 'Same scanner stack as PLUS, with PRO-level recommendation intelligence.',
  };
}
