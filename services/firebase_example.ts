import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// INSTRUCTIONS:
// 1. Copy this file to 'firebase.ts'
// 2. Replace the placeholder values with your actual Firebase config
// 3. Never commit firebase.ts to GitHub

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_AUTH_DOMAIN_HERE",
  projectId: "YOUR_PROJECT_ID_HERE",
  storageBucket: "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
  appId: "YOUR_APP_ID_HERE"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);