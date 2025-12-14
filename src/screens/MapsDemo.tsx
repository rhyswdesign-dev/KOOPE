/**
 * Maps Demo Screen
 * Demonstrates LocationMap component functionality with Toronto bar locations
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  LocationMap,
  CompactLocationMap,
  BasicLocationMap,
  LocationData
} from '../components/ui';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { BARS } from '../data/bars';
import { log } from '../lib/logger';

const MapsDemo: React.FC = () => {
  const [selectedBar, setSelectedBar] = useState<string>('the_alchemist');
  const [mapStyle, setMapStyle] = useState<'full' | 'compact' | 'basic'>('full');

  // Get bars that have location data
  const barsWithLocation = Object.values(BARS).filter(bar => bar.location);

  const currentBar = BARS[selectedBar];
  const locationData: LocationData | null = currentBar?.location || null;

  const renderBarSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorTitle}>Choose a Bar:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.barButtons}>
          {barsWithLocation.map((bar) => (
            <Pressable
              key={bar.id}
              style={[
                styles.barButton,
                selectedBar === bar.id && styles.barButtonActive
              ]}
              onPress={() => setSelectedBar(bar.id)}
            >
              <Text style={[
                styles.barButtonText,
                selectedBar === bar.id && styles.barButtonTextActive
              ]}>
                {bar.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderStyleSelector = () => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorTitle}>Map Style:</Text>
      <View style={styles.styleButtons}>
        {[
          { key: 'full', label: 'Full Map', icon: 'map' },
          { key: 'compact', label: 'Compact', icon: 'resize' },
          { key: 'basic', label: 'Basic', icon: 'location' }
        ].map((style) => (
          <Pressable
            key={style.key}
            style={[
              styles.styleButton,
              mapStyle === style.key && styles.styleButtonActive
            ]}
            onPress={() => setMapStyle(style.key as any)}
          >
            <Ionicons 
              name={style.icon as any} 
              size={16} 
              color={mapStyle === style.key ? colors.accentText : colors.subtext} 
            />
            <Text style={[
              styles.styleButtonText,
              mapStyle === style.key && styles.styleButtonTextActive
            ]}>
              {style.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderMapDemo = () => {
    if (!locationData) {
      return (
        <View style={styles.noLocationContainer}>
          <Ionicons name="location-outline" size={48} color={colors.muted} />
          <Text style={styles.noLocationText}>
            No location data available for this bar
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.mapContainer}>
        {mapStyle === 'full' && (
          <LocationMap
            location={locationData}
            height={300}
            onMarkerPress={(location) =>
              log.info('MapsDemo', 'Marker pressed', { locationName: location.name })
            }
          />
        )}
        
        {mapStyle === 'compact' && (
          <CompactLocationMap
            location={locationData}
            onMarkerPress={(location) =>
              log.info('MapsDemo', 'Compact marker pressed', { locationName: location.name })
            }
          />
        )}
        
        {mapStyle === 'basic' && (
          <BasicLocationMap
            location={locationData}
            height={200}
            onMarkerPress={(location) =>
              log.info('MapsDemo', 'Basic marker pressed', { locationName: location.name })
            }
          />
        )}
      </View>
    );
  };

  const renderFeatures = () => (
    <View style={styles.featuresContainer}>
      <Text style={styles.featuresTitle}>Map Features:</Text>
      <View style={styles.featuresList}>
        <View style={styles.featureItem}>
          <Ionicons name="map" size={16} color={colors.accent} />
          <Text style={styles.featureText}>Interactive map with zoom/pan</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="location" size={16} color={colors.accent} />
          <Text style={styles.featureText}>Precise location markers</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="navigate" size={16} color={colors.accent} />
          <Text style={styles.featureText}>Get directions button</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="open" size={16} color={colors.accent} />
          <Text style={styles.featureText}>Open in Maps app</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="call" size={16} color={colors.accent} />
          <Text style={styles.featureText}>Contact information</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="satellite" size={16} color={colors.accent} />
          <Text style={styles.featureText}>Map type toggle</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Maps Demo</Text>
          <Text style={styles.subtitle}>
            Interactive location maps for Toronto bars
          </Text>
        </View>

        {renderBarSelector()}
        {renderStyleSelector()}
        {renderMapDemo()}
        {renderFeatures()}

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>How to test:</Text>
          <Text style={styles.instructionsText}>
            1. Select different bars to see their locations{'\n'}
            2. Try different map styles (Full, Compact, Basic){'\n'}
            3. Tap "Get Directions" to open navigation{'\n'}
            4. Tap "Open in Maps" to open in system maps{'\n'}
            5. Use map controls to zoom and change view
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: {
    fontSize: fonts.heading,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  subtitle: {
    fontSize: fonts.body,
    color: colors.subtext,
  },
  selectorContainer: {
    padding: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  selectorTitle: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  barButtons: {
    flexDirection: 'row',
    gap: spacing(1),
  },
  barButton: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5),
    backgroundColor: colors.chipBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  barButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  barButtonText: {
    fontSize: fonts.caption,
    fontWeight: '500',
    color: colors.text,
  },
  barButtonTextActive: {
    color: colors.accentText,
  },
  styleButtons: {
    flexDirection: 'row',
    gap: spacing(1),
  },
  styleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5),
    backgroundColor: colors.chipBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(0.5),
  },
  styleButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  styleButtonText: {
    fontSize: fonts.caption,
    fontWeight: '500',
    color: colors.subtext,
  },
  styleButtonTextActive: {
    color: colors.accentText,
  },
  mapContainer: {
    padding: spacing(2),
  },
  noLocationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(4),
    margin: spacing(2),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
  },
  noLocationText: {
    fontSize: fonts.body,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing(1),
  },
  featuresContainer: {
    padding: spacing(2),
    backgroundColor: colors.card,
    margin: spacing(2),
    borderRadius: radii.lg,
  },
  featuresTitle: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1.5),
  },
  featuresList: {
    gap: spacing(1),
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  featureText: {
    fontSize: fonts.caption,
    color: colors.subtext,
    flex: 1,
  },
  instructions: {
    padding: spacing(2),
    backgroundColor: colors.infoBackground,
    margin: spacing(2),
    borderRadius: radii.lg,
    marginBottom: spacing(4),
  },
  instructionsTitle: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  instructionsText: {
    fontSize: fonts.caption,
    color: colors.subtext,
    lineHeight: 20,
  },
});

export default MapsDemo;