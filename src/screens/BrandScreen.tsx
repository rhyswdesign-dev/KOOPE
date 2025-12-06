import { View, Text } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { colors } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/RootNavigator';

export default function BrandScreen() {
  const { params } = useRoute<RouteProp<RootStackParamList,'Brand'>>();
  return (
    <View style={{ flex:1, backgroundColor:colors.bg, alignItems:'center', justifyContent:'center', padding:24 }}>
      <Text style={{ color: 'white', fontSize: 28, fontWeight: '900' }}>{params.brand}</Text>
      <Text style={{ color: colors.subtext, marginTop: 8 }}>Brand landing coming soon.</Text>
    </View>
  );
}
