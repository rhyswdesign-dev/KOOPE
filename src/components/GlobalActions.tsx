import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Share, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/tokens';
import { searchService, SearchableItem, FilterOptions } from '../services/searchService';
import SearchModal from './SearchModal';
import FilterDrawer from './FilterDrawer';
import CreateCompetitionEntryModal from './CreateCompetitionEntryModal';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { withHaptic } from '../lib/haptics';

interface GlobalActionsProps {
  onSearch?: (results: SearchableItem[]) => void;
  onShare?: (content: any) => void;
  onAdd?: () => void;
  onUpload?: () => void;
  onDownload?: (item: any) => void;
  onRecipeCreated?: (recipeId: string) => void;
  onCompetitionEntryCreated?: (entryId: string) => void;
  showSearch?: boolean;
  showFilter?: boolean;
  showAdd?: boolean;
  showShare?: boolean;
  showUpload?: boolean;
  showDownload?: boolean;
  competitionId?: string;
  competitionTitle?: string;
}

export default function GlobalActions({
  onSearch,
  onShare,
  onAdd,
  onUpload,
  onDownload,
  onRecipeCreated: _onRecipeCreated,
  onCompetitionEntryCreated,
  showSearch = true,
  showFilter = true,
  showAdd = true,
  showShare = true,
  showUpload = false,
  showDownload = false,
  competitionId,
  competitionTitle,
}: GlobalActionsProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [searchVisible, setSearchVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [createEntryVisible, setCreateEntryVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Partial<FilterOptions>>({});

  const handleSearch = async (query: string, newFilters?: Partial<FilterOptions>) => {
    const combinedFilters = { ...filters, ...newFilters };
    const results = await Promise.resolve(searchService.search(query, combinedFilters));
    onSearch?.(results);
    setSearchQuery(query);
    setFilters(combinedFilters);
  };

  const handleShare = async () => {
    onShare?.({});
    try {
      await Share.share({
        message: 'Check out this amazing cocktail app!',
        title: 'Home Game Advantage',
      });
    } catch (error) {
      Alert.alert('Error', 'Unable to share at this time');
    }
  };

  const handleAdd = () => {
    onAdd?.();
    if (competitionId) {
      // We're in a competition context
      setCreateEntryVisible(true);
    } else {
      navigation.navigate('AddRecipe');
    }
  };

  const handleUpload = () => {
    Alert.alert(
      'Upload Content',
      'What would you like to upload?',
      [
        { text: 'Photo', onPress: () => onUpload?.() },
        { text: 'Video', onPress: () => onUpload?.() },
        { text: 'Recipe', onPress: () => navigation.navigate('AddRecipe') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.actionsRow}>
          {showSearch && (
            <Pressable 
              style={styles.actionButton} 
              onPress={withHaptic(() => setSearchVisible(true))}
            >
              <Ionicons name="search" size={20} color={colors.text} />
              <Text style={styles.actionLabel}>Search</Text>
            </Pressable>
          )}

          {showFilter && (
            <Pressable 
              style={styles.actionButton} 
              onPress={withHaptic(() => setFilterVisible(true))}
            >
              <Ionicons name="funnel" size={20} color={colors.text} />
              <Text style={styles.actionLabel}>Filter</Text>
            </Pressable>
          )}

          {showAdd && (
            <Pressable 
              style={styles.actionButton} 
              onPress={withHaptic(handleAdd)}
            >
              <Ionicons name="add-circle" size={20} color={colors.accent} />
              <Text style={[styles.actionLabel, { color: colors.accent }]}>Add</Text>
            </Pressable>
          )}

          {showShare && (
            <Pressable 
              style={styles.actionButton} 
              onPress={withHaptic(handleShare)}
            >
              <Ionicons name="share" size={20} color={colors.text} />
              <Text style={styles.actionLabel}>Share</Text>
            </Pressable>
          )}

          {showUpload && (
            <Pressable 
              style={styles.actionButton} 
              onPress={withHaptic(handleUpload)}
            >
              <Ionicons name="cloud-upload" size={20} color={colors.text} />
              <Text style={styles.actionLabel}>Upload</Text>
            </Pressable>
          )}

          {showDownload && (
            <Pressable 
              style={styles.actionButton} 
              onPress={withHaptic(() => onDownload?.({}))}
            >
              <Ionicons name="download" size={20} color={colors.text} />
              <Text style={styles.actionLabel}>Download</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Search Modal */}
      <SearchModal
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        onSearch={handleSearch}
        initialQuery={searchQuery}
      />

      {/* Filter Drawer */}
      <FilterDrawer
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={(newFilters) => {
          handleSearch(searchQuery, newFilters);
          setFilterVisible(false);
        }}
        currentFilters={filters}
        searchQuery={searchQuery}
      />

      {/* Create Competition Entry Modal */}
      <CreateCompetitionEntryModal
        visible={createEntryVisible}
        onClose={() => setCreateEntryVisible(false)}
        onSuccess={(entryId) => {
          onCompetitionEntryCreated?.(entryId);
          setCreateEntryVisible(false);
        }}
        competitionId={competitionId || 'general'}
        competitionTitle={competitionTitle}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingVertical: spacing(1),
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing(2),
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    minWidth: 60,
    gap: spacing(0.5),
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
});
