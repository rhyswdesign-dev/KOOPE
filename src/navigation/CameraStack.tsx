import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CameraHubScreen from '../screens/CameraHubScreen';
import OCRCaptureScreen from '../screens/OCRCaptureScreen';
import IngredientScanScreen from '../screens/IngredientScanScreen';
import RecipeURLImportScreen from '../screens/RecipeURLImportScreen';
import SmartScanScreen from '../screens/SmartScanScreen';
import BottleDetailScreen from '../screens/BottleDetailScreen';
import BottleSearchScreen from '../screens/BottleSearchScreen';
import type { Spirit } from '../data/spiritsDatabase';
import { withScreenTour } from '../components/tour/withScreenTour';

export type CameraStackParamList = {
  CameraHub: undefined;
  SmartScan: { barcodeOnly?: boolean } | undefined;
  BottleDetail: {
    bottle: Spirit;
    imageUri?: string;
    scanConfidence?: number;
    scannedBarcode?: string;
    /** Which resolution path identified the bottle ('catalog' | 'cache' | 'claude-vision') — labels the value line's source (Phase 1.2). Absent = barcode/library, treated as catalog. */
    scanSource?: string;
  };
  BottleSearch: { initialQuery?: string } | undefined;
  OCRCapture: undefined;
  IngredientScan: undefined;
  RecipeURLImport: { url?: string } | undefined;
};

const Stack = createNativeStackNavigator<CameraStackParamList>();
const CameraHubWithTour = withScreenTour(CameraHubScreen, 'tab_camera');
const SmartScanWithTour = withScreenTour(SmartScanScreen, 'feature_smart_scan');

export default function CameraStack() {
  return (
    <Stack.Navigator
      initialRouteName="CameraHub"
      screenOptions={{
        animation: 'slide_from_right',
        animationDuration: 200,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen
        name="CameraHub"
        component={CameraHubWithTour}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SmartScan"
        component={SmartScanWithTour}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BottleDetail"
        component={BottleDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BottleSearch"
        component={BottleSearchScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OCRCapture"
        component={OCRCaptureScreen}
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="IngredientScan"
        component={IngredientScanScreen}
        options={{ headerShown: true, title: 'Scan Ingredient' }}
      />
      <Stack.Screen
        name="RecipeURLImport"
        component={RecipeURLImportScreen}
        options={{ headerShown: true, title: '🔗 Import from URL' }}
      />
    </Stack.Navigator>
  );
}
