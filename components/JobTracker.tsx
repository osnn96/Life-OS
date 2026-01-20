import React, { useState, useEffect } from 'react';
import { JobApplication, Priority, JobStatus } from '../types';
import { jobService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { PriorityBadge, Card, PageHeader, Modal, Input, Select, TextArea, StatusBadge } from './Shared';
import { Plus, Trash2, ExternalLink, RefreshCw } from 'lucide-react';

const JobTracker = () => {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Partial<JobApplication>>({});

  // Subscribe to real-time updates with userId
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = jobService.subscribe(currentUser.uid, setJobs);
    return () => unsubscribe();
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;

    const baseJob: Omit<JobApplication, 'id'> = {
      company: editingJob.company || 'Unknown Company',
      position: editingJob.position || 'Unknown Role',
      priority: editingJob.priority || Priority.MEDIUM,
      status: editingJob.status || JobStatus.FOUND,
      link: editingJob.link || '',
      hrContactName: editingJob.hrContactName || '',
      hrContactLink: editingJob.hrContactLink || '',
      notes: editingJob.notes || '',
      userId: currentUser.uid,
      createdAt: editingJob.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingJob.id) {
      await jobService.update(editingJob.id, baseJob);
    } else {
      await jobService.add(baseJob, currentUser.uid);
    }
    
    setIsModalOpen(false);
    setEditingJob({});
  };

  const deleteJob = async (id: string) => {
    if(confirm('Remove this application?')) {
      await jobService.delete(id);
    }
  };

  return (
    <div className="p-4 md:p-8 animate-in fade-in">
      <PageHeader 
        title="Job Applications" 
        action={
          <button 
            onClick={() => { setEditingJob({}); setIsModalOpen(true); }}
            className="bg-primary hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <Plus size={16} /> Add Job
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map(job => (
          <Card key={job.id} className="relative group">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-lg text-white">{job.company}</h3>
                <p className="text-slate-400 text-sm">{job.position}</p>
              </div>
              <PriorityBadge priority={job.priority} />
            </div>
            
            <div className="my-3 space-y-2">
              <div className="flex justify-between items-center">
                <StatusBadge status={job.status} color="purple" />
                <span className="text-xs text-slate-500">{new Date(job.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center">
              {job.link && (
                <a href={job.link} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs">
                  <ExternalLink size={12} /> View Job
                </a>
              )}
               <div className="flex gap-2">
                <button onClick={() => { setEditingJob(job); setIsModalOpen(true); }} className="text-slate-400 hover:text-white text-xs uppercase font-semibold">Edit</button>
                <button onClick={() => deleteJob(job.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
              </div>
            </div>
          </Card>
        ))}
        {jobs.length === 0 && <div className="col-span-full text-center text-slate-500 py-10">No job applications tracked yet.</div>}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingJob.id ? "Edit Application" : "New Job Application"}>
        <Input label="Company" value={editingJob.company || ''} onChange={e => setEditingJob({...editingJob, company: e.target.value})} />
        <Input label="Position" value={editingJob.position || ''} onChange={e => setEditingJob({...editingJob, position: e.target.value})} />
        <Input label="Job Link" value={editingJob.link || ''} onChange={e => setEditingJob({...editingJob, link: e.target.value})} />
        
        <div className="grid grid-cols-2 gap-4">
          <Select 
            label="Priority" 
            value={editingJob.priority || Priority.MEDIUM}
            onChange={e => setEditingJob({...editingJob, priority: e.target.value as Priority})}
            options={Object.values(Priority).map(v => ({ value: v, label: v }))}
          />
          <Select 
            label="Current Status" 
            value={editingJob.status || JobStatus.FOUND}
            onChange={e => setEditingJob({...editingJob, status: e.target.value as JobStatus})}
            options={Object.values(JobStatus).map(v => ({ value: v, label: v }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
           <Input label="HR Name" value={editingJob.hrContactName || ''} onChange={e => setEditingJob({...editingJob, hrContactName: e.target.value})} />
           <Input label="HR Link/Email" value={editingJob.hrContactLink || ''} onChange={e => setEditingJob({...editingJob, hrContactLink: e.target.value})} />
        </div>

        <TextArea label="Notes" value={editingJob.notes || ''} onChange={e => setEditingJob({...editingJob, notes: e.target.value})} />
        
        <div className="mt-4 flex justify-end">
          <button onClick={handleSave} className="bg-primary text-white px-4 py-2 rounded-lg font-medium">Save Job</button>
        </div>
      </Modal>
    </div>
  );
};

export default JobTracker;