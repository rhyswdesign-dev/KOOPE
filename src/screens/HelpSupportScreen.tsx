import React, { useState, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { log } from '../lib/logger';

interface HelpSupportScreenProps {
  onBack?: () => void;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: '1',
    question: 'How do I create an account?',
    answer: 'You can create an account by tapping "Sign Up" on the welcome screen. You can register with email/password or use Apple/Google sign-in for faster setup.',
    category: 'Account'
  },
  {
    id: '2',
    question: 'How does the XP system work?',
    answer: 'You earn XP (Experience Points) by participating in events, visiting bars, trying new spirits, and engaging with the community. XP helps you unlock higher tiers and exclusive rewards.',
    category: 'XP & Tiers'
  },
  {
    id: '3',
    question: 'What are the different tiers?',
    answer: 'We have Bronze, Silver, Gold, and Platinum tiers. Higher tiers unlock exclusive events, special discounts, and premium content. Your tier is based on your total XP earned.',
    category: 'XP & Tiers'
  },
  {
    id: '4',
    question: 'How do I find events near me?',
    answer: 'Go to the Events tab and allow location access. We\'ll show you upcoming events in your area. You can also search by city or filter by event type.',
    category: 'Events'
  },
  {
    id: '5',
    question: 'Can I cancel my event registration?',
    answer: 'Yes, you can cancel your registration up to 24 hours before the event start time. Go to "My Events" in your profile to manage your registrations.',
    category: 'Events'
  },
  {
    id: '6',
    question: 'How do I add a bar to my favorites?',
    answer: 'When viewing a bar\'s details, tap the heart icon to add it to your favorites. You can view all your favorite bars in your profile under "Favorite Bars".',
    category: 'Bars & Spirits'
  },
  {
    id: '7',
    question: 'Can I submit reviews for bars and spirits?',
    answer: 'Absolutely! We encourage honest reviews. Tap on any bar or spirit and scroll down to leave your rating and review. Your reviews help other users make better choices.',
    category: 'Bars & Spirits'
  },
  {
    id: '8',
    question: 'How do I update my profile information?',
    answer: 'Go to your Profile tab and tap "Edit" in the top-right corner. You can update your name, bio, avatar, and preferences. Don\'t forget to tap "Save Changes" when done.',
    category: 'Profile'
  },
  {
    id: '9',
    question: 'Is my personal information secure?',
    answer: 'Yes, we take your privacy seriously. We use industry-standard encryption and follow strict data protection protocols. Read our Privacy Policy for detailed information.',
    category: 'Privacy & Security'
  },
  {
    id: '10',
    question: 'How do I delete my account?',
    answer: 'Go to Profile > Settings > Account Settings and select "Delete Account". This action is permanent and will remove all your data from our servers.',
    category: 'Account'
  },
];

const CATEGORIES = ['All', 'Account', 'XP & Tiers', 'Events', 'Bars & Spirits', 'Profile', 'Privacy & Security'];

export default function HelpSupportScreen({ onBack }: HelpSupportScreenProps) {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'faq' | 'contact'>('faq');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Help & Support',
      headerStyle: { backgroundColor: colors.bg },
      headerTintColor: colors.text,
      headerTitleStyle: { color: colors.text, fontWeight: '700' },
      headerShadowVisible: false,
    });
  }, [navigation, onBack]);

  const filteredFAQ = FAQ_DATA.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleContactSubmit = async () => {
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactForm.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Implement actual form submission
      log.info('HelpSupportScreen', 'Contact form submitted', { contactForm });
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      Alert.alert(
        'Message Sent!',
        'Thank you for contacting us. We\'ll get back to you within 24 hours.',
        [
          {
            text: 'OK',
            onPress: () => {
              setContactForm({ name: '', email: '', subject: '', message: '' });
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateContactForm = (field: keyof typeof contactForm, value: string) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <Pressable 
            style={[styles.tab, activeTab === 'faq' && styles.activeTab]}
            onPress={() => setActiveTab('faq')}
          >
            <Ionicons 
              name="help-circle-outline" 
              size={20} 
              color={activeTab === 'faq' ? colors.goldText : colors.subtext} 
            />
            <Text style={[styles.tabText, activeTab === 'faq' && styles.activeTabText]}>
              FAQ
            </Text>
          </Pressable>
          <Pressable 
            style={[styles.tab, activeTab === 'contact' && styles.activeTab]}
            onPress={() => setActiveTab('contact')}
          >
            <Ionicons 
              name="mail-outline" 
              size={20} 
              color={activeTab === 'contact' ? colors.goldText : colors.subtext} 
            />
            <Text style={[styles.tabText, activeTab === 'contact' && styles.activeTabText]}>
              Contact Us
            </Text>
          </Pressable>
        </View>

        {activeTab === 'faq' ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Search */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color={colors.subtext} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search FAQ..."
                placeholderTextColor={colors.subtle}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={20} color={colors.subtext} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Categories */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {CATEGORIES.map((category) => (
                <Pressable
                  key={category}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category && styles.activeCategoryChip
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === category && styles.activeCategoryChipText
                    ]}
                  >
                    {category}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* FAQ Items */}
            <View style={styles.faqContainer}>
              {filteredFAQ.length > 0 ? (
                filteredFAQ.map((item) => (
                  <View key={item.id} style={styles.faqItem}>
                    <TouchableOpacity
                      onPress={() => toggleExpanded(item.id)}
                      style={styles.faqQuestion}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.faqQuestionText}>{item.question}</Text>
                      <Ionicons
                        name={expandedItems.has(item.id) ? "chevron-up" : "chevron-down"}
                        size={20}
                        color={colors.subtext}
                      />
                    </TouchableOpacity>
                    {expandedItems.has(item.id) && (
                      <View style={styles.faqAnswer}>
                        <Text style={styles.faqAnswerText}>{item.answer}</Text>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search-outline" size={48} color={colors.subtext} />
                  <Text style={styles.noResultsText}>No FAQ items found</Text>
                  <Text style={styles.noResultsSubtext}>
                    Try adjusting your search or category filter
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Contact Form */}
            <View style={styles.contactContainer}>
              <View style={styles.contactHeader}>
                <Text style={styles.contactTitle}>Get in Touch</Text>
                <Text style={styles.contactSubtitle}>
                  Can't find what you're looking for? Send us a message and we'll help you out.
                </Text>
              </View>

              <View style={styles.contactForm}>
                {/* Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Your full name"
                    placeholderTextColor={colors.subtle}
                    value={contactForm.name}
                    onChangeText={(text) => updateContactForm('name', text)}
                  />
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="your.email@example.com"
                    placeholderTextColor={colors.subtle}
                    value={contactForm.email}
                    onChangeText={(text) => updateContactForm('email', text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                {/* Subject */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Subject</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="What's this about?"
                    placeholderTextColor={colors.subtle}
                    value={contactForm.subject}
                    onChangeText={(text) => updateContactForm('subject', text)}
                  />
                </View>

                {/* Message */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Message *</Text>
                  <TextInput
                    style={[styles.textInput, styles.messageInput]}
                    placeholder="Describe your question or issue in detail..."
                    placeholderTextColor={colors.subtle}
                    value={contactForm.message}
                    onChangeText={(text) => updateContactForm('message', text)}
                    multiline
                    textAlignVertical="top"
                  />
                </View>

                {/* Submit Button */}
                <Pressable 
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                  onPress={handleContactSubmit}
                  disabled={isSubmitting}
                >
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Text>
                </Pressable>
              </View>

              {/* Contact Info */}
              <View style={styles.contactInfo}>
                <Text style={styles.contactInfoTitle}>Other Ways to Reach Us</Text>
                
                <View style={styles.contactInfoItem}>
                  <Ionicons name="mail-outline" size={20} color={colors.accent} />
                  <Text style={styles.contactInfoText}>support@homegameadvantage.com</Text>
                </View>
                
                <View style={styles.contactInfoItem}>
                  <Ionicons name="time-outline" size={20} color={colors.accent} />
                  <Text style={styles.contactInfoText}>We typically respond within 24 hours</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing(6),
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
    paddingBottom: spacing(1),
    gap: spacing(1),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(2),
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(1),
  },
  activeTab: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.subtext,
  },
  activeTabText: {
    color: colors.goldText,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(2),
    marginHorizontal: spacing(3),
    marginTop: spacing(3),
    marginBottom: spacing(2),
    minHeight: 48,
  },
  searchIcon: {
    marginRight: spacing(1.5),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing(1.5),
  },
  categoriesContainer: {
    paddingHorizontal: spacing(3),
    gap: spacing(1.5),
    marginBottom: spacing(2),
  },
  categoryChip: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  activeCategoryChip: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  activeCategoryChipText: {
    color: colors.goldText,
  },
  faqContainer: {
    paddingHorizontal: spacing(3),
    marginTop: spacing(1),
  },
  faqItem: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing(2),
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing(2.5),
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginRight: spacing(2),
  },
  faqAnswer: {
    padding: spacing(2.5),
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  faqAnswerText: {
    fontSize: 15,
    color: colors.subtext,
    lineHeight: 22,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(6),
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing(2),
  },
  noResultsSubtext: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    marginTop: spacing(1),
  },
  contactContainer: {
    paddingHorizontal: spacing(3),
  },
  contactHeader: {
    alignItems: 'center',
    paddingTop: spacing(3),
    paddingBottom: spacing(4),
  },
  contactTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(1),
  },
  contactSubtitle: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
  },
  contactForm: {
    marginBottom: spacing(4),
  },
  inputGroup: {
    marginBottom: spacing(2.5),
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing(1),
  },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(2.5),
    fontSize: 16,
    color: colors.text,
    minHeight: 54,
  },
  messageInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing(2),
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: colors.muted,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.goldText,
  },
  contactInfo: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2.5),
  },
  contactInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  contactInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(1.5),
    gap: spacing(2),
  },
  contactInfoText: {
    fontSize: 15,
    color: colors.subtext,
  },
});