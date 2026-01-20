const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc, setDoc, query, limit } = require('firebase/firestore');
require('dotenv').config();

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearCollection(colName) {
  const colRef = collection(db, colName);
  let total = 0;
  while (true) {
    const q = query(colRef, limit(500));
    const snapshot = await getDocs(q);
    if (snapshot.empty) break;
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, colName, d.id));
      total += 1;
      if (total % 100 === 0) console.log(`${total} deleted so far...`);
    }
  }
  return total;
}

async function resetCounter(counterId) {
  const counterRef = doc(db, 'counters', counterId);
  await setDoc(counterRef, { seq: 0 }, { merge: true });
}

async function main() {
  try {
    console.log('Starting invoice cleanup...');
    const deleted = await clearCollection('invoices');
    console.log(`Deleted ${deleted} invoice documents.`);

    // Reset known counters used by the app
    const counters = ['invoices_b2c', 'invoices_b2b', 'invoices'];
    for (const c of counters) {
      try {
        await resetCounter(c);
        console.log(`Reset counter ${c}`);
      } catch (e) {
        console.warn(`Could not reset counter ${c}:`, e.message || e);
      }
    }

    console.log('Invoice cleanup completed. You can now create new invoices starting from sequence 1.');
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

main();
