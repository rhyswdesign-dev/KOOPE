import { db, auth, storage } from '../config/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { log } from './logger';

export async function testWrite() {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('User not authenticated');
  }

  try {
    const docRef = await addDoc(collection(db, "users", uid, "debug"), {
      ok: true,
      at: serverTimestamp(),
      message: "Firestore write test successful",
    });
    log.info('TestFirestore', 'Test document written', { docId: docRef.id });
    return docRef.id;
  } catch (error) {
    log.error('TestFirestore', 'Error writing test document', error);
    throw error;
  }
}

export async function testStorage() {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('User not authenticated');
  }

  try {
    const storageRef = ref(storage, `users/${uid}/hello.txt`);
    const blob = new Blob([`Hi ${uid} - Storage test at ${new Date().toISOString()}`], { type: "text/plain" });

    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);

    log.info('TestFirestore', 'File uploaded successfully', { url });
    return url;
  } catch (error) {
    log.error('TestFirestore', 'Error uploading file', error);
    throw error;
  }
}