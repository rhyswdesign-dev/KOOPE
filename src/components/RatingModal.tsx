/**
 * Post-"made it" rating modal for CocktailDetailScreen — extracted
 * verbatim (Phase 5, god-file breakup). Purely presentational: state and
 * the save handler live in useMadeItFlow, this just renders it.
 */
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';
import { styles } from '../screens/CocktailDetailScreen.styles';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  selectedRating: number;
  onSelectRating: (rating: number) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onSave: () => void;
}

export default function RatingModal({
  visible,
  onClose,
  selectedRating,
  onSelectRating,
  notes,
  onNotesChange,
  onSave,
}: RatingModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.ratingCard}>
          <Text style={styles.modalTitle}>How was it?</Text>
          <Text style={styles.ratingSubtitle}>Optional rating to improve recommendations</Text>

          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <TouchableOpacity key={rating} onPress={() => onSelectRating(rating)}>
                <Ionicons
                  name={rating <= selectedRating ? 'star' : 'star-outline'}
                  size={32}
                  color={rating <= selectedRating ? colors.gold : colors.subtext}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[styles.modalInput, styles.multilineInput]}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.subtext}
            value={notes}
            onChangeText={onNotesChange}
            multiline
          />

          <View style={styles.ratingActions}>
            <TouchableOpacity style={styles.modalSecondaryButton} onPress={onClose}>
              <Text style={styles.modalSecondaryButtonText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalPrimaryButton} onPress={onSave}>
              <Text style={styles.modalPrimaryButtonText}>Save Feedback</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
