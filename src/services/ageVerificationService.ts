export const AGE_VERIFICATION_STORAGE_KEY = '@KOOPE:age_verification';
export const AGE_VERIFICATION_RULE_VERSION = '2026-03-17-v1';

export type SupportedCountryCode = 'US' | 'CA' | 'GB' | 'AU' | 'NZ' | 'IE' | 'FR' | 'IT' | 'ES' | 'MX' | 'BR' | 'JP';
export type SupportedSubdivisionCode =
  | 'AB'
  | 'MB'
  | 'QC'
  | 'ON'
  | 'BC'
  | 'SK'
  | 'NS'
  | 'NB'
  | 'NL'
  | 'PE'
  | 'NT'
  | 'YT'
  | 'NU';

export interface AgeVerificationPayload {
  dateOfBirth: string;
  country: SupportedCountryCode;
  subdivision?: SupportedSubdivisionCode;
  minimumAge: number;
  isOfLegalAge: boolean;
  verifiedAt: string;
  ruleVersion: string;
}

export const COUNTRY_OPTIONS: Array<{ code: SupportedCountryCode; label: string }> = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'FR', label: 'France' },
  { code: 'IT', label: 'Italy' },
  { code: 'ES', label: 'Spain' },
  { code: 'MX', label: 'Mexico' },
  { code: 'BR', label: 'Brazil' },
  { code: 'JP', label: 'Japan' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'IE', label: 'Ireland' },
];

export const CANADA_SUBDIVISION_OPTIONS: Array<{ code: SupportedSubdivisionCode; label: string; minimumAge: number }> = [
  { code: 'AB', label: 'Alberta', minimumAge: 18 },
  { code: 'MB', label: 'Manitoba', minimumAge: 18 },
  { code: 'QC', label: 'Quebec', minimumAge: 18 },
  { code: 'ON', label: 'Ontario', minimumAge: 19 },
  { code: 'BC', label: 'British Columbia', minimumAge: 19 },
  { code: 'SK', label: 'Saskatchewan', minimumAge: 19 },
  { code: 'NS', label: 'Nova Scotia', minimumAge: 19 },
  { code: 'NB', label: 'New Brunswick', minimumAge: 19 },
  { code: 'NL', label: 'Newfoundland and Labrador', minimumAge: 19 },
  { code: 'PE', label: 'Prince Edward Island', minimumAge: 19 },
  { code: 'NT', label: 'Northwest Territories', minimumAge: 19 },
  { code: 'YT', label: 'Yukon', minimumAge: 19 },
  { code: 'NU', label: 'Nunavut', minimumAge: 19 },
];

function calculateAge(dateOfBirth: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}

export function getMinimumLegalAge(country: SupportedCountryCode, subdivision?: SupportedSubdivisionCode): number | null {
  if (country === 'US') return 21;
  if (country === 'CA') {
    const province = CANADA_SUBDIVISION_OPTIONS.find((option) => option.code === subdivision);
    return province?.minimumAge ?? null;
  }
  if (country === 'JP') return 20;
  return 18;
}

export function evaluateAgeEligibility(params: {
  dateOfBirth: Date;
  country: SupportedCountryCode;
  subdivision?: SupportedSubdivisionCode;
}): AgeVerificationPayload {
  const minimumAge = getMinimumLegalAge(params.country, params.subdivision);
  if (!minimumAge) {
    throw new Error('Subdivision is required for this country.');
  }

  return {
    dateOfBirth: params.dateOfBirth.toISOString(),
    country: params.country,
    subdivision: params.subdivision,
    minimumAge,
    isOfLegalAge: calculateAge(params.dateOfBirth) >= minimumAge,
    verifiedAt: new Date().toISOString(),
    ruleVersion: AGE_VERIFICATION_RULE_VERSION,
  };
}
