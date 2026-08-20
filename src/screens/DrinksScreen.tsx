import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { Heading, MainPageHeader } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useSavedItems } from '../hooks/useSavedItems';
import { useUserRecipes } from '../store/useUserRecipes';
import { handleRecipeView } from '../utils/recipeActions';
import { getCocktailImage } from '../../assets/images/cocktails';
import { getMadeHistory, type MadeHistoryEntry } from '../services/makeLogService';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { withHaptic } from '../lib/haptics';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DrinksTab = 'saved' | 'made' | 'imported';

function EmptyStateCard({
  icon,
  title,
  body,
  ctaLabel,
  onPressCta,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  ctaLabel?: string;
  onPressCta?: () => void;
}) {
  return (
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
      <Ionicons name={icon} size={40} color={colors.accent} style={{ marginBottom: spacing(1) }} />
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: colors.text,
          fontFamily: serif,
          marginBottom: spacing(0.5),
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: colors.subtext,
          textAlign: 'center',
          marginBottom: ctaLabel ? spacing(1.5) : 0,
        }}
      >
        {body}
      </Text>
      {ctaLabel && onPressCta && (
        <TouchableOpacity
          style={{
            backgroundColor: colors.gold,
            borderRadius: radii.pill,
            paddingHorizontal: spacing(2.5),
            paddingVertical: spacing(1),
          }}
          onPress={withHaptic(onPressCta, 'selection')}
        >
          <Text style={{ color: colors.goldText, fontWeight: '700', fontSize: 13 }}>
            {ctaLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// 2-column grid tile for the Saved Cocktails tab — real cocktail photo, name,
// and a short ingredient subtitle, matching the "richer cocktail card"
// direction chosen for this redesign (concept B) over the plain list rows
// the screen used before.
function SavedCocktailGridCard({ cocktail, navigation }: { cocktail: any; navigation: Nav }) {
  const resolvedImage = getCocktailImage(
    cocktail.id,
    typeof cocktail.image === 'string' ? cocktail.image : cocktail.imageUrl,
  );
  const subtitle = (cocktail.ingredients || [])
    .slice(0, 3)
    .map((ingredient: any) => ingredient.name)
    .join(', ');

  return (
    <TouchableOpacity
      style={{
        width: '48%',
        backgroundColor: colors.card,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.line,
        marginBottom: spacing(2),
        overflow: 'hidden',
      }}
      onPress={withHaptic(() => handleRecipeView(cocktail, navigation, 'saved'), 'selection')}
      activeOpacity={0.82}
    >
      <View style={{ width: '100%', aspectRatio: 1 }}>
        <Image
          source={typeof resolvedImage === 'string' ? { uri: resolvedImage } : resolvedImage}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </View>
      <View style={{ padding: spacing(1.25) }}>
        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
          {cocktail.title || cocktail.name}
        </Text>
        {!!subtitle && (
          <Text numberOfLines={1} style={{ fontSize: 11, color: colors.subtext, marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function DrinksScreen() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { savedItems, isHydrated: savedItemsHydrated } = useSavedItems();
  const { recipes: userRecipes, loadRecipes, isLoading: recipesLoading } = useUserRecipes();
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

  const [activeTab, setActiveTab] = useState<DrinksTab>('saved');

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

  // Saved Cocktails, Made It History, and Imported Recipes each load from a
  // different source (AsyncStorage, Supabase, the recipes store) and each
  // gates its own section on its array's length. Left alone, each section
  // pops in independently as its own fetch resolves — three separate jumps
  // instead of one. Gate the whole screen on all three finishing together.
  const initialLoading = !savedItemsHydrated || !historyLoaded || recipesLoading;

  if (initialLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <MainPageHeader title="Drinks" subtitle=" " />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  const tabCount: Record<DrinksTab, number> = {
    saved: savedCocktails.length,
    made: history.length,
    imported: importedRecipes.length,
  };
  const tabLabel: Record<DrinksTab, string> = {
    saved: 'saved',
    made: 'made',
    imported: 'imported',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <MainPageHeader
        title="Drinks"
        subtitle={`${tabCount[activeTab]} ${tabLabel[activeTab]}`}
        rightActions={[
          {
            icon: 'add-circle-outline',
            onPress: () => setShowUrlInput(true),
            accessibilityLabel: 'Import a recipe',
          },
        ]}
      />
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
          {/* Saved / Made / Imported — tabbed collections (redesign concept B) */}
          <View
            style={{
              flexDirection: 'row',
              marginHorizontal: spacing(2),
              marginTop: spacing(2),
              marginBottom: spacing(2),
              backgroundColor: colors.card,
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: colors.line,
              padding: 4,
            }}
          >
            {(['saved', 'made', 'imported'] as DrinksTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={{
                  flex: 1,
                  paddingVertical: spacing(1),
                  borderRadius: radii.pill,
                  alignItems: 'center',
                  backgroundColor: activeTab === tab ? colors.gold : 'transparent',
                }}
                onPress={withHaptic(() => setActiveTab(tab), 'selection')}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: activeTab === tab ? '700' : '600',
                    color: activeTab === tab ? colors.goldText : colors.muted,
                    textTransform: 'capitalize',
                  }}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'saved' && (
            <View>
              <View style={{ paddingHorizontal: spacing(2), marginBottom: spacing(1) }}>
                <Heading level={2}>Saved Cocktails</Heading>
              </View>
              {savedCocktails.length === 0 ? (
                <EmptyStateCard
                  icon="bookmark-outline"
                  title="No saved cocktails yet"
                  body="Recipes you save from Tonight live here."
                  ctaLabel="Browse Recipes"
                  onPressCta={() => navigation.navigate('Recipes' as any)}
                />
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    paddingHorizontal: spacing(2),
                  }}
                >
                  {savedCocktails.map((cocktail: any) => (
                    <SavedCocktailGridCard
                      key={cocktail.id}
                      cocktail={cocktail}
                      navigation={navigation}
                    />
                  ))}
                </View>
              )}
              {savedCocktails.length > 0 && (
                <TouchableOpacity
                  style={{
                    marginHorizontal: spacing(2),
                    marginTop: spacing(0.5),
                    backgroundColor: colors.gold,
                    borderRadius: radii.pill,
                    paddingVertical: spacing(1.5),
                    alignItems: 'center',
                  }}
                  onPress={withHaptic(() => navigation.navigate('Recipes' as any), 'selection')}
                >
                  <Text style={{ color: colors.goldText, fontWeight: '700', fontSize: 14 }}>
                    Browse More Recipes
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {activeTab === 'made' && (
            <View>
              <View style={{ paddingHorizontal: spacing(2), marginBottom: spacing(1) }}>
                <Heading level={2}>Made-It History</Heading>
              </View>
              {history.length === 0 ? (
                <EmptyStateCard
                  icon="checkmark-done-outline"
                  title="Nothing made yet"
                  body="Cocktails you log as made show up here."
                />
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
                  {history.map((entry) => (
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
                          contentFit="cover"
                          cachePolicy="memory-disk"
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
                </View>
              )}
            </View>
          )}

          {activeTab === 'imported' && (
            <View>
              <View style={{ paddingHorizontal: spacing(2), marginBottom: spacing(1) }}>
                <Heading level={2}>Imported Recipes</Heading>
              </View>
              {importedRecipes.length === 0 ? (
                <EmptyStateCard
                  icon="download-outline"
                  title="No imported recipes yet"
                  body="Paste a link below to import one."
                />
              ) : (
                <View style={{ marginHorizontal: spacing(2) }}>
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
                        marginBottom: spacing(1),
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
                          contentFit="cover"
                          cachePolicy="memory-disk"
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
            </View>
          )}

          {/* Import from URL — persistent utility action, available regardless
              of which collection tab is active. */}
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
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </SafeAreaView>
  );
}
