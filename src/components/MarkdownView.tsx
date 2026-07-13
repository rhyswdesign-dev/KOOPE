/**
 * MARKDOWN RENDERER COMPONENT
 * Renders markdown content with proper styling and anchor support
 * Supports deep linking to specific sections via anchor IDs
 */

import React, { useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, View, Text } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { colors, spacing, radii } from '../theme/tokens';

interface MarkdownViewProps {
  content: string;
  scrollToAnchor?: string;
  onLinkPress?: (url: string) => void;
}

/**
 * Enhanced markdown renderer with anchor support and custom styling
 * Automatically generates anchor IDs for H2 headings for deep linking
 */
export default function MarkdownView({
  content,
  scrollToAnchor,
  onLinkPress
}: MarkdownViewProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const anchorRefs = useRef<{ [key: string]: View }>({});

  // Scroll to anchor when specified
  useEffect(() => {
    if (scrollToAnchor && anchorRefs.current[scrollToAnchor]) {
      setTimeout(() => {
        anchorRefs.current[scrollToAnchor]?.measure((x, y, width, height, pageX, pageY) => {
          scrollViewRef.current?.scrollTo({ y: pageY - 100, animated: true });
        });
      }, 100);
    }
  }, [scrollToAnchor]);

  // Generate anchor ID from heading text
  const generateAnchorId = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .replace(/-+/g, '-')      // Replace multiple hyphens with single
      .trim();
  };

  // Custom markdown rules with anchor support
  const markdownRules = {
    // Enhanced heading renderer with anchor IDs
    heading2: (node: any, children: any, parent: any, styles: any) => {
      const headingText = node.children?.[0]?.content || '';
      const anchorId = generateAnchorId(headingText);

      return (
        <View
          key={node.key}
          ref={(ref) => {
            if (ref) anchorRefs.current[anchorId] = ref;
          }}
          style={styles.heading2}
        >
          {children}
        </View>
      );
    },

    // Custom link handling
    link: (node: any, children: any, parent: any, styles: any) => {
      return (
        <Text
          key={node.key}
          style={[styles.link, { color: colors.accent }]}
          onPress={() => {
            if (onLinkPress && node.attributes?.href) {
              onLinkPress(node.attributes.href);
            }
          }}
        >
          {children}
        </Text>
      );
    },
  };

  // Custom markdown styles matching app theme
  const markdownStyles = StyleSheet.create({
    body: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 24,
      fontFamily: 'System',
    },
    heading1: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '900',
      marginBottom: spacing(2),
      marginTop: spacing(3),
    },
    heading2: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
      marginBottom: spacing(1.5),
      marginTop: spacing(2.5),
      paddingTop: spacing(1), // Extra space for anchor scrolling
    },
    heading3: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      marginBottom: spacing(1),
      marginTop: spacing(2),
    },
    heading4: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
      marginBottom: spacing(0.5),
      marginTop: spacing(1.5),
    },
    paragraph: {
      color: colors.text,
      marginBottom: spacing(1.5),
      lineHeight: 24,
    },
    link: {
      color: colors.accent,
      textDecorationLine: 'underline',
    },
    list_item: {
      color: colors.text,
      marginBottom: spacing(0.5),
    },
    bullet_list: {
      marginBottom: spacing(1.5),
    },
    ordered_list: {
      marginBottom: spacing(1.5),
    },
    code_inline: {
      backgroundColor: colors.card,
      color: colors.accent,
      paddingHorizontal: spacing(0.5),
      paddingVertical: spacing(0.25),
      borderRadius: radii.sm,
      fontFamily: 'Courier',
      fontSize: 14,
    },
    code_block: {
      backgroundColor: colors.card,
      padding: spacing(1.5),
      borderRadius: radii.md,
      marginBottom: spacing(1.5),
      borderWidth: 1,
      borderColor: colors.line,
    },
    fence: {
      backgroundColor: colors.card,
      padding: spacing(1.5),
      borderRadius: radii.md,
      marginBottom: spacing(1.5),
      borderWidth: 1,
      borderColor: colors.line,
    },
    blockquote: {
      backgroundColor: colors.card,
      borderLeftWidth: 4,
      borderLeftColor: colors.accent,
      paddingLeft: spacing(1.5),
      paddingVertical: spacing(1),
      marginBottom: spacing(1.5),
      fontStyle: 'italic',
    },
    table: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radii.md,
      marginBottom: spacing(1.5),
    },
    thead: {
      backgroundColor: colors.card,
    },
    th: {
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      padding: spacing(1),
      fontWeight: '600',
    },
    td: {
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      padding: spacing(1),
    },
    hr: {
      backgroundColor: colors.line,
      height: 1,
      marginVertical: spacing(2),
    },
  });

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Markdown
        style={markdownStyles}
        rules={markdownRules}
      >
        {content}
      </Markdown>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing(2),
    paddingBottom: spacing(4),
  },
});
