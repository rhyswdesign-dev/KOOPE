import React from 'react';
import { View, Text, TextInput, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIngredientCategoryIcon } from '../../utils/ingredientCategoryIcon';

// A long run of dot-leader characters; the row layout clips this to a single
// line so it exactly fills the gap between the ingredient name and its
// amount, like a menu or table-of-contents leader line.
export const INGREDIENT_LEADER_DOTS = '. '.repeat(80);

export interface IngredientLeaderRowProps {
  name: string;
  /**
   * Right-hand value (e.g. "3/4 oz"). Omit entirely on surfaces that have no
   * amount concept — the dot leader then runs straight to `trailingIcon`.
   */
  amount?: string;
  /**
   * MaterialCommunityIcons glyph name. Left undefined the row derives the
   * category icon from `name`; pass `null` to render no icon at all.
   */
  icon?: string | null;
  iconSize?: number;
  iconColor?: string;
  /**
   * Read-only rows render Text; editable rows render TextInputs wired to
   * onChangeName / onChangeAmount.
   */
  readOnly?: boolean;
  onChangeName?: (value: string) => void;
  onChangeAmount?: (value: string) => void;
  namePlaceholder?: string;
  amountPlaceholder?: string;
  placeholderTextColor?: string;
  /**
   * Trailing status glyph slot — the owned check-circle, a missing
   * alert-circle, or nothing. Rendered after the amount.
   */
  trailingIcon?: React.ReactNode;
  /** Slot for an existing remove-ingredient button on editable surfaces. */
  removeAction?: React.ReactNode;
  /** When true, `lastRowStyle` is applied (usually to drop the divider). */
  isLast?: boolean;
  rowStyle?: StyleProp<ViewStyle>;
  lastRowStyle?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<TextStyle>;
  nameStyle?: StyleProp<TextStyle>;
  dotsStyle?: StyleProp<TextStyle>;
  amountStyle?: StyleProp<TextStyle>;
}

/**
 * One ingredient rendered menu-style: category icon, name, a dotted leader
 * line stretching across the gap, then the amount and an optional trailing
 * status glyph. Structure only — every colour/size comes from the style props
 * so each screen keeps its own token set (same contract as MethodSection).
 */
export default function IngredientLeaderRow({
  name,
  amount,
  icon,
  iconSize = 16,
  iconColor,
  readOnly = true,
  onChangeName,
  onChangeAmount,
  namePlaceholder,
  amountPlaceholder,
  placeholderTextColor,
  trailingIcon = null,
  removeAction = null,
  isLast = false,
  rowStyle,
  lastRowStyle,
  iconStyle,
  nameStyle,
  dotsStyle,
  amountStyle,
}: IngredientLeaderRowProps) {
  const resolvedIcon = icon === undefined ? getIngredientCategoryIcon(name || '') : icon;
  const showAmount = !readOnly || (amount !== undefined && amount !== null);

  return (
    <View style={[rowStyle, isLast && lastRowStyle]}>
      {resolvedIcon ? (
        <MaterialCommunityIcons
          name={resolvedIcon as any}
          size={iconSize}
          color={iconColor}
          style={iconStyle}
        />
      ) : null}

      {readOnly ? (
        <Text style={nameStyle} numberOfLines={1} ellipsizeMode="tail">
          {name}
        </Text>
      ) : (
        <TextInput
          style={[nameStyle, localStyles.editableName]}
          value={name}
          onChangeText={onChangeName}
          placeholder={namePlaceholder}
          placeholderTextColor={placeholderTextColor}
        />
      )}

      <Text style={dotsStyle} numberOfLines={1} ellipsizeMode="clip">
        {INGREDIENT_LEADER_DOTS}
      </Text>

      {showAmount ? (
        readOnly ? (
          <Text style={amountStyle} numberOfLines={1}>
            {amount}
          </Text>
        ) : (
          <TextInput
            style={amountStyle}
            value={amount}
            onChangeText={onChangeAmount}
            placeholder={amountPlaceholder}
            placeholderTextColor={placeholderTextColor}
          />
        )
      ) : null}

      {trailingIcon}
      {removeAction}
    </View>
  );
}

export interface IngredientLeaderItem {
  name: string;
  amount?: string;
  icon?: string | null;
}

export interface IngredientLeaderListProps<T extends IngredientLeaderItem> extends Omit<
  IngredientLeaderRowProps,
  | 'name'
  | 'amount'
  | 'icon'
  | 'isLast'
  | 'trailingIcon'
  | 'removeAction'
  | 'onChangeName'
  | 'onChangeAmount'
> {
  items: T[];
  containerStyle?: StyleProp<ViewStyle>;
  keyPrefix?: string;
  /** Rendered instead of the rows when `items` is empty. */
  emptyContent?: React.ReactNode;
  renderTrailingIcon?: (item: T, index: number) => React.ReactNode;
  renderRemoveAction?: (item: T, index: number) => React.ReactNode;
  onChangeName?: (index: number, value: string) => void;
  onChangeAmount?: (index: number, value: string) => void;
}

/**
 * Thin map wrapper over IngredientLeaderRow that owns the "no divider on the
 * last row" bookkeeping every surface otherwise repeats. Generic over the
 * item type so callers can carry extra fields (ownership match names, ids)
 * through to the trailing-icon / remove-action render slots.
 */
export function IngredientLeaderList<T extends IngredientLeaderItem>({
  items,
  containerStyle,
  keyPrefix = 'ingredient',
  emptyContent = null,
  renderTrailingIcon,
  renderRemoveAction,
  onChangeName,
  onChangeAmount,
  ...rowProps
}: IngredientLeaderListProps<T>) {
  return (
    <View style={containerStyle}>
      {items.length === 0
        ? emptyContent
        : items.map((item, index) => (
            <IngredientLeaderRow
              key={`${keyPrefix}-${index}`}
              {...rowProps}
              name={item.name}
              amount={item.amount}
              icon={item.icon}
              isLast={index === items.length - 1}
              trailingIcon={renderTrailingIcon ? renderTrailingIcon(item, index) : null}
              removeAction={renderRemoveAction ? renderRemoveAction(item, index) : null}
              onChangeName={onChangeName ? (value) => onChangeName(index, value) : undefined}
              onChangeAmount={onChangeAmount ? (value) => onChangeAmount(index, value) : undefined}
            />
          ))}
    </View>
  );
}

const localStyles = StyleSheet.create({
  // A TextInput sizes itself to its content, so the editable name field needs
  // an explicit shrink (to leave room for the leader dots and amount) and a
  // floor (so a short or empty value still gives the user something to tap).
  editableName: {
    flexShrink: 1,
    minWidth: 72,
  },
});
