/**
 * Ingredient-substitute modal for CocktailDetailScreen — extracted
 * verbatim (Phase 5, god-file breakup). Purely presentational: the
 * screen owns the substitute-row computation, this just renders it.
 */
import { Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';
import { styles } from '../screens/CocktailDetailScreen.styles';

export type SubstituteRow = {
  ingredient: string;
  /** null when no real substitute was found — render a "no swap" message instead of "Try {suggestion}". */
  suggestion: string | null;
  note: string;
  confidence: 'high' | 'medium' | 'low';
  inInventory: boolean;
  isSpirit: boolean;
  alternatives?: string;
};

interface SubstituteIngredientsModalProps {
  visible: boolean;
  onClose: () => void;
  hasMissingIngredients: boolean;
  spiritRows: SubstituteRow[];
  otherRows: SubstituteRow[];
}

function SubstituteRowCard({ row }: { row: SubstituteRow }) {
  return (
    <View style={styles.substituteCard}>
      <View style={styles.substituteRowTop}>
        <Text style={styles.substituteIngredient}>{row.ingredient}</Text>
        <Text style={styles.substituteConfidence}>{row.confidence.toUpperCase()}</Text>
      </View>
      <Text style={styles.substituteSuggestion}>
        {row.suggestion ? `Try ${row.suggestion}` : 'No strong swap found'}
      </Text>
      <Text style={styles.substituteNote}>{row.note}</Text>
      {row.alternatives ? (
        <Text style={styles.substituteAltText}>Also consider: {row.alternatives}</Text>
      ) : null}
      {row.inInventory ? (
        <Text style={styles.substituteInventoryTag}>You already have this substitute</Text>
      ) : null}
    </View>
  );
}

export default function SubstituteIngredientsModal({
  visible,
  onClose,
  hasMissingIngredients,
  spiritRows,
  otherRows,
}: SubstituteIngredientsModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {hasMissingIngredients ? 'Ingredient Substitutes' : 'Optional Swaps'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.substituteLegendCard}>
              <View style={styles.substituteLegendHeaderRow}>
                <Text style={styles.substituteLegendTitle}>Confidence Legend</Text>
                <TouchableOpacity
                  style={styles.substituteLegendInfoButton}
                  onPress={() =>
                    Alert.alert(
                      'Confidence Legend',
                      'High: very close swap.\nMedium: good swap with some flavor shift.\nLow: backup option when flexibility matters most.',
                    )
                  }
                >
                  <Text style={styles.substituteLegendInfoButtonText}>?</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.substituteLegendText}>
                High: same family or very close flavor/role.
              </Text>
              <Text style={styles.substituteLegendText}>
                Medium: workable swap with a noticeable profile shift.
              </Text>
              <Text style={styles.substituteLegendText}>
                Low: backup option when you want flexibility over accuracy.
              </Text>
            </View>

            {spiritRows.length > 0 ? (
              <View style={styles.substituteGroup}>
                <Text style={styles.substituteGroupTitle}>Spirit swaps</Text>
                {spiritRows.map((row, idx) => (
                  <SubstituteRowCard key={`spirit-${row.ingredient}-${idx}`} row={row} />
                ))}
              </View>
            ) : null}

            {otherRows.length > 0 ? (
              <View style={styles.substituteGroup}>
                <Text style={styles.substituteGroupTitle}>Other ingredient swaps</Text>
                {otherRows.map((row, idx) => (
                  <SubstituteRowCard key={`other-${row.ingredient}-${idx}`} row={row} />
                ))}
              </View>
            ) : null}

            {!spiritRows.length && !otherRows.length ? (
              <View style={styles.substituteCard}>
                <Text style={styles.substituteNote}>No substitute suggestions found yet.</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalPrimaryButton} onPress={onClose}>
              <Text style={styles.modalPrimaryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
