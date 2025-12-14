/**
 * Supabase Integration Example
 * Shows how to use Supabase in your React Native app
 */

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';

interface Module {
  id: string;
  title: string;
  chapter_index: number;
  estimated_minutes: number;
  tags: string[];
}

export default function SupabaseExample() {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch modules from Supabase
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .order('chapter_index');

      if (error) throw error;

      setModules(data || []);
    } catch (err: any) {
      log.error('SupabaseExample', 'Error loading modules', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading modules from Supabase...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>❌ Error: {error}</Text>
        <Text style={styles.hint}>
          Make sure you've created the tables in Supabase Dashboard
        </Text>
      </View>
    );
  }

  if (modules.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No modules found</Text>
        <Text style={styles.hint}>
          Run: npm run supabase:migrate
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Curriculum Modules</Text>
      <Text style={styles.subtitle}>Loaded from Supabase 🚀</Text>

      <FlatList
        data={modules}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.moduleCard}>
            <View style={styles.chapterBadge}>
              <Text style={styles.chapterText}>Chapter {item.chapter_index}</Text>
            </View>
            <Text style={styles.moduleTitle}>{item.title}</Text>
            <Text style={styles.moduleTime}>⏱️ {item.estimated_minutes} min</Text>
            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {item.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  moduleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chapterBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  chapterText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  moduleTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
});
