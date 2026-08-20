import { View, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors } from '../theme/tokens';
import EmptyState from '../components/EmptyState';
import type { RootStackParamList } from '../navigation/RootNavigator';

export default function BrandScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'Brand'>>();
  return (
    <View style={styles.container}>
      <EmptyState
        icon="file-document-outline"
        title={params.brand}
        message="Brand stories and featured products are not available in this build."
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
