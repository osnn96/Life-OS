import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  where,
  Timestamp,
  DocumentData,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Task, 
  JobApplication, 
  MasterApplication, 
  ErasmusInternship, 
  Priority, 
  JobStatus, 
  MasterAppType, 
  EnglishReq,
  ErasmusStatus
} from '../types';

// Collection names
const COLLECTIONS = {
  TASKS: 'tasks',
  JOBS: 'jobs',
  MASTERS: 'masters',
  ERASMUS: 'erasmus',
};

// Generic Firestore Service with Real-time Updates and User Isolation
class FirestoreService<T extends { id: string; userId: string }> {
  private collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  // Subscribe to real-time updates for current user only
  subscribe(userId: string, callback: (items: T[]) => void): () => void {
    const q = query(
      collection(db, this.collectionName),
      where('userId', '==', userId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const items: T[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as T));
      callback(items);
    }, (error) => {
      console.error(`Error subscribing to ${this.collectionName}:`, error);
    });

    return unsubscribe;
  }

  // Add new item with userId
  async add(item: Omit<T, 'id'>, userId: string): Promise<void> {
    try {
      await addDoc(collection(db, this.collectionName), {
        ...item,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error adding to ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Update existing item
  async update(id: string, updates: Partial<T>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Delete item
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting from ${this.collectionName}:`, error);
      throw error;
    }
  }
}

// Instantiate services
export const taskService = new FirestoreService<Task>(COLLECTIONS.TASKS);
export const jobService = new FirestoreService<JobApplication>(COLLECTIONS.JOBS);
export const masterService = new FirestoreService<MasterApplication>(COLLECTIONS.MASTERS);
export const erasmusService = new FirestoreService<ErasmusInternship>(COLLECTIONS.ERASMUS);

// Optional: Seed data for testing (run manually in console if needed)
export const seedData = async () => {
  try {
    await taskService.add({
      title: 'Update CV for AI Roles',
      priority: Priority.HIGH,
      isDaily: true,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Omit<Task, 'id'>);

    await jobService.add({
      company: 'TechCorp',
      position: 'Frontend Engineer',
      status: JobStatus.APPLIED,
      priority: Priority.HIGH,
      link: 'https://linkedin.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Omit<JobApplication, 'id'>);

    console.log('Seed data added successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};