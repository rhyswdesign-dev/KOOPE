/**
 * MadeItButton — shared "I made this" CTA.
 *
 * Phase 0.8 (Made It logging, the North Star sensor): first bite out of
 * the CocktailDetailScreen/RecipeDetailScreen god files per the
 * workplan's god-file rule — both screens' primary "I made this drink"
 * button now renders through this one component instead of duplicated
 * TouchableOpacity markup. Visual styling (colors, sizing) is passed in
 * by the caller via `style`/`textStyle` so each screen keeps its exact
 * existing look; this component owns only the made/not-made label
 * logic and the tap target.
 *
 * This does NOT own the actual logging side effect (calling
 * makeLogService.logMadeIt, awarding XP, opening a "how did you make
 * it" modal, etc.) — screens keep that in their existing handlers and
 * pass a plain onPress. Keeping the write path in the screen (not this
 * component) avoids forcing every future caller into one modal flow
 * before Phase 1's Answer Card/Tonight's Pick/Hosting call sites exist.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleProp, ViewStyle, TextStyle } from 'react-native';

export interface MadeItButtonProps {
  hasMadeIt: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  /** Label shown before the user has made it, e.g. "I made this drink" or "How did you make it?" */
  label: string;
  /** Label shown after hasMadeIt is true. Defaults to "You Made It!" */
  madeLabel?: string;
  /** Optional XP badge text shown only in the not-made state, e.g. "+50 XP" */
  xpLabel?: string;
  xpLabelStyle?: StyleProp<TextStyle>;
}

export default function MadeItButton({
  hasMadeIt,
  onPress,
  style,
  textStyle,
  label,
  madeLabel = 'You Made It!',
  xpLabel,
  xpLabelStyle,
}: MadeItButtonProps) {
  return (
    <TouchableOpacity style={style} onPress={onPress} disabled={hasMadeIt}>
      <Text style={textStyle}>{hasMadeIt ? madeLabel : label}</Text>
      {!hasMadeIt && xpLabel ? <Text style={xpLabelStyle}>{xpLabel}</Text> : null}
    </TouchableOpacity>
  );
}
