import { Modal, View, Text, Pressable, FlatList } from 'react-native';
import { colors, spacing, radii, textStyles, layouts, components } from '../theme/tokens';

export default function CityPickerModal({
  visible,
  cities,
  selected,
  onSelect,
  onClose,
  onOpenMap,
}: {
  visible: boolean;
  cities: string[];
  selected?: string;
  onSelect: (c: string) => void;
  onClose: () => void;
  onOpenMap: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={components.modal}>
        <View
          style={{
            backgroundColor: colors.bg,
            padding: spacing(2),
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            gap: spacing(1),
          }}
        >
          <Text style={textStyles.h3}>Choose City</Text>
          <FlatList
            data={cities}
            keyExtractor={(i) => i}
            renderItem={({ item }) => (
              <Pressable onPress={() => onSelect(item)} style={{ paddingVertical: spacing(1.25) }}>
                <Text
                  style={[
                    textStyles.bodyMedium,
                    {
                      color: item === selected ? colors.gold : colors.text,
                      fontWeight: item === selected ? '900' : '600',
                    },
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            )}
          />
          <Pressable
            onPress={onOpenMap}
            style={[layouts.card, layouts.center, { padding: spacing(1.5) }]}
          >
            <Text style={[textStyles.bodyMedium, { fontWeight: '800' }]}>Open Map</Text>
          </Pressable>
          <Pressable onPress={onClose} style={[layouts.center, { padding: spacing(1.5) }]}>
            <Text style={[textStyles.bodyMedium, { color: colors.muted, fontWeight: '700' }]}>
              Close
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
