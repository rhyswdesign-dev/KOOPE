import React, { useState, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, TouchableOpacity,
  TextInput, Alert, KeyboardAvoidingView, Platform, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { log } from '../lib/logger';
import { useAuth } from '../contexts/AuthContext';
import { feedbackService } from '../lib/supabaseData';
import InPageTabBar from '../components/ui/InPageTabBar';

interface HelpSupportScreenProps {
  onBack?: () => void;
  route?: {
    params?: {
      initialTab?: 'faq' | 'contact';
    };
  };
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface LocalSupportResource {
  city: string;
  provider: string;
  phone: string;
  website: string;
  latitude: number;
  longitude: number;
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

const LOCAL_SUPPORT_RESOURCES: LocalSupportResource[] = [
  {
    city: 'National (US)',
    provider: 'SAMHSA National Helpline',
    phone: '1-800-662-4357',
    website: 'https://www.samhsa.gov/find-help/national-helpline',
    latitude: 39.8283,
    longitude: -98.5795,
  },
  {
    city: 'New York, NY',
    provider: 'NYC Well',
    phone: '1-888-692-9355',
    website: 'https://www.nyc.gov/site/doh/health/health-topics/alcohol.page',
    latitude: 40.7128,
    longitude: -74.0060,
  },
  {
    city: 'Los Angeles, CA',
    provider: 'LA County Substance Abuse Service Helpline',
    phone: '1-844-804-7500',
    website: 'https://dmh.lacounty.gov/our-services/alcohol-and-drug-program/',
    latitude: 34.0522,
    longitude: -118.2437,
  },
  {
    city: 'Chicago, IL',
    provider: 'Illinois Helpline for Opioids and Other Substances',
    phone: '1-833-234-6343',
    website: 'https://helplineil.org/',
    latitude: 41.8781,
    longitude: -87.6298,
  },
  {
    city: 'Houston, TX',
    provider: 'Texas HHSC Mental Health and Substance Use',
    phone: '1-877-541-7905',
    website: 'https://www.hhs.texas.gov/services/mental-health-substance-use',
    latitude: 29.7604,
    longitude: -95.3698,
  },
  {
    city: 'Phoenix, AZ',
    provider: 'Arizona Substance Use Hotline',
    phone: '1-800-631-1314',
    website: 'https://www.azahcccs.gov/BehavioralHealth/OpioidUseDisorder.html',
    latitude: 33.4484,
    longitude: -112.0740,
  },
];

function toRad(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function distanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

export default function HelpSupportScreen({ onBack, route }: HelpSupportScreenProps) {
  const navigation = useNavigation();
  const { user } = useAuth();
  const initialTab = route?.params?.initialTab === 'contact' ? 'contact' : 'faq';
  const [activeTab, setActiveTab] = useState<'faq' | 'contact'>(initialTab);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocatingSupport, setIsLocatingSupport] = useState(false);
  const [supportMatchDistance, setSupportMatchDistance] = useState<number | null>(null);
  const [supportMatchLabel, setSupportMatchLabel] = useState('Using national support resource');
  const [selectedSupportResource, setSelectedSupportResource] = useState<LocalSupportResource>(
    LOCAL_SUPPORT_RESOURCES[0]
  );
  
  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const locateNearestSupport = () => {
    if (!navigator?.geolocation) {
      Alert.alert(
        'Location unavailable',
        'We could not access location services, so we are showing the national support line.'
      );
      setSelectedSupportResource(LOCAL_SUPPORT_RESOURCES[0]);
      setSupportMatchDistance(null);
      setSupportMatchLabel('Using national support resource');
      return;
    }

    setIsLocatingSupport(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        let nearest = LOCAL_SUPPORT_RESOURCES[0];
        let nearestDistance = Number.POSITIVE_INFINITY;

        for (const resource of LOCAL_SUPPORT_RESOURCES.slice(1)) {
          const miles = distanceMiles(latitude, longitude, resource.latitude, resource.longitude);
          if (miles < nearestDistance) {
            nearest = resource;
            nearestDistance = miles;
          }
        }

        const roundedDistance = Math.round(nearestDistance);
        setSelectedSupportResource(nearest);
        setSupportMatchDistance(roundedDistance);
        setSupportMatchLabel(`Closest support match near ${nearest.city}`);
        setIsLocatingSupport(false);
      },
      () => {
        setSelectedSupportResource(LOCAL_SUPPORT_RESOURCES[0]);
        setSupportMatchDistance(null);
        setSupportMatchLabel('Using national support resource');
        setIsLocatingSupport(false);
        Alert.alert(
          'Location permission needed',
          'Please enable location permission to find the closest support resource.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      }
    );
  };

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
      const submitted = await feedbackService.submit({
        user_id: user?.id || 'anonymous',
        type: 'support',
        category: 'support_center',
        title: contactForm.subject.trim() || 'Support Request',
        description: contactForm.message.trim(),
        email: contactForm.email.trim(),
        rating: 0,
        device_info: {
          platform: Platform.OS,
          source: 'HelpSupportScreen',
          requester_name: contactForm.name.trim(),
        },
        status: 'new',
      });

      if (!submitted) {
        throw new Error('Support message insert failed');
      }

      log.info('HelpSupportScreen', 'Support request submitted', {
        userId: user?.id || 'anonymous',
        hasSubject: Boolean(contactForm.subject.trim()),
      });
      
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
      log.error('HelpSupportScreen', 'Support request failed', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateContactForm = (field: keyof typeof contactForm, value: string) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
  };

  const callSupportNumber = async (phone: string) => {
    const url = `tel:${phone.replace(/[^0-9+]/g, '')}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert('Unable to call', `Please dial ${phone} manually.`);
      return;
    }
    await Linking.openURL(url);
  };

  const openSupportWebsite = async (website: string) => {
    const canOpen = await Linking.canOpenURL(website);
    if (!canOpen) {
      Alert.alert('Unable to open link', website);
      return;
    }
    await Linking.openURL(website);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <InPageTabBar
            items={[
              { key: 'faq', label: 'FAQ', icon: 'help-circle-outline' },
              { key: 'contact', label: 'Contact Us', icon: 'mail-outline' },
            ]}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as 'faq' | 'contact')}
          />
        </View>

        {activeTab === 'faq' ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.quickHelpBanner}>
              <View style={styles.quickHelpHeader}>
                <Ionicons name="warning-outline" size={18} color="#EF4444" />
                <Text style={styles.quickHelpTitle}>Need alcohol-use support now?</Text>
              </View>
              <Text style={styles.quickHelpText}>
                Open local and national support resources with one tap.
              </Text>
              <Pressable style={styles.quickHelpButton} onPress={() => setActiveTab('contact')}>
                <Text style={styles.quickHelpButtonText}>Open Support Resources</Text>
              </Pressable>
            </View>

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
            <View style={styles.urgentCard}>
              <Text style={styles.urgentTitle}>Alcohol Support Resources</Text>
              <Text style={styles.urgentSubtitle}>
                If you or someone you know needs help with alcohol use, contact a local resource now.
              </Text>

              <TouchableOpacity
                style={[styles.locationButton, isLocatingSupport && styles.locationButtonDisabled]}
                onPress={locateNearestSupport}
                disabled={isLocatingSupport}
              >
                <Ionicons name="locate-outline" size={16} color={colors.goldText} />
                <Text style={styles.locationButtonText}>
                  {isLocatingSupport ? 'Finding closest support...' : 'Use my location to find closest support'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.matchLabel}>{supportMatchLabel}</Text>

              <View style={styles.resourceCard}>
                <Text style={styles.resourceProvider}>{selectedSupportResource.provider}</Text>
                <Text style={styles.resourcePhone}>{selectedSupportResource.phone}</Text>
                <Text style={styles.resourceLocation}>
                  {selectedSupportResource.city}
                  {supportMatchDistance !== null ? ` • ${supportMatchDistance} mi away` : ''}
                </Text>
                <View style={styles.resourceActions}>
                  <TouchableOpacity
                    style={styles.resourceActionButton}
                    onPress={() => callSupportNumber(selectedSupportResource.phone)}
                  >
                    <Ionicons name="call-outline" size={16} color={colors.goldText} />
                    <Text style={styles.resourceActionText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.resourceActionButton}
                    onPress={() => openSupportWebsite(selectedSupportResource.website)}
                  >
                    <Ionicons name="open-outline" size={16} color={colors.goldText} />
                    <Text style={styles.resourceActionText}>Website</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.emergencyText}>
                In immediate danger, call 911. For mental health crisis support, call or text 988.
              </Text>
            </View>

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
  quickHelpBanner: {
    marginHorizontal: spacing(3),
    marginTop: spacing(3),
    marginBottom: spacing(1),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    padding: spacing(2),
  },
  quickHelpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  quickHelpTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  quickHelpText: {
    color: colors.subtext,
    fontSize: 13,
    marginTop: spacing(0.75),
    lineHeight: 18,
  },
  quickHelpButton: {
    alignSelf: 'flex-start',
    marginTop: spacing(1.5),
    backgroundColor: '#EF4444',
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
  },
  quickHelpButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  urgentCard: {
    marginHorizontal: spacing(3),
    marginTop: spacing(3),
    marginBottom: spacing(3),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(214, 138, 56, 0.4)',
    padding: spacing(2.5),
  },
  urgentTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  urgentSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: spacing(1),
    lineHeight: 20,
  },
  locationButton: {
    marginTop: spacing(2),
    marginBottom: spacing(1),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.75),
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1.2),
  },
  locationButtonDisabled: {
    opacity: 0.7,
  },
  locationButtonText: {
    color: colors.goldText,
    fontSize: 13,
    fontWeight: '700',
  },
  matchLabel: {
    color: colors.subtext,
    fontSize: 12,
    marginBottom: spacing(1.25),
  },
  resourceCard: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2),
  },
  resourceProvider: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  resourcePhone: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.accent,
    marginTop: spacing(0.5),
  },
  resourceLocation: {
    color: colors.subtext,
    fontSize: 12,
    marginTop: spacing(0.75),
  },
  resourceActions: {
    flexDirection: 'row',
    gap: spacing(1.5),
    marginTop: spacing(1.5),
  },
  resourceActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
  },
  resourceActionText: {
    color: colors.goldText,
    fontSize: 13,
    fontWeight: '700',
  },
  emergencyText: {
    color: colors.subtext,
    fontSize: 12,
    marginTop: spacing(1.5),
    lineHeight: 18,
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
