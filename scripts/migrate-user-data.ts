// Migration script to add userId to existing documents
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';

const COLLECTIONS = ['tasks', 'jobs', 'masters', 'erasmus'];

async function migrateData() {
  console.log('🚀 Starting migration...');
  
  // Get current logged in user
  const currentUser = auth.currentUser;
  
  if (!currentUser) {
    console.error('❌ No user logged in! Please login to the app first.');
    return;
  }

  const userId = currentUser.uid;
  console.log(`👤 User: ${currentUser.email}`);
  console.log(`🔑 User ID: ${userId}`);

  let totalUpdated = 0;

  for (const collectionName of COLLECTIONS) {
    console.log(`\n📂 Processing ${collectionName}...`);
    
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      let updatedInCollection = 0;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Only update if userId doesn't exist
        if (!data.userId) {
          await updateDoc(doc(db, collectionName, docSnap.id), {
            userId: userId,
            updatedAt: new Date().toISOString()
          });
          updatedInCollection++;
          console.log(`  ✅ Updated ${collectionName}/${docSnap.id}`);
        } else {
          console.log(`  ⏭️  Skipped ${collectionName}/${docSnap.id} (already has userId)`);
        }
      }

      totalUpdated += updatedInCollection;
      console.log(`📊 ${collectionName}: ${updatedInCollection} documents updated`);
    } catch (error) {
      console.error(`❌ Error processing ${collectionName}:`, error);
    }
  }

  console.log(`\n✨ Migration complete! Total documents updated: ${totalUpdated}`);
  console.log('🔄 Refresh the page to see your data!');
}

// Run migration
migrateData()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
