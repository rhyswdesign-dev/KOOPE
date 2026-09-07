import { View, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors } from '../theme/tokens';
import EmptyState from '../components/EmptyState';
import type { RootStackParamList } from '../navigation/RootNavigator';

export default function BarThemeScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList, 'BarTheme'>>();
  return (
    <View style={styles.container}>
      <EmptyState
        icon="timer-sand"
        title={params.theme}
        message="We're curating the perfect collection of bars that match this vibe. Check back soon for personalized recommendations!"
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
