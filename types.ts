// Enums
export enum Priority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum JobStatus {
  FOUND = 'Found Link',
  APPLIED = 'Applied',
  HR_RESEARCH = 'HR/Lead Research',
  CONTACT_SENT = 'Contact Request Sent',
  MESSAGE_SENT = 'Message Sent',
  ASSESSMENT = 'Assessment',
  RESULT = 'Result',
  REJECTED = 'Rejected',
}

export enum MasterAppType {
  ERASMUS_MUNDUS = 'Erasmus Mundus',
  SCHOLARSHIP = 'Scholarship',
  NON_SCHOLARSHIP = 'Non-Scholarship',
}

export enum EnglishReq {
  MOI = 'MOI Accepted',
  IELTS = 'IELTS Only',
  TOEFL = 'TOEFL',
  NONE = 'None',
}

export enum ErasmusStatus {
  APPLIED = 'Applied',
  WAITING = 'Waiting',
  ACCEPTED = 'Accepted',
}

export enum LinkCategory {
  DATA_SCIENCE = 'Data Science',
  AI = 'AI',
  FRONTEND = 'Frontend',
  BACKEND = 'Backend',
  AI_SERVICES = 'AI Services',
  TOOLS = 'Tools',
  LEARNING = 'Learning',
  OTHER = 'Other',
}

// Interfaces

export interface BaseItem {
  id: string;
  userId: string; // User who owns this item
  createdAt: string;
  updatedAt: string;
  priority: Priority;
}

export interface Task extends BaseItem {
  title: string;
  description?: string;
  isDaily: boolean; // True = Daily View, False = Backlog
  isCompleted: boolean;
  dueDate?: string;
  overdueFromDaily?: boolean; // Marked when moved from daily to backlog due to overdue
  isRecurring?: boolean;
  recurrenceType?: 'daily' | 'weekly' | 'monthly' | 'weekdays'; // weekdays = specific days of week
  recurrenceDays?: number[]; // For weekdays: [0,1,2,3,4,5,6] = Sun-Sat
  lastCompletedDate?: string; // Track when last completed for recurring tasks
  order?: number; // For drag & drop ordering
}

export interface JobApplication extends BaseItem {
  company: string;
  position: string;
  link?: string;
  status: JobStatus;
  hrContactName?: string;
  hrContactLink?: string;
  notes?: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  isCompleted: boolean;
  isRequired: boolean;
  notes?: string;
}

export interface MasterApplication extends BaseItem {
  university: string;
  program: string;
  location: string;
  type: MasterAppType;
  deadline: string;
  documents: DocumentItem[];
  englishReq: EnglishReq;
  probability: number; // 0-100
  professorName?: string;
  professorEmail?: string;
  professorContacted: boolean;
  contactBoxOpen: boolean; // Have we communicated?
  notes?: string;
  isDone?: boolean; // Whether application is completed (accepted/rejected)
  isRejected?: boolean; // Whether application was rejected
}

export interface ErasmusInternship extends BaseItem {
  company: string;
  role: string;
  location: string;
  contactPerson?: string;
  contactNotes?: string;
  status: ErasmusStatus;
  visaRequired: boolean;
  grantAmount?: string;
}

export interface UsefulLink {
  id: string;
  userId: string;
  title: string;
  url: string;
  category: LinkCategory;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// App View Type
export type AppView = 'DASHBOARD' | 'TASKS' | 'JOBS' | 'MASTERS' | 'ERASMUS' | 'LINKS';