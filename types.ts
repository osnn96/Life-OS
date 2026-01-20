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

// Interfaces

export interface BaseItem {
  id: string;
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
  name: string;
  isReady: boolean;
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

export type AppView = 'DASHBOARD' | 'TASKS' | 'JOBS' | 'MASTERS' | 'ERASMUS';