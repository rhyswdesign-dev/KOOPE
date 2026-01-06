import { View, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors } from '../theme/tokens';
import EmptyState from '../components/states/EmptyState';
import type { RootStackParamList } from '../navigation/RootNavigator';

export default function BrandScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList,'Brand'>>();
  return (
    <View style={styles.container}>
      <EmptyState
        variant="comingSoon"
        title={params.brand}
        description="Brand stories, featured products, and exclusive content are coming soon. Stay tuned!"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
