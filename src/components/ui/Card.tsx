import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  ViewStyle,
  ImageStyle,
  TouchableOpacity,
  ImageSourcePropType,
} from 'react-native';
import { colors, spacing, radii, fonts } from '../../theme/tokens';
import Button from './Button';

export type CardVariant = 'basic' | 'image' | 'action' | 'hero';

interface CardProps {
  // Variant
  variant?: CardVariant;

  // Content
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;

  // Image
  image?: string | ImageSourcePropType;
  imageHeight?: number;
  imagePosition?: 'top' | 'background';

  // Legacy props (for backwards compatibility)
  imageTop?: string;
  footer?: React.ReactNode;

  // Action
  actionLabel?: string;
  onAction?: () => void;

  // Events
  onPress?: () => void;

  // Layout
  width?: number | string;

  // Style overrides
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

const Card: React.FC<CardProps> = ({
  variant = 'basic',
  title,
  subtitle,
  children,
  image,
  imageHeight = 180,
  imagePosition = 'top',
  imageTop, // Legacy
  footer, // Legacy
  actionLabel,
  onAction,
  onPress,
  width,
  style,
  imageStyle,
}) => {
  // Resolve image source (support both string and require())
  const imageSource = image || imageTop;
  const resolvedImageSource =
    typeof imageSource === 'string' ? { uri: imageSource } : imageSource;

  const renderImage = () => {
    if (!resolvedImageSource) return null;

    const imageStyles = [
      styles.image,
      { height: imageHeight },
      imagePosition === 'top' && styles.imageTop,
      imagePosition === 'background' && styles.imageBackground,
      imageStyle,
    ];

    return (
      <Image
        source={resolvedImageSource}
        style={imageStyles}
        resizeMode={imagePosition === 'background' ? 'cover' : 'cover'}
        accessibilityLabel={title ? `${title} image` : 'Card image'}
      />
    );
  };

  const renderContent = () => {
    const hasContent = title || subtitle || children || actionLabel;
    if (!hasContent) return null;

    return (
      <View style={[styles.content, imagePosition === 'background' && styles.contentOverlay]}>
        {title && <Text style={styles.title}>{title}</Text>}
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        {children}
        {actionLabel && onAction && (
          <Button
            title={actionLabel}
            onPress={onAction}
            variant="primary"
            size="medium"
            fullWidth
            style={styles.actionButton}
          />
        )}
      </View>
    );
  };

  const cardContent = (
    <View
      style={[
        styles.card,
        variant === 'hero' && styles.heroCard,
        width !== undefined && { width },
        style,
      ]}
    >
      {imagePosition === 'background' ? (
        <>
          {renderImage()}
          {renderContent()}
        </>
      ) : (
        <>
          {renderImage()}
          {renderContent()}
          {footer && <View style={styles.footer}>{footer}</View>}
        </>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

// Convenience components for common variants
export const BasicCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card {...props} variant="basic" />
);

export const ImageCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card {...props} variant="image" />
);

export const ActionCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card {...props} variant="action" />
);

export const HeroCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card {...props} variant="hero" imagePosition="background" />
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  heroCard: {
    borderWidth: 0,
  },
  image: {
    width: '100%',
  },
  imageTop: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
  },
  imageBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.lg,
  },
  content: {
    padding: spacing(2),
  },
  contentOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
  },
  title: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  subtitle: {
    fontSize: fonts.body,
    color: colors.subtext,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(2),
  },
  actionButton: {
    marginTop: spacing(2),
  },
});

export default Card;