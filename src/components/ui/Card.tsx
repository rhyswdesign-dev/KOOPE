import React from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';

interface CardProps {
  children?: React.ReactNode;
  imageTop?: string;
  footer?: React.ReactNode;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

const Card: React.FC<CardProps> = ({ children, imageTop, footer, style, imageStyle }) => {
  return (
    <View style={[styles.card, style]}>
      {imageTop && (
        <Image
          source={{ uri: imageTop }}
          style={[styles.image, imageStyle]}
          accessibilityLabel="Card image"
        />
      )}
      {children && <View style={styles.content}>{children}</View>}
      {footer && <View style={styles.footer}>{footer}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2A2622', // surfaceVariant
    borderRadius: 24, // lg
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8, // md shadow
  },
  image: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  content: {
    padding: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});

export default Card;
