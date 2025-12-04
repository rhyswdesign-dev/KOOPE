# Recommendation Systems - Architecture Document

## Overview
This app features two distinct recommendation systems designed to work together to provide personalized cocktail discovery.

---

## 1. **Recommended Cocktails** (Static Taste Matching)

### Purpose
Provide curated cocktail recommendations based on the user's static taste profile preferences.

### Data Source
- **Store**: `usePersonalization` (src/store/usePersonalization.ts)
- **Service**: `personalizedExperience` (src/services/personalizedExperience.ts)
- **Function**: `getFeaturedCocktails()`

### Algorithm
**Simple weighted scoring system:**
- Spirit preferences (40% weight)
- Difficulty appropriateness (30% weight)
- ABV preference (20% weight)
- Flavor matching (10% weight)

### Categories
1. **Matched for You** - Cocktails scored highest based on taste profile
2. **Beginner Friendly** - Easy difficulty cocktails for new bartenders
3. **Flavor Challenges** - Complex cocktails to expand palate

### Updates When
- User completes initial onboarding survey
- User updates taste profile via "Refine Your Taste" screen
- User manually refreshes recommendations

### Cost
**FREE** - No AI credits required

### Features
- Quick, instant recommendations
- Consistent results based on profile
- No behavioral learning
- No context awareness

---

## 2. **AI Recommendations** (Dynamic Machine Learning)

### Purpose
Provide intelligent, context-aware cocktail suggestions that learn from user behavior and adapt to current conditions.

### Data Source
- **Service**: `AIRecommendationEngine` (src/services/aiRecommendationEngine.ts)
- **Store**: `useAICredits` (src/store/useAICredits.ts)
- **Tracking**: `recommendationTrackingService` (src/services/recommendationTrackingService.ts)

### Algorithm
**Advanced multi-factor scoring system:**

#### Core Factors (60%)
- Home bar inventory matching (25%)
- Taste profile alignment (20%)
- Difficulty appropriateness (15%)

#### Context Factors (25%)
- Time of day (10%) - Morning: low-ABV, Evening: full cocktails
- Season (10%) - Summer: refreshing, Winter: warming
- Current mood/occasion (5%)

#### Behavioral Learning (15%)
- Past interactions (views, saves, makes)
- Feedback ratings (star ratings from modal)
- Dismissal patterns
- Trending cocktails among similar users

### Features

#### 1. **Smart Inventory Matching**
```typescript
canMakeNow: boolean
missingIngredients: string[]
substitutionSuggestions: Ingredient[]
```

#### 2. **Context Awareness**
```typescript
{
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night',
  season: 'spring' | 'summer' | 'fall' | 'winter',
  occasion: 'casual' | 'party' | 'date' | 'celebration'
}
```

#### 3. **Feedback Loop**
- **Modal**: `RecommendationFeedbackModal.tsx`
- **Ratings**: 1-5 stars with optional text feedback
- **Tracking**: All interactions tracked to Firebase
  - Views
  - Saves
  - Makes
  - Dismissals
  - Ratings

#### 4. **Analytics Dashboard**
```typescript
{
  totalRecommendations: number,
  viewedCount: number,
  savedCount: number,
  madeCount: number,
  dismissedCount: number,
  averageRating: number,
  conversionRate: number, // % of viewed → made
  topPerformingCocktails: Cocktail[]
}
```

### Updates When
- User generates new recommendations (costs credits)
- User provides feedback (improves future recommendations)
- User adds/removes home bar ingredients
- Context changes (time of day, season)
- User behavior patterns detected

### Cost
**1 AI Credit per generation**
- Uses `useAICredits` store
- Credits earned through:
  - Completing lessons (+1)
  - Daily check-in (+1)
  - Saving AI suggestions (+1)
  - Providing feedback (+0.5)

### Firebase Integration
**Collection**: `recommendationInteractions`

**Document Structure**:
```typescript
{
  userId: string,
  recommendationId: string,
  cocktailName: string,
  matchScore: number,
  interactionType: 'viewed' | 'saved' | 'made' | 'dismissed' | 'rated',
  rating?: number,
  feedback?: string,
  context: {
    timeOfDay: string,
    season: string,
    hadAllIngredients: boolean,
    missingIngredients: string[]
  },
  timestamp: Date
}
```

---

## Comparison Table

| Feature | Recommended Cocktails | AI Recommendations |
|---------|----------------------|-------------------|
| **Algorithm** | Static scoring | Dynamic ML |
| **Cost** | Free | 1 credit/generation |
| **Updates** | Profile changes | Real-time context |
| **Learning** | No | Yes |
| **Context-Aware** | No | Yes |
| **Inventory Matching** | No | Yes |
| **Feedback** | No | Yes (modal + tracking) |
| **Analytics** | Basic | Advanced |
| **Firebase Integration** | Local only | Full sync |
| **Personalization** | Taste profile only | Multi-factor |

---

## User Journey

### Initial Experience
1. User completes onboarding survey
2. **Recommended Cocktails** generated instantly
3. User explores "Matched for You", "Beginner", "Challenges" tabs

### Advanced Experience
4. User adds ingredients to home bar
5. User generates **AI Recommendations** (costs 1 credit)
6. AI shows cocktails user can make NOW + context-appropriate suggestions
7. User rates recommendations via feedback modal
8. System learns preferences and improves future suggestions

### Continuous Improvement
9. User interactions tracked to Firebase
10. Behavioral patterns detected
11. Future recommendations become more accurate
12. User sees trending cocktails from similar users

---

## Technical Architecture

### Recommended Cocktails Flow
```
User Profile → personalizedExperience.buildProfile()
             → personalizedExperience.generateRecommendations()
             → usePersonalization.getFeaturedCocktails()
             → ForYouFeed component renders tabs
```

### AI Recommendations Flow
```
User Action → AIRecommendations.generateRecommendations()
            → Check AI credits (useAICredits)
            → Load user profile + home bar
            → AIRecommendationEngine.generateRecommendations()
            → Apply context (time, season)
            → Track view (recommendationTrackingService)
            → Display with RecipeCard + Rate button
            → User rates → RecommendationFeedbackModal
            → Track rating → Firebase
            → Update behavioral learning weights
```

---

## Phase 2 Enhancement Plan (Future)

### Planned Improvements to AI Recommendations
1. **Replace star ratings with thumbs up/down**
   - Simpler, faster feedback
   - Higher engagement rate

2. **Add detailed feedback options**
   ```typescript
   - "Too complex"
   - "Don't have ingredients"
   - "Not in the mood"
   - "Made it - loved it!"
   - "Made it - didn't like it"
   ```

3. **Dynamic taste profile weight updates**
   ```typescript
   function updateTasteProfileWeights(feedback: Feedback) {
     if (feedback.type === 'thumbs_up') {
       // Boost spirit scores for this cocktail's base
       // Increase flavor weights for dominant flavors
     } else if (feedback.type === 'thumbs_down') {
       // Reduce weights slightly
       // Note dismissal reason for future filtering
     }
   }
   ```

4. **Social recommendations**
   - "Users with similar taste love..."
   - Collaborative filtering algorithm

5. **Seasonal trending**
   - "Trending this week in your area"
   - "Popular summer cocktails"

---

## Summary

- **Use Recommended Cocktails** when you want quick, free, taste-based suggestions
- **Use AI Recommendations** when you want smart, context-aware suggestions based on what you can make right now
- Both systems complement each other to provide comprehensive cocktail discovery
