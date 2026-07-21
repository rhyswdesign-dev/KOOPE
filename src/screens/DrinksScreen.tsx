import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { Heading, MainPageHeader } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useSavedItems } from '../hooks/useSavedItems';
import { useUserRecipes } from '../store/useUserRecipes';
import { createRecipeCardProps, handleRecipeView } from '../utils/recipeActions';
import RecipeCard from '../components/RecipeCard';
import { getMadeHistory, type MadeHistoryEntry } from '../services/makeLogService';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { withHaptic } from '../lib/haptics';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function DrinksScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { savedItems, toggleSavedCocktail, isCocktailSaved } = useSavedItems();
  const { recipes: userRecipes, loadRecipes } = useUserRecipes();
  const { toast, showToast, hideToast } = useToast();

  const savedCocktails = savedItems.savedCocktails ?? [];
  const importedRecipes = userRecipes.filter((r) => r.type === 'imported');

  useEffect(() => {
    loadRecipes();
  }, []);

  const [history, setHistory] = useState<MadeHistoryEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!user?.id) {
          if (!cancelled) setHistoryLoaded(true);
          return;
        }
        const result = await getMadeHistory(user.id, 20);
        if (!cancelled) {
          setHistory(result);
          setHistoryLoaded(true);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.id]),
  );

  // Import from URL
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlText, setUrlText] = useState('');

  const handleLinkPress = () => {
    setShowUrlInput(!showUrlInput);
  };

  const handleUrlSubmit = () => {
    if (urlText.trim()) {
      Keyboard.dismiss();
      setShowUrlInput(false);
      navigation.navigate('Camera' as any, {
        screen: 'RecipeURLImport',
        params: { url: urlText.trim() },
      });
      setUrlText('');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <MainPageHeader title="Drinks" subtitle={`${savedCocktails.length} saved`} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing(8) }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Saved Cocktails */}
          <View style={{ marginTop: spacing(2) }}>
            <View style={{ paddingHorizontal: spacing(2), marginBottom: spacing(1) }}>
              <Heading level={2}>Saved Cocktails</Heading>
            </View>
            {savedCocktails.length === 0 ? (
              <View
                style={{
                  marginHorizontal: spacing(2),
                  backgroundColor: colors.card,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.line,
                  padding: spacing(2.5),
                  alignItems: 'center',
                }}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={40}
                  color={colors.accent}
                  style={{ marginBottom: spacing(1) }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: colors.text,
                    fontFamily: serif,
                    marginBottom: spacing(0.5),
                  }}
                >
                  No saved cocktails yet
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.subtext,
                    textAlign: 'center',
                    marginBottom: spacing(1.5),
                  }}
                >
                  Recipes you save from Tonight live here.
                </Text>
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.gold,
                    borderRadius: radii.pill,
                    paddingHorizontal: spacing(2.5),
                    paddingVertical: spacing(1),
                  }}
                  onPress={withHaptic(() => navigation.navigate('Recipes' as any), 'selection')}
                >
                  <Text style={{ color: colors.goldText, fontWeight: '700', fontSize: 13 }}>
                    Browse Recipes
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ paddingLeft: spacing(2) }}
              >
                {savedCocktails.map((cocktail: any) => {
                  const cardProps = createRecipeCardProps(cocktail, navigation, {
                    toggleSavedCocktail,
                    isCocktailSaved,
                    showToast,
                    showSaveButton: true,
                    showCartButton: false,
                    source: 'saved',
                  });
                  return (
                    <RecipeCard
                      key={cocktail.id}
                      {...cardProps}
                      style={{ width: 240, marginRight: 16 }}
                    />
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Made-It History */}
          <View style={{ marginTop: spacing(3) }}>
            <View style={{ paddingHorizontal: spacing(2), marginBottom: spacing(1) }}>
              <Heading level={2}>Made-It History</Heading>
            </View>
            {!historyLoaded ? null : history.length === 0 ? (
              <View
                style={{
                  marginHorizontal: spacing(2),
                  backgroundColor: colors.card,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.line,
                  padding: spacing(2.5),
                  alignItems: 'center',
                }}
              >
                <Ionicons
                  name="checkmark-done-outline"
                  size={40}
                  color={colors.accent}
                  style={{ marginBottom: spacing(1) }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: colors.text,
                    fontFamily: serif,
                    marginBottom: spacing(0.5),
                  }}
                >
                  Nothing made yet
                </Text>
                <Text style={{ fontSize: 13, color: colors.subtext, textAlign: 'center' }}>
                  Cocktails you log as made show up here.
                </Text>
              </View>
            ) : (
              <View
                style={{
                  marginHorizontal: spacing(2),
                  backgroundColor: colors.card,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.line,
                  padding: spacing(1.5),
                }}
              >
                {history.slice(0, 5).map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: spacing(1),
                    }}
                    onPress={withHaptic(
                      () => navigation.navigate('CocktailDetail', { cocktailId: entry.recipeId }),
                      'selection',
                    )}
                  >
                    {entry.recipeImage ? (
                      <Image
                        source={{ uri: entry.recipeImage }}
                        style={{ width: 40, height: 40, borderRadius: radii.md }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: radii.md,
                          backgroundColor: colors.bg,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name="wine-outline" size={18} color={colors.accent} />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: spacing(1.5) }}>
                      <Text
                        style={{ fontSize: 14, fontWeight: '600', color: colors.text }}
                        numberOfLines={1}
                      >
                        {entry.recipeName}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.subtext }}>
                        {entry.source}
                        {entry.rating ? ` · ★ ${entry.rating}` : ''}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.subtext }}>
                      {new Date(entry.madeAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </TouchableOpacity>
                ))}
                {history.length > 5 && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.subtext,
                      textAlign: 'center',
                      marginTop: spacing(0.5),
                    }}
                  >
                    +{history.length - 5} more in history
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Import from URL */}
          <View style={{ marginTop: spacing(3), marginHorizontal: spacing(2) }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: colors.card,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.line,
                paddingHorizontal: spacing(2),
                paddingVertical: spacing(1.5),
              }}
              onPress={withHaptic(handleLinkPress, 'selection')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="link" size={20} color={colors.gold} />
                <Text
                  style={{
                    marginLeft: spacing(1),
                    fontSize: 15,
                    fontWeight: '600',
                    color: colors.text,
                  }}
                >
                  Import from URL
                </Text>
              </View>
              <Ionicons
                name={showUrlInput ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.subtext}
              />
            </TouchableOpacity>
            {showUrlInput && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing(1) }}>
                <TextInput
                  style={{
                    flex: 1,
                    backgroundColor: colors.card,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: colors.line,
                    paddingHorizontal: spacing(1.5),
                    paddingVertical: spacing(1),
                    color: colors.text,
                    marginRight: spacing(1),
                  }}
                  placeholder="Paste recipe URL here..."
                  placeholderTextColor={colors.subtext}
                  value={urlText}
                  onChangeText={setUrlText}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="go"
                  onSubmitEditing={handleUrlSubmit}
                />
                <TouchableOpacity
                  style={{
                    backgroundColor: urlText.trim() ? colors.gold : colors.line,
                    borderRadius: radii.md,
                    width: 40,
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={withHaptic(handleUrlSubmit, 'medium')}
                  disabled={!urlText.trim()}
                >
                  <Ionicons name="arrow-forward" size={20} color={colors.goldText} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Imported Recipes */}
          {importedRecipes.length > 0 && (
            <View style={{ marginTop: spacing(2), marginHorizontal: spacing(2) }}>
              {importedRecipes.map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.card,
                    borderRadius: radii.lg,
                    borderWidth: 1,
                    borderColor: colors.line,
                    padding: spacing(1.25),
                    marginTop: spacing(1),
                  }}
                  onPress={withHaptic(
                    () => handleRecipeView(recipe as any, navigation, 'saved'),
                    'selection',
                  )}
                >
                  {recipe.image || recipe.thumbnailImage ? (
                    <Image
                      source={{ uri: recipe.thumbnailImage || recipe.image }}
                      style={{ width: 40, height: 40, borderRadius: radii.md }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: radii.md,
                        backgroundColor: colors.bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="download-outline" size={18} color={colors.accent} />
                    </View>
                  )}
                  <Text
                    style={{
                      flex: 1,
                      marginLeft: spacing(1.5),
                      fontSize: 14,
                      fontWeight: '600',
                      color: colors.text,
                    }}
                    numberOfLines={1}
                  >
                    {recipe.name}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </SafeAreaView>
  );
}
