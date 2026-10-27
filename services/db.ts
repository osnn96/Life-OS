import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  where,
  getDocs,
  Timestamp,
  DocumentData,
  QuerySnapshot,
  deleteField
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Task, 
  JobApplication, 
  MasterApplication, 
  ErasmusInternship,
  UsefulLink, 
  ScholarshipProgram,
  Note,
  FullTaskPage,
  FullTaskSection,
  FullTaskItem,
  Priority, 
  JobStatus, 
  MasterAppType, 
  EnglishReq,
  ErasmusStatus
} from '../types';

// Collection names
const COLLECTIONS = {
  TASKS: 'tasks',
  FULL_TASKS: 'full_tasks',
  JOBS: 'jobs',
  MASTERS: 'masters',
  ERASMUS: 'erasmus',
  LINKS: 'links',
  SCHOLARSHIP_PROGRAMS: 'scholarship_programs',
  NOTES: 'notes',
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
        ...doc.data(),
        id: doc.id
      } as T));
      callback(items);
    }, (error) => {
      console.error(`Error subscribing to ${this.collectionName}:`, error);
    });

    return unsubscribe;
  }

  private deepCleanForAdd(obj: any): any {
    if (obj === null || obj === undefined) {
      return undefined;
    }
    if (Array.isArray(obj)) {
      return obj
        .map(item => this.deepCleanForAdd(item))
        .filter(item => item !== undefined);
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      Object.entries(obj).forEach(([key, value]) => {
        const cleanedValue = this.deepCleanForAdd(value);
        if (cleanedValue !== undefined && cleanedValue !== null && cleanedValue !== '') {
          cleaned[key] = cleanedValue;
        }
      });
      return cleaned;
    }
    if (obj === '') {
      return undefined;
    }
    return obj;
  }

  private deepCleanForUpdate(obj: any): any {
    if (obj === null || obj === undefined) {
      return deleteField();
    }
    if (Array.isArray(obj)) {
      const cleanedArray = obj
        .map(item => {
          if (item === null || item === undefined || item === '') {
            return undefined;
          }
          if (typeof item === 'object') {
            return this.deepCleanForUpdate(item);
          }
          return item;
        })
        .filter(item => item !== undefined);
      return cleanedArray;
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      Object.entries(obj).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          cleaned[key] = deleteField();
        } else if (typeof value === 'object') {
          cleaned[key] = this.deepCleanForUpdate(value);
        } else {
          cleaned[key] = value;
        }
      });
      return cleaned;
    }
    if (obj === '') {
      return deleteField();
    }
    return obj;
  }

  // Add new item with userId
  async add(item: Omit<T, 'id'>, userId: string): Promise<any> {
    try {
      const { id: _ignoreId, ...cleanItem } = item as any;
      const cleaned = this.deepCleanForAdd(cleanItem);
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...cleaned,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return { id: docRef.id };
    } catch (error) {
      console.error(`Error adding to ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Update existing item
  async update(id: string, updates: Partial<T>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      
      // Process updates: convert undefined values to deleteField()
      const processedUpdates: any = { updatedAt: new Date().toISOString() };
      
      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'updatedAt') {
          return;
        }
        if (value === undefined || value === null || value === '') {
          processedUpdates[key] = deleteField();
        } else if (typeof value === 'object') {
          processedUpdates[key] = this.deepCleanForUpdate(value);
        } else {
          processedUpdates[key] = value;
        }
      });
      
      await updateDoc(docRef, processedUpdates);
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
export const fullTaskService = new FirestoreService<FullTaskPage>(COLLECTIONS.FULL_TASKS);
export const jobService = new FirestoreService<JobApplication>(COLLECTIONS.JOBS);
export const masterService = new FirestoreService<MasterApplication>(COLLECTIONS.MASTERS);
export const erasmusService = new FirestoreService<ErasmusInternship>(COLLECTIONS.ERASMUS);
export const linkService = new FirestoreService<UsefulLink>(COLLECTIONS.LINKS);
export const scholarshipService = new FirestoreService<ScholarshipProgram>(COLLECTIONS.SCHOLARSHIP_PROGRAMS);
export const noteService = new FirestoreService<Note>(COLLECTIONS.NOTES);

/**
 * Sync completion status from Tasks to Full-Task board
 * When a task is marked done/undone in the Task manager:
 * - If it's a recurring task: keep it on Full-Task (do NOT mark completed)
 * - If it's a non-recurring task: update the linked item's isCompleted in Full-Task
 */
export const syncTaskCompletionToFullTask = async (
  userId: string,
  taskId: string,
  isCompleted: boolean,
  fullTaskSourceId?: string,
  newScheduledTaskId?: string,
  isRecurringTask?: boolean
): Promise<void> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.FULL_TASKS),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);

    for (const pageDoc of snapshot.docs) {
      const pageData = pageDoc.data() as FullTaskPage;
      if (!pageData.sections || !Array.isArray(pageData.sections)) continue;

      let pageModified = false;
      const updatedSections = pageData.sections.map((section: FullTaskSection) => {
        let sectionModified = false;
        const updatedItems = (section.items || []).map((item: FullTaskItem) => {
          const isTarget =
            (fullTaskSourceId && item.id === fullTaskSourceId) ||
            (item.scheduledTaskId && item.scheduledTaskId === taskId);

          if (!isTarget) return item;

          // If either item or the task itself is recurring:
          // Keep on Full-Task board without marking completed
          if (item.isRecurring || isRecurringTask) {
            if (newScheduledTaskId && item.scheduledTaskId !== newScheduledTaskId) {
              sectionModified = true;
              pageModified = true;
              return { ...item, scheduledTaskId: newScheduledTaskId };
            }
            return item;
          }

          // For non-recurring items:
          // Sync completion status to Full-Task item
          if (item.isCompleted !== isCompleted) {
            sectionModified = true;
            pageModified = true;
            return { ...item, isCompleted };
          }

          return item;
        });

        return sectionModified ? { ...section, items: updatedItems } : section;
      });

      if (pageModified) {
        await fullTaskService.update(pageDoc.id, {
          sections: updatedSections,
          updatedAt: new Date().toISOString()
        });
      }
    }
  } catch (err) {
    console.error('Error syncing task completion to Full-Task:', err);
  }
};

// Optional: Seed data for testing (run manually in console if needed)
export const seedData = async (userId: string = 'demo-user') => {
  try {
    await taskService.add({
      title: 'Update CV for AI Roles',
      priority: Priority.HIGH,
      isDaily: true,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Omit<Task, 'id'>, userId);

    await jobService.add({
      company: 'TechCorp',
      position: 'Frontend Engineer',
      status: JobStatus.APPLIED,
      priority: Priority.HIGH,
      link: 'https://linkedin.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Omit<JobApplication, 'id'>, userId);

    console.log('Seed data added successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};