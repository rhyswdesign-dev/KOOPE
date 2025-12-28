/**
 * Firebase Firestore Compatibility Layer (@firebase/firestore)
 *
 * This module provides stub implementations of Firebase Firestore functions
 * to maintain compatibility with legacy code while using Supabase as the backend.
 */

/**
 * Get Firestore instance stub
 */
export function getFirestore() {
  console.warn('[Firebase Compat] getFirestore() called - this is a stub. Use Supabase instead.');
  return null;
}

/**
 * Firestore document reference stub
 */
export function doc(...args: any[]) {
  console.warn('[Firebase Compat] doc() called - this is a stub. Use Supabase instead.');
  return {
    id: args[args.length - 1] || 'stub-doc',
    path: args.join('/'),
  };
}

/**
 * Get document stub
 */
export async function getDoc(docRef: any) {
  console.warn('[Firebase Compat] getDoc() called - this is a stub. Use Supabase instead.');
  return {
    exists: () => false,
    data: () => null,
    id: docRef?.id || 'stub',
  };
}

/**
 * Set document stub
 */
export async function setDoc(docRef: any, data: any, options?: any) {
  console.warn('[Firebase Compat] setDoc() called - this is a stub. Use Supabase instead.');
  return Promise.resolve();
}

/**
 * Update document stub
 */
export async function updateDoc(docRef: any, data: any) {
  console.warn('[Firebase Compat] updateDoc() called - this is a stub. Use Supabase instead.');
  return Promise.resolve();
}

/**
 * Increment field value stub
 */
export function increment(value: number) {
  console.warn('[Firebase Compat] increment() called - this is a stub. Use Supabase instead.');
  return { _increment: value };
}

/**
 * Array union stub
 */
export function arrayUnion(...elements: any[]) {
  console.warn('[Firebase Compat] arrayUnion() called - this is a stub. Use Supabase instead.');
  return { _arrayUnion: elements };
}

/**
 * Collection reference stub
 */
export function collection(...args: any[]) {
  console.warn('[Firebase Compat] collection() called - this is a stub. Use Supabase instead.');
  return {
    path: args.join('/'),
    id: args[args.length - 1] || 'stub-collection',
  };
}

/**
 * Add document stub
 */
export async function addDoc(collectionRef: any, data: any) {
  console.warn('[Firebase Compat] addDoc() called - this is a stub. Use Supabase instead.');
  return {
    id: 'stub-' + Date.now(),
    path: collectionRef.path + '/stub-' + Date.now(),
  };
}

/**
 * Query stub
 */
export function query(collectionRef: any, ...queryConstraints: any[]) {
  console.warn('[Firebase Compat] query() called - this is a stub. Use Supabase instead.');
  return {
    ...collectionRef,
    _constraints: queryConstraints,
  };
}

/**
 * Where clause stub
 */
export function where(field: string, operator: string, value: any) {
  console.warn('[Firebase Compat] where() called - this is a stub. Use Supabase instead.');
  return { _where: { field, operator, value } };
}

/**
 * Get documents stub
 */
export async function getDocs(query: any) {
  console.warn('[Firebase Compat] getDocs() called - this is a stub. Use Supabase instead.');
  return {
    docs: [],
    empty: true,
    size: 0,
    forEach: (callback: any) => {},
  };
}

/**
 * Delete document stub
 */
export async function deleteDoc(docRef: any) {
  console.warn('[Firebase Compat] deleteDoc() called - this is a stub. Use Supabase instead.');
  return Promise.resolve();
}

/**
 * Server timestamp stub
 */
export function serverTimestamp() {
  console.warn('[Firebase Compat] serverTimestamp() called - this is a stub. Use Supabase instead.');
  return new Date().toISOString();
}

/**
 * Order by stub
 */
export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  console.warn('[Firebase Compat] orderBy() called - this is a stub. Use Supabase instead.');
  return { _orderBy: { field, direction } };
}

/**
 * Limit stub
 */
export function limit(count: number) {
  console.warn('[Firebase Compat] limit() called - this is a stub. Use Supabase instead.');
  return { _limit: count };
}

/**
 * Array remove stub
 */
export function arrayRemove(...elements: any[]) {
  console.warn('[Firebase Compat] arrayRemove() called - this is a stub. Use Supabase instead.');
  return { _arrayRemove: elements };
}

/**
 * Timestamp stub
 */
export class Timestamp {
  static now() {
    console.warn('[Firebase Compat] Timestamp.now() called - this is a stub. Use Supabase instead.');
    return new Date();
  }

  static fromDate(date: Date) {
    console.warn('[Firebase Compat] Timestamp.fromDate() called - this is a stub. Use Supabase instead.');
    return date;
  }
}
