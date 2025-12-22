/**
 * Firebase Data Export Script
 *
 * USAGE:
 * 1. Download your Firebase service account key from:
 *    Firebase Console > Project Settings > Service Accounts > Generate New Private Key
 * 2. Save it as serviceAccountKey.json in this directory
 * 3. Run: node scripts/export-firebase-data.js
 *
 * This script exports all data from Firebase Firestore for migration to Supabase.
 * Data will be saved to the exports/ directory.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Check if service account key exists
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: serviceAccountKey.json not found!');
  console.error('Please download your Firebase service account key and save it as:');
  console.error(`  ${serviceAccountPath}`);
  console.error('\nDownload from: Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Create exports directory
const exportsDir = path.join(__dirname, '..', 'exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

/**
 * Export a Firestore collection to JSON
 */
async function exportCollection(collectionName, transformFn = null) {
  try {
    console.log(`\n📦 Exporting ${collectionName}...`);
    const snapshot = await db.collection(collectionName).get();

    const data = snapshot.docs.map(doc => {
      const docData = {
        id: doc.id,
        ...doc.data()
      };

      // Convert Firestore Timestamps to ISO strings
      Object.keys(docData).forEach(key => {
        if (docData[key] && typeof docData[key].toDate === 'function') {
          docData[key] = docData[key].toDate().toISOString();
        }
      });

      // Apply custom transformation if provided
      return transformFn ? transformFn(docData) : docData;
    });

    const filePath = path.join(exportsDir, `${collectionName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log(`✅ Exported ${data.length} documents to ${filePath}`);
    return data;
  } catch (error) {
    console.error(`❌ Error exporting ${collectionName}:`, error.message);
    return [];
  }
}

/**
 * Export subcollection data
 */
async function exportSubcollection(parentCollection, subcollectionName, transformFn = null) {
  try {
    console.log(`\n📦 Exporting ${parentCollection}/{id}/${subcollectionName}...`);

    const parentSnapshot = await db.collection(parentCollection).get();
    const allData = [];

    for (const parentDoc of parentSnapshot.docs) {
      const subcollectionSnapshot = await db
        .collection(parentCollection)
        .doc(parentDoc.id)
        .collection(subcollectionName)
        .get();

      subcollectionSnapshot.docs.forEach(doc => {
        const docData = {
          parentId: parentDoc.id,
          id: doc.id,
          ...doc.data()
        };

        // Convert Firestore Timestamps to ISO strings
        Object.keys(docData).forEach(key => {
          if (docData[key] && typeof docData[key].toDate === 'function') {
            docData[key] = docData[key].toDate().toISOString();
          }
        });

        allData.push(transformFn ? transformFn(docData) : docData);
      });
    }

    const filePath = path.join(exportsDir, `${parentCollection}_${subcollectionName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));

    console.log(`✅ Exported ${allData.length} documents to ${filePath}`);
    return allData;
  } catch (error) {
    console.error(`❌ Error exporting ${parentCollection}/{id}/${subcollectionName}:`, error.message);
    return [];
  }
}

/**
 * Main export function
 */
async function exportAllData() {
  console.log('🚀 Starting Firebase data export...\n');
  console.log(`Export directory: ${exportsDir}\n`);

  try {
    // Export main collections
    await exportCollection('users', (user) => {
      // Transform user data for Supabase profiles table
      return {
        id: user.id,
        display_name: user.displayName || null,
        bio: user.bio || null,
        featured_badges: user.featuredBadges || [],
        personalization_profile: user.personalizationProfile || null,
        created_at: user.createdAt || new Date().toISOString(),
        updated_at: user.updatedAt || new Date().toISOString()
      };
    });

    await exportCollection('recipes', (recipe) => {
      // Transform recipe data for Supabase
      return {
        id: recipe.id,
        user_id: recipe.userId || null,
        name: recipe.title || recipe.name || 'Untitled Recipe',
        description: recipe.description || '',
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        category: recipe.category || null,
        difficulty: recipe.difficulty || 'medium',
        prep_time: recipe.prepTime || recipe.prep_time || null,
        cook_time: recipe.cookTime || recipe.cook_time || null,
        servings: recipe.servings || 1,
        image_url: recipe.imageUrl || recipe.image_url || null,
        is_favorite: recipe.isFavorite || recipe.is_favorite || false,
        created_at: recipe.createdAt || new Date().toISOString(),
        updated_at: recipe.updatedAt || new Date().toISOString()
      };
    });

    await exportCollection('feedback', (feedback) => {
      // Transform feedback data for Supabase
      return {
        id: feedback.id,
        user_id: feedback.userId || 'anonymous',
        type: feedback.type || 'general',
        category: feedback.category || 'general',
        title: feedback.title || 'No title',
        description: feedback.description || feedback.message || '',
        rating: feedback.rating || null,
        email: feedback.email || null,
        device_info: feedback.deviceInfo || null,
        status: feedback.status || 'new',
        created_at: feedback.timestamp || feedback.createdAt || new Date().toISOString()
      };
    });

    // Export subcollections
    await exportSubcollection('users', 'preferences', (pref) => {
      // Transform user preferences for Supabase
      return {
        user_id: pref.parentId,
        analytics_consent: pref.analyticsConsent || false,
        marketing_consent: pref.marketingConsent || false,
        notifications_enabled: pref.notificationsEnabled !== false,
        preferences: {
          consent_version: pref.version || '1.0',
          ...pref
        },
        created_at: pref.timestamp || new Date().toISOString(),
        updated_at: pref.timestamp || new Date().toISOString()
      };
    });

    // Export challenges and user progress if they exist
    await exportCollection('challenges');
    await exportSubcollection('users', 'challengeProgress');

    console.log('\n✨ Export complete!');
    console.log(`\n📁 All data exported to: ${exportsDir}`);
    console.log('\n📝 Next steps:');
    console.log('1. Review the exported JSON files');
    console.log('2. Run the import script to load data into Supabase');
    console.log('3. Verify data integrity in Supabase Dashboard');

  } catch (error) {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  } finally {
    // Close Firebase connection
    await admin.app().delete();
  }
}

// Run the export
exportAllData();
