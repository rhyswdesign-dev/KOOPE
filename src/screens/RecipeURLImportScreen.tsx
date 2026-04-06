/**
 * Recipe URL Import Screen
 * Allows users to import recipes from URLs (paste or share extension)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Keyboard,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, radii } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { log } from '../lib/logger';

export default function RecipeURLImportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const [hasAutoHandledSharedUrl, setHasAutoHandledSharedUrl] = useState(false);

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    icon: string;
    iconColor: string;
    actions: Array<{ label: string; onPress?: () => void; style?: 'primary' | 'secondary' }>;
  } | null>(null);

  const showAlert = useCallback((config: NonNullable<typeof alertConfig>) => {
    setAlertConfig(config);
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig(null);
  }, []);

  // Check if URL was passed via share extension or deep link
  useEffect(() => {
    const params = route.params as any;
    if (params?.url) {
      setUrl(params.url);
      if (!hasAutoHandledSharedUrl) {
        setHasAutoHandledSharedUrl(true);
        navigation.navigate('AIRecipeFormat', { recipeUrl: params.url });
      }
    }
  }, [route.params, navigation, hasAutoHandledSharedUrl]);

  const handleImport = async () => {
    if (!url.trim()) {
      showAlert({
        title: 'Enter URL',
        message: 'Please enter a recipe URL to import.',
        icon: 'alert-circle',
        iconColor: colors.warning,
        actions: [{ label: 'OK', style: 'primary' }],
      });
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      showAlert({
        title: 'Invalid URL',
        message: 'Please enter a valid URL (e.g., https://example.com/recipe).',
        icon: 'alert-circle',
        iconColor: colors.warning,
        actions: [{ label: 'OK', style: 'primary' }],
      });
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const normalizedUrl = url.trim();
      log.info('RecipeURLImportScreen', 'Routing URL to AI recipe formatting', { url: normalizedUrl });
      navigation.navigate('AIRecipeFormat', { recipeUrl: normalizedUrl });
    } catch (error) {
      log.error('RecipeURLImportScreen', 'Error importing recipe', error);
      showAlert({
        title: 'Could Not Start Import',
        message: 'We could not open recipe formatting for this URL. Please try again.',
        icon: 'close-circle',
        iconColor: colors.error,
        actions: [{ label: 'OK', style: 'primary' }],
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await Clipboard.getStringAsync();
      if (!clipboardText?.trim()) {
        showAlert({
          title: 'Clipboard Empty',
          message: 'No URL found in your clipboard.',
          icon: 'alert-circle',
          iconColor: colors.warning,
          actions: [{ label: 'OK', style: 'primary' }],
        });
        return;
      }

      setUrl(clipboardText.trim());
    } catch (error) {
      log.error('RecipeURLImportScreen', 'Clipboard paste failed', error);
      showAlert({
        title: 'Paste Failed',
        message: 'Could not read clipboard content.',
        icon: 'close-circle',
        iconColor: colors.error,
        actions: [{ label: 'OK', style: 'primary' }],
      });
    }
  };

  const popularSources: Array<{ name: string; icon: React.ComponentProps<typeof Ionicons>['name']; url: string }> = [
    { name: 'Liquor.com', icon: 'wine-outline', url: 'https://www.liquor.com' },
    { name: "Difford's Guide", icon: 'book-outline', url: 'https://www.diffordsguide.com' },
    { name: 'Punch', icon: 'flash-outline', url: 'https://punchdrink.com' },
    { name: 'Imbibe', icon: 'newspaper-outline', url: 'https://imbibemagazine.com' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="link" size={48} color={colors.gold} />
          </View>
          <Text style={styles.title}>Import from URL</Text>
          <Text style={styles.subtitle}>
            Paste a recipe link from any website or use the share button in your browser
          </Text>
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Recipe URL</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="https://example.com/recipe"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleImport}
              editable={!loading}
            />
            {url.length > 0 && !loading && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setUrl('')}
              >
                <Ionicons name="close-circle" size={20} color={colors.subtext} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={styles.pasteButton}
            onPress={handlePasteFromClipboard}
            disabled={loading}
          >
            <Ionicons name="clipboard-outline" size={20} color={colors.accent} />
            <Text style={styles.pasteButtonText}>Paste from Clipboard</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.importButton, loading && styles.importButtonDisabled]}
          onPress={handleImport}
          disabled={loading || !url.trim()}
        >
          {loading ? (
            <>
              <ActivityIndicator color={colors.goldText} />
              <Text style={styles.importButtonText}>Importing...</Text>
            </>
          ) : (
            <>
              <Ionicons name="download-outline" size={24} color={colors.goldText} />
              <Text style={styles.importButtonText}>Import Recipe</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Popular Sources</Text>
          <View style={styles.dividerLine} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sourcesRow}
          style={styles.sourcesScroll}
        >
          {popularSources.map((source) => (
            <TouchableOpacity
              key={source.name}
              style={styles.sourceCard}
              onPress={() => showAlert({
                title: source.name,
                message: `Visit ${source.url} to find recipes, then paste the link above.`,
                icon: 'globe-outline',
                iconColor: colors.accent,
                actions: [{ label: 'OK', style: 'primary' }],
              })}
            >
              <View style={styles.sourceIconWrap}>
                <Ionicons name={source.icon} size={22} color={colors.accent} />
              </View>
              <Text style={styles.sourceName}>{source.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.tipCard}>
          <Ionicons name="information-circle-outline" size={24} color={colors.accent} />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>How to use Share Extension</Text>
            <Text style={styles.tipText}>
              1. Open a recipe in Safari or any browser{'\n'}
              2. Tap the Share button{'\n'}
              3. Select "KOOPE" from the share menu{'\n'}
              4. Recipe will be imported automatically
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Branded Alert Modal */}
      <Modal visible={!!alertConfig} transparent animationType="fade" statusBarTranslucent>
        <Pressable style={styles.alertBackdrop} onPress={hideAlert}>
          <BlurView intensity={15} style={StyleSheet.absoluteFill} />
          <View style={styles.alertCenter}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.alertDialog}>
                <View style={styles.alertIconWrap}>
                  <Ionicons name={alertConfig?.icon as any} size={48} color={alertConfig?.iconColor} />
                </View>
                <Text style={styles.alertTitle}>{alertConfig?.title}</Text>
                <Text style={styles.alertMessage}>{alertConfig?.message}</Text>
                <View style={styles.alertActions}>
                  {alertConfig?.actions.map((action, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.alertButton,
                        action.style === 'secondary' ? styles.alertSecondaryBtn : styles.alertPrimaryBtn,
                      ]}
                      onPress={() => { hideAlert(); action.onPress?.(); }}
                    >
                      <Text style={[
                        styles.alertButtonText,
                        action.style === 'secondary' && styles.alertSecondaryBtnText,
                      ]}>
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: spacing(3),
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing(4),
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.gold}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(2),
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  subtitle: {
    fontSize: 15,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: spacing(3),
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(2),
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: spacing(2),
  },
  clearButton: {
    padding: spacing(0.5),
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.5),
    marginTop: spacing(1.5),
    gap: spacing(1),
  },
  pasteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    borderRadius: radii.md,
    paddingVertical: spacing(2),
    gap: spacing(1.5),
    marginBottom: spacing(4),
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.goldText,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(3),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  dividerText: {
    fontSize: 13,
    color: colors.subtext,
    marginHorizontal: spacing(2),
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  sourcesScroll: {
    marginBottom: spacing(3),
  },
  sourcesRow: {
    gap: spacing(1.5),
  },
  sourceCard: {
    width: 110,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(1.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(1),
  },
  sourceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.accent}12`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.accent}25`,
  },
  sourceName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: `${colors.accent}10`,
    borderRadius: radii.md,
    padding: spacing(2),
    gap: spacing(2),
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: spacing(0.5),
  },
  tipText: {
    fontSize: 13,
    color: colors.subtext,
    lineHeight: 20,
  },
  alertBackdrop: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  alertCenter: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: spacing(3),
    width: '100%' as const,
  },
  alertDialog: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing(3),
    width: '100%' as const,
    maxWidth: 340,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center' as const,
  },
  alertIconWrap: {
    marginBottom: spacing(2),
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
    marginBottom: spacing(1),
  },
  alertMessage: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: spacing(3),
  },
  alertActions: {
    flexDirection: 'row' as const,
    gap: spacing(1.5),
    width: '100%' as const,
  },
  alertButton: {
    flex: 1,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    borderRadius: radii.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 44,
  },
  alertPrimaryBtn: {
    backgroundColor: colors.accent,
  },
  alertSecondaryBtn: {
    backgroundColor: colors.chipBg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  alertButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.goldText,
  },
  alertSecondaryBtnText: {
    color: colors.text,
  },
});
