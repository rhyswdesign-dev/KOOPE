/**
 * Currency picker modal for BottleDetailScreen — extracted verbatim
 * (Phase 5, god-file breakup). Purely presentational.
 */
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';
import { styles } from '../screens/BottleDetailScreen.styles';
import { CURRENCY_META, type SupportedCurrency } from '../store/useCurrencyPreference';

interface CurrencyPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentCurrency: SupportedCurrency;
  onSelectCurrency: (currency: SupportedCurrency) => void;
}

export default function CurrencyPickerModal({
  visible,
  onClose,
  currentCurrency,
  onSelectCurrency,
}: CurrencyPickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.currencyModalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.currencyModalSheet}>
          <View style={styles.currencyModalHandle} />
          <Text style={styles.currencyModalTitle}>Price Currency</Text>
          {(Object.keys(CURRENCY_META) as SupportedCurrency[]).map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.currencyOption, c === currentCurrency && styles.currencyOptionActive]}
              onPress={() => onSelectCurrency(c)}
            >
              <Text style={styles.currencyOptionFlag}>{CURRENCY_META[c].flag}</Text>
              <View style={styles.currencyOptionLabels}>
                <Text
                  style={[
                    styles.currencyOptionCode,
                    c === currentCurrency && styles.currencyOptionCodeActive,
                  ]}
                >
                  {c}
                </Text>
                <Text style={styles.currencyOptionName}>{CURRENCY_META[c].label}</Text>
              </View>
              {c === currentCurrency && <Ionicons name="checkmark" size={18} color={colors.gold} />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
