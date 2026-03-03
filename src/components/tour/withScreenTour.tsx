import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenTourId } from '../../config/screenTours';
import { useScreenTour } from '../../hooks/useScreenTour';
import ScreenTourModal from './ScreenTourModal';
import { colors, radii, spacing } from '../../theme/tokens';

interface TourWrapperOptions {
  showReplayButton?: boolean;
  replayLabel?: string;
}

export function withScreenTour<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  tourId: ScreenTourId,
  options?: TourWrapperOptions
) {
  const TourWrappedScreen: React.FC<P> = (props) => {
    const {
      visible,
      stepIndex,
      slides,
      openTour,
      closeTour,
      next,
      previous,
      isFirstStep,
      isLastStep,
    } = useScreenTour(tourId);

    return (
      <>
        <WrappedComponent {...props} />

        {options?.showReplayButton === true && (
          <Pressable
            style={styles.replayButton}
            onPress={openTour}
            accessibilityRole="button"
            accessibilityLabel={options?.replayLabel || 'Open tour'}
          >
            <Ionicons name="compass-outline" size={18} color={colors.text} />
          </Pressable>
        )}

        <ScreenTourModal
          visible={visible}
          stepIndex={stepIndex}
          slides={slides}
          onClose={closeTour}
          onNext={next}
          onPrevious={previous}
          isFirstStep={isFirstStep}
          isLastStep={isLastStep}
        />
      </>
    );
  };

  TourWrappedScreen.displayName = `withScreenTour(${WrappedComponent.displayName || WrappedComponent.name || 'Screen'})`;
  return TourWrappedScreen;
}

const styles = StyleSheet.create({
  replayButton: {
    position: 'absolute',
    left: spacing(2),
    top: spacing(6),
    backgroundColor: 'rgba(43,31,23,0.92)',
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.full,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
});
