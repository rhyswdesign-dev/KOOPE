import React from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { colors, spacing, radii } from '../../theme/tokens';

interface CardProps {
  children?: React.ReactNode;
  imageTop?: string;
  footer?: React.ReactNode;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  imageTop, 
  footer, 
  style,
  imageStyle 
}) => {
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
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  image: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  content: {
    padding: spacing(2),
  },
  footer: {
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(2),
  },
});

export default Card;