import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { colors, fonts, serif } from '../../theme/tokens';

interface HeadingProps extends TextProps {
    level?: 1 | 2 | 3;
    color?: string;
    align?: 'left' | 'center' | 'right';
}

export default function Heading({
    level = 2,
    color = colors.text,
    align = 'left',
    style,
    children,
    ...props
}: HeadingProps) {
    const headingStyle = [
        styles.common,
        level === 1 && styles.h1,
        level === 2 && styles.h2,
        level === 3 && styles.h3,
        { color, textAlign: align },
        style
    ];

    return (
        <Text style={headingStyle} {...props}>
            {children}
        </Text>
    );
}

const styles = StyleSheet.create({
    common: {
        fontFamily: serif,
        fontWeight: '700',
    },
    h1: {
        fontSize: fonts.h1,
    },
    h2: {
        fontSize: fonts.h2,
    },
    h3: {
        fontSize: fonts.h3,
    },
});
