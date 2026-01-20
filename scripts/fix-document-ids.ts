// Fix missing document IDs in Firebase
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

async function fixDocumentIds() {
  console.log('🔧 Starting document ID fix...');
  
  try {
    // Get all master applications
    const mastersSnapshot = await getDocs(collection(db, 'masters'));
    let fixedCount = 0;
    
    for (const docSnap of mastersSnapshot.docs) {
      const data = docSnap.data();
      
      if (data.documents && Array.isArray(data.documents)) {
        let needsUpdate = false;
        
        // Check if any document is missing ID
        const fixedDocuments = data.documents.map((item: any) => {
          if (!item.id) {
            needsUpdate = true;
            return {
              ...item,
              id: crypto.randomUUID()
            };
          }
          return item;
        });
        
        // Update if needed
        if (needsUpdate) {
          await updateDoc(doc(db, 'masters', docSnap.id), {
            documents: fixedDocuments,
            updatedAt: new Date().toISOString()
          });
          fixedCount++;
          console.log(`✅ Fixed: ${data.university} - ${data.program}`);
        }
      }
    }
    
    console.log(`\n🎉 Done! Fixed ${fixedCount} applications.`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixDocumentIds();
