import { Modal, View, Text, FlatList, Pressable } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { colors, spacing, radii } from '../theme/tokens';

export type BarPin = {
  name: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
};

export default function MapModal({
  visible,
  pins,
  onClose,
}: {
  visible: boolean;
  pins: BarPin[];
  onClose: () => void;
}) {
  const center = pins[0]
    ? {
        latitude: pins[0].latitude,
        longitude: pins[0].longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }
    : { latitude: 40.7128, longitude: -74.006, latitudeDelta: 0.4, longitudeDelta: 0.4 };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <MapView style={{ flex: 1 }} initialRegion={center}>
          {pins.map((p) => (
            <Marker
              key={`${p.name}-${p.address}`}
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              title={p.name}
              description={p.address}
            />
          ))}
        </MapView>
        <View style={{ height: 200, borderTopWidth: 1, borderTopColor: colors.line }}>
          <Text style={{ color: colors.text, fontWeight: '900', padding: spacing(1.25) }}>
            Locations
          </Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={pins}
            keyExtractor={(i) => i.name + i.address}
            renderItem={({ item }) => (
              <View
                style={{
                  width: 220,
                  marginHorizontal: spacing(1),
                  padding: spacing(1),
                  backgroundColor: colors.card,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.line,
                }}
              >
                <Text style={{ color: colors.text, fontWeight: '900' }}>{item.name}</Text>
                <Text style={{ color: colors.muted }}>{item.address}</Text>
              </View>
            )}
          />
        </View>
        <Pressable onPress={onClose} style={{ padding: 14, alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontWeight: '800' }}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
