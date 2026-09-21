/**
 * "Seen a price?" prompt modal for BottleDetailScreen — extracted
 * verbatim (Phase 5, god-file breakup). Purely presentational.
 */
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/tokens';
import { styles } from '../screens/BottleDetailScreen.styles';

interface PriceSpottedPromptModalProps {
  visible: boolean;
  onClose: () => void;
  currency: string;
  priceInput: string;
  onPriceInputChange: (value: string) => void;
  locationInput: string;
  onLocationInputChange: (value: string) => void;
  onSave: () => void;
}

export default function PriceSpottedPromptModal({
  visible,
  onClose,
  currency,
  priceInput,
  onPriceInputChange,
  locationInput,
  onLocationInputChange,
  onSave,
}: PriceSpottedPromptModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.pricePromptOverlay}>
        <View style={styles.pricePromptCard}>
          <Text style={styles.pricePromptTitle}>Seen a price?</Text>
          <Text style={styles.pricePromptSubtitle}>
            Log where you spotted it and how much — you can compare stores later.
          </Text>

          <TextInput
            style={styles.pricePromptInput}
            value={priceInput}
            onChangeText={onPriceInputChange}
            placeholder={`Price (${currency})`}
            placeholderTextColor={colors.subtext}
            keyboardType="decimal-pad"
            returnKeyType="next"
          />
          <TextInput
            style={styles.pricePromptInput}
            value={locationInput}
            onChangeText={onLocationInputChange}
            placeholder="Store or location (e.g. Total Wine, Miami)"
            placeholderTextColor={colors.subtext}
            returnKeyType="done"
            onSubmitEditing={onSave}
          />

          <View style={styles.pricePromptActions}>
            <TouchableOpacity style={styles.pricePromptSkip} onPress={onClose}>
              <Text style={styles.pricePromptSkipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pricePromptSave} onPress={onSave}>
              <Text style={styles.pricePromptSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
