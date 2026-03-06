import type { ImageSourcePropType } from 'react-native';

const DEFAULT_VAULT_IMAGE = require('../../assets/images/vault/variations/headers/Smoked Old Fashioned.png');

const VARIATION_HEADERS: Record<string, ImageSourcePropType> = {
  var_smoked_old_fashioned: require('../../assets/images/vault/variations/headers/Smoked Old Fashioned.png'),
  var_spicy_margarita: require('../../assets/images/vault/variations/headers/Spicy Margarita.png'),
  var_brown_butter_old_fashioned: require('../../assets/images/vault/variations/headers/Brown Butter Old Fashioned.png'),
  var_clarified_whiskey_sour: require('../../assets/images/vault/variations/headers/Clarified Whiskey Sour.png'),
  var_nitro_espresso_martini: require('../../assets/images/vault/variations/headers/Nitro Espresso Martini.png'),
  var_oleo_saccharum_daiquiri: require('../../assets/images/vault/variations/headers/Oleo Saccharum Daiquiri.png'),
  var_split_base_negroni: require('../../assets/images/vault/variations/headers/Split-Base Negroni.png'),
  var_aged_manhattan: require('../../assets/images/vault/variations/headers/Barrel-Aged Manhattan.png'),
  var_fermented_pineapple_margarita: require('../../assets/images/vault/variations/headers/Fermented Pineapple Margarita.png'),
  var_winter_spiced_negroni: require('../../assets/images/vault/variations/headers/Winter Spiced Negroni.png'),
  var_summer_berry_daiquiri: require('../../assets/images/vault/variations/headers/Summer Berry Daiquiri.png'),
};

const SEASONAL_HEADERS: Record<string, ImageSourcePropType> = {
  drop_winter_2025: require('../../assets/images/vault/seasonal/headers/drop_winter_2025-header.png'),
  drop_summer_2025: require('../../assets/images/vault/seasonal/headers/drop_summer_2025-header.png'),
  drop_spring_2025: require('../../assets/images/vault/seasonal/headers/drop_spring_2025-header.png'),
};

const PLAYBOOK_IMAGES: Record<string, ImageSourcePropType> = {
  playbook_ice_strategy_basics: require('../../assets/images/vault/playbooks/Ice Strategy Fundamentals.png'),
  playbook_ice_party_planning: require('../../assets/images/vault/playbooks/Party Ice Planning System.png'),
  playbook_acid_control_basics: require('../../assets/images/vault/playbooks/Acid Control Fundamentals.png'),
  playbook_acid_rebalancing: require('../../assets/images/vault/playbooks/Advanced Acid Rebalancing.png'),
  playbook_batch_math_basics: require('../../assets/images/vault/playbooks/Batch Math Fundamentals.png'),
  playbook_batch_math_advanced: require('../../assets/images/vault/playbooks/Advanced Batch Systems.png'),
  playbook_speed_mise_en_place: require('../../assets/images/vault/playbooks/Speed Mise En Place.png'),
  playbook_speed_build_order: require('../../assets/images/vault/playbooks/Build Order Systems.png'),
};

export function getVaultVariationThumbnail(id: string): ImageSourcePropType {
  return VARIATION_HEADERS[id] || DEFAULT_VAULT_IMAGE;
}

export function getVaultVariationHeader(id: string): ImageSourcePropType {
  return VARIATION_HEADERS[id] || DEFAULT_VAULT_IMAGE;
}

export function getVaultSeasonalThumbnail(id: string): ImageSourcePropType {
  return SEASONAL_HEADERS[id] || DEFAULT_VAULT_IMAGE;
}

export function getVaultSeasonalHeader(id: string): ImageSourcePropType {
  return SEASONAL_HEADERS[id] || DEFAULT_VAULT_IMAGE;
}

export function getVaultPlaybookThumbnail(id: string): ImageSourcePropType {
  return PLAYBOOK_IMAGES[id] || DEFAULT_VAULT_IMAGE;
}

export function getVaultPlaybookHeader(id: string): ImageSourcePropType {
  return PLAYBOOK_IMAGES[id] || DEFAULT_VAULT_IMAGE;
}
