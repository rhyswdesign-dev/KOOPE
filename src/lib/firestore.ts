import { db, auth } from '../config/firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDocs, getDoc } from 'firebase/firestore';
import { log } from './logger';

export interface Recipe {
  id?: string;
  title?: string;
  sourceUrl?: string;
  imageUrl?: string;
  tags?: string[];
  folder?: string;
  createdAt?: any;
  updatedAt?: any;
  userId?: string;
  aiFormatted?: boolean;
  aiFormattedData?: any;
}

export interface RecipeFolder {
  id?: string;
  name: string;
  userId: string;
  createdAt?: any;
  updatedAt?: any;
}

export async function createRecipe(recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to create recipes');
  }

  // Filter out undefined values to prevent Firestore errors
  const cleanedData = Object.fromEntries(
    Object.entries(recipeData).filter(([_, value]) => value !== undefined)
  );

  const recipe: Omit<Recipe, 'id'> = {
    ...cleanedData,
    userId: user.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'recipes'), recipe);
  return docRef.id;
}

export async function getRecipeById(recipeId: string): Promise<Recipe | null> {
  try {
    const recipeRef = doc(db, 'recipes', recipeId);
    const docSnap = await getDoc(recipeRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Recipe;
    }

    return null;
  } catch (error) {
    log.error('Firestore', 'Error getting recipe by ID', error, { recipeId });
    return null;
  }
}

export async function getUserRecipes(userId?: string) {
  const targetUserId = userId || auth.currentUser?.uid;
  if (!targetUserId) {
    throw new Error('User ID is required');
  }

  const q = query(
    collection(db, 'recipes'),
    where('userId', '==', targetUserId)
  );

  const querySnapshot = await getDocs(q);
  const recipes = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Recipe[];

  // Sort by createdAt in memory to avoid needing composite index
  return recipes.sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime; // desc order
  });
}

export function subscribeToUserRecipes(
  callback: (recipes: Recipe[]) => void,
  userId?: string
) {
  const targetUserId = userId || auth.currentUser?.uid;
  if (!targetUserId) {
    throw new Error('User ID is required');
  }

  const q = query(
    collection(db, 'recipes'),
    where('userId', '==', targetUserId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (querySnapshot) => {
    const recipes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Recipe[];
    callback(recipes);
  });
}

export async function updateRecipe(recipeId: string, updates: Partial<Recipe>) {
  const recipeRef = doc(db, 'recipes', recipeId);
  await updateDoc(recipeRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRecipe(recipeId: string) {
  const recipeRef = doc(db, 'recipes', recipeId);
  await deleteDoc(recipeRef);
}

// Recipe folder management
export async function createFolder(folderData: Omit<RecipeFolder, 'id' | 'createdAt' | 'updatedAt'>) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to create folders');
  }

  const folder: Omit<RecipeFolder, 'id'> = {
    ...folderData,
    userId: user.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'recipe_folders'), folder);
  return docRef.id;
}

export async function getUserFolders(userId?: string) {
  const targetUserId = userId || auth.currentUser?.uid;
  if (!targetUserId) {
    throw new Error('User ID is required');
  }

  const q = query(
    collection(db, 'recipe_folders'),
    where('userId', '==', targetUserId)
  );

  const querySnapshot = await getDocs(q);
  const folders = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as RecipeFolder[];

  // Sort by createdAt in memory to avoid needing composite index
  return folders.sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime; // desc order
  });
}

export async function updateFolder(folderId: string, updates: Partial<RecipeFolder>) {
  const folderRef = doc(db, 'recipe_folders', folderId);
  await updateDoc(folderRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteFolder(folderId: string) {
  const folderRef = doc(db, 'recipe_folders', folderId);
  await deleteDoc(folderRef);
}