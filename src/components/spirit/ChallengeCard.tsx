import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';

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
        <TouchableOpacity style={s.btn} onPress={onPress}>
          <Text style={s.btnLabel}>{cta}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#2B231C',
    borderRadius: 18,
    overflow: 'hidden'
  },
  hero: {
    width: '100%',
    height: 180
  },
  body: {
    padding: 16
  },
  title: {
    color: '#F4ECE4',
    fontSize: 22,
    fontWeight: '800'
  },
  copy: {
    color: '#C9BEB3',
    fontSize: 15,
    lineHeight: 20,
    marginTop: 8
  },
  btn: {
    backgroundColor: '#E58B2B',
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16
  },
  btnLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  }
});