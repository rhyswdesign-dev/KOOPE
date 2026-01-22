import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { colors, spacing, radii, fonts } from '../../theme/tokens';
import Button from '../ui/Button';

export default function ChallengeCard({
  image,
  title,
  copy,
  cta = 'Learn More',
  onPress
}: {
  image: string;
  title: string;
  copy: string;
  cta?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.card}>
      <Image source={{ uri: image }} style={s.hero} />
      <View style={s.body}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.copy}>{copy}</Text>
        <Button
          title={cta}
          onPress={onPress || (() => {})}
          variant="primary"
          size="medium"
          fullWidth
          style={s.btn}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    overflow: 'hidden'
  },
  hero: {
    width: '100%',
    height: 180
  },
  body: {
    padding: spacing(2)
  },
  title: {
    color: colors.text,
    fontSize: fonts.h2,
    fontWeight: '800'
  },
  copy: {
    color: colors.subtext,
    fontSize: 15,
    lineHeight: 20,
    marginTop: spacing(1)
  },
  btn: {
    marginTop: spacing(2)
  }
});