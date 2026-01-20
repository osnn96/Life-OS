// One-time migration script to update existing documents in Firebase
// Run this once to migrate old data structure to new structure

import { db } from '../services/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

async function migrateDocuments() {
  console.log('🔄 Starting document migration...');
  
  const mastersRef = collection(db, 'masters');
  const snapshot = await getDocs(mastersRef);
  
  let updatedCount = 0;
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    
    if (data.documents && Array.isArray(data.documents)) {
      const migratedDocs = data.documents.map((doc: any) => ({
        id: doc.id || crypto.randomUUID(),
        name: doc.name,
        isCompleted: doc.isCompleted !== undefined ? doc.isCompleted : doc.isReady || false,
        isRequired: doc.isRequired !== undefined ? doc.isRequired : true,
        notes: doc.notes || ''
      }));
      
      await updateDoc(doc(db, 'masters', docSnap.id), {
        documents: migratedDocs,
        updatedAt: new Date().toISOString()
      });
      
      updatedCount++;
      console.log(`✅ Updated: ${data.university}`);
    }
  }
  
  console.log(`\n✨ Migration complete! Updated ${updatedCount} applications.`);
}

// Run migration
migrateDocuments().catch(console.error);
