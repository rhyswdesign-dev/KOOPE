// @ts-nocheck
/**
 * LocationMap Component
 * Interactive map with address display and "Open in Maps" functionality
 */

import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Linking, 
  Alert,
  Platform,
  ViewStyle 
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../../theme/tokens';

// Dark map style configuration
const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#212121"
      }
    ]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#181818"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1b1b1b"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [
      {
        "color": "#2c2c2c"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8a8a8a"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#373737"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#3c3c3c"
      }
    ]
  },
  {
    "featureType": "road.highway.controlled_access",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#4e4e4e"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#000000"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#3d3d3d"
      }
    ]
  }
];

export interface LocationData {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  website?: string;
}

export interface LocationMapProps {
  location: LocationData;
  style?: ViewStyle;
  height?: number;
  showControls?: boolean;
  showAddressCard?: boolean;
  showOpenInMapsButton?: boolean;
  showDirectionsButton?: boolean;
  compact?: boolean;
  onMarkerPress?: (location: LocationData) => void;
}

export default function LocationMap({
  location,
  style,
  height = 200,
  showControls = true,
  showAddressCard = true,
  showOpenInMapsButton = true,
  showDirectionsButton = true,
  compact = false,
  onMarkerPress,
}: LocationMapProps) {
  const mapRef = useRef<MapView>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('satellite');

  const region: Region = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const fullAddress = [
    location.address,
    location.city,
    location.state,
    location.zipCode,
    location.country
  ].filter(Boolean).join(', ');

  const openInMaps = async () => {
    const encodedAddress = encodeURIComponent(fullAddress);
    
    try {
      if (Platform.OS === 'ios') {
        // Try Apple Maps first
        const appleMapsUrl = `maps://app?address=${encodedAddress}`;
        const canOpenAppleMaps = await Linking.canOpenURL(appleMapsUrl);
        
        if (canOpenAppleMaps) {
          await Linking.openURL(appleMapsUrl);
        } else {
          // Fallback to Google Maps
          const googleMapsUrl = `https://maps.google.com/?q=${encodedAddress}`;
          await Linking.openURL(googleMapsUrl);
        }
      } else {
        // Android - try Google Maps app first
        const googleMapsApp = `geo:${location.latitude},${location.longitude}?q=${encodedAddress}`;
        const canOpenGoogleMaps = await Linking.canOpenURL(googleMapsApp);
        
        if (canOpenGoogleMaps) {
          await Linking.openURL(googleMapsApp);
        } else {
          // Fallback to web
          const googleMapsUrl = `https://maps.google.com/?q=${encodedAddress}`;
          await Linking.openURL(googleMapsUrl);
        }
      }
    } catch (error) {
      Alert.alert(
        'Unable to Open Maps',
        'Could not open the maps application. Please check your location manually.',
        [{ text: 'OK' }]
      );
    }
  };

  const getDirections = async () => {
    try {
      if (Platform.OS === 'ios') {
        const directionsUrl = `maps://app?daddr=${location.latitude},${location.longitude}&dirflg=d`;
        const canOpen = await Linking.canOpenURL(directionsUrl);
        
        if (canOpen) {
          await Linking.openURL(directionsUrl);
        } else {
          const googleDirections = `https://maps.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
          await Linking.openURL(googleDirections);
        }
      } else {
        const directionsUrl = `google.navigation:q=${location.latitude},${location.longitude}`;
        const canOpen = await Linking.canOpenURL(directionsUrl);
        
        if (canOpen) {
          await Linking.openURL(directionsUrl);
        } else {
          const googleDirections = `https://maps.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
          await Linking.openURL(googleDirections);
        }
      }
    } catch (error) {
      Alert.alert(
        'Unable to Get Directions',
        'Could not open directions. Please use your preferred maps app.',
        [{ text: 'OK' }]
      );
    }
  };

  const centerOnLocation = () => {
    mapRef.current?.animateToRegion(region, 500);
  };

  const toggleMapType = () => {
    setMapType(prev => prev === 'standard' ? 'satellite' : 'standard');
  };

  return (
    <View style={[styles.container, compact && styles.compactContainer, style]}>
      {/* Map View */}
      <View style={[styles.mapContainer, { height: compact ? height * 0.8 : height }]}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          mapType={mapType}
          showsUserLocation
          showsMyLocationButton={false}
          toolbarEnabled={false}
          customMapStyle={Platform.OS === 'android' ? darkMapStyle : undefined}
        >
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={location.name}
            description={location.address}
            onPress={() => onMarkerPress?.(location)}
          />
        </MapView>

        {/* Dark overlay for iOS to simulate dark mode */}
        {Platform.OS === 'ios' && (
          <View style={styles.darkOverlay} pointerEvents="none" />
        )}

        {/* Map Controls */}
        {showControls && (
          <View style={styles.mapControls}>
            <Pressable style={styles.controlButton} onPress={centerOnLocation}>
              <Ionicons name="locate" size={20} color={colors.text} />
            </Pressable>
            
            <Pressable style={styles.controlButton} onPress={toggleMapType}>
              <Ionicons 
                name={mapType === 'standard' ? 'satellite' : 'map'} 
                size={20} 
                color={colors.text} 
              />
            </Pressable>
          </View>
        )}
      </View>

      {/* Address Card */}
      {showAddressCard && (
        <View style={[styles.addressCard, compact && styles.compactAddressCard]}>
          <View style={styles.addressHeader}>
            <View style={styles.addressIcon}>
              <Ionicons name="location" size={16} color={colors.accent} />
            </View>
            <View style={styles.addressContent}>
              <Text style={[styles.locationName, compact && styles.compactLocationName]}>
                {location.name}
              </Text>
              <Text style={[styles.addressText, compact && styles.compactAddressText]}>
                {fullAddress}
              </Text>
            </View>
          </View>

          {/* Contact Info */}
          {(location.phone || location.website) && !compact && (
            <View style={styles.contactInfo}>
              {location.phone && (
                <Pressable 
                  style={styles.contactItem}
                  onPress={() => Linking.openURL(`tel:${location.phone}`)}
                >
                  <Ionicons name="call" size={14} color={colors.subtext} />
                  <Text style={styles.contactText}>{location.phone}</Text>
                </Pressable>
              )}
              
              {location.website && (
                <Pressable 
                  style={styles.contactItem}
                  onPress={() => Linking.openURL(location.website!)}
                >
                  <Ionicons name="globe" size={14} color={colors.subtext} />
                  <Text style={styles.contactText}>Website</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Action Buttons */}
          {(showOpenInMapsButton || showDirectionsButton) && (
            <View style={[styles.actionButtons, compact && styles.compactActionButtons]}>
              {showOpenInMapsButton && (
                <Pressable style={styles.actionButton} onPress={openInMaps}>
                  <Ionicons name="map" size={16} color={colors.accent} />
                  <Text style={styles.actionButtonText}>Open in Maps</Text>
                </Pressable>
              )}
              
              {showDirectionsButton && (
                <Pressable style={styles.actionButton} onPress={getDirections}>
                  <Ionicons name="navigate" size={16} color={colors.accent} />
                  <Text style={styles.actionButtonText}>Directions</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// Convenience components
export const CompactLocationMap: React.FC<Omit<LocationMapProps, 'compact'>> = (props) => (
  <LocationMap {...props} compact height={120} showControls={false} />
);

export const BasicLocationMap: React.FC<Omit<LocationMapProps, 'showAddressCard' | 'showControls'>> = (props) => (
  <LocationMap {...props} showAddressCard={false} showControls={false} />
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  compactContainer: {
    shadowOpacity: 0.05,
    elevation: 1,
  },
  mapContainer: {
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    mixBlendMode: 'multiply',
  },
  mapControls: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    gap: spacing(0.5),
  },
  controlButton: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(1),
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  addressCard: {
    padding: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  compactAddressCard: {
    padding: spacing(1.5),
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing(1.5),
  },
  addressIcon: {
    marginRight: spacing(1),
    marginTop: spacing(0.25),
  },
  addressContent: {
    flex: 1,
  },
  locationName: {
    fontSize: fonts.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(0.25),
  },
  compactLocationName: {
    fontSize: fonts.caption,
    marginBottom: spacing(0.125),
  },
  addressText: {
    fontSize: fonts.caption,
    color: colors.subtext,
    lineHeight: 18,
  },
  compactAddressText: {
    fontSize: fonts.micro,
    lineHeight: 14,
  },
  contactInfo: {
    flexDirection: 'row',
    gap: spacing(2),
    marginBottom: spacing(1.5),
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  contactText: {
    fontSize: fonts.caption,
    color: colors.subtext,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing(1.5),
  },
  compactActionButtons: {
    gap: spacing(1),
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5),
    backgroundColor: colors.chipBg,
    borderRadius: radii.md,
    gap: spacing(0.5),
  },
  actionButtonText: {
    fontSize: fonts.caption,
    fontWeight: '500',
    color: colors.accent,
  },
});