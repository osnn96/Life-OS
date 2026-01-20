import React, { useState, useEffect } from 'react';
import { MasterApplication, Priority, MasterAppType, EnglishReq, DocumentItem } from '../types';
import { masterService } from '../services/db';
import { PriorityBadge, Card, PageHeader, Modal, Input, Select, TextArea } from './Shared';
import { Plus, Trash2, BookOpen, CheckCircle, Circle, MapPin, Mail } from 'lucide-react';

const MasterTracker = () => {
  const [apps, setApps] = useState<MasterApplication[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Partial<MasterApplication>>({});

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = masterService.subscribe(setApps);
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    const baseApp: Omit<MasterApplication, 'id'> = {
      university: editingApp.university || 'Unknown Uni',
      program: editingApp.program || 'Unknown Program',
      location: editingApp.location || '',
      type: editingApp.type || MasterAppType.NON_SCHOLARSHIP,
      deadline: editingApp.deadline || '',
      priority: editingApp.priority || Priority.MEDIUM,
      englishReq: editingApp.englishReq || EnglishReq.NONE,
      probability: editingApp.probability || 50,
      documents: editingApp.documents || [
        { name: 'CV', isReady: false }, 
        { name: 'Transcript', isReady: false },
        { name: 'Motivation Letter', isReady: false }
      ],
      professorName: editingApp.professorName || '',
      professorEmail: editingApp.professorEmail || '',
      professorContacted: editingApp.professorContacted || false,
      contactBoxOpen: editingApp.contactBoxOpen || false,
      notes: editingApp.notes || '',
      createdAt: editingApp.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingApp.id) {
      await masterService.update(editingApp.id, baseApp);
    } else {
      await masterService.add(baseApp);
    }
    setIsModalOpen(false);
    setEditingApp({});
  };

  const toggleDoc = async (app: MasterApplication, docIndex: number) => {
    const newDocs = [...app.documents];
    newDocs[docIndex].isReady = !newDocs[docIndex].isReady;
    await masterService.update(app.id, { documents: newDocs });
  };

  const deleteApp = async (id: string) => {
    if(confirm('Delete application?')) {
      await masterService.delete(id);
    }
  };

  return (
    <div className="p-4 md:p-8 animate-in fade-in">
      <PageHeader 
        title="Master's Degree Applications" 
        action={
          <button 
            onClick={() => { setEditingApp({}); setIsModalOpen(true); }}
            className="bg-primary hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <Plus size={16} /> Add Application
          </button>
        }
      />

      <div className="space-y-4">
        {apps.map(app => (
          <Card key={app.id} className="flex flex-col md:flex-row gap-6">
            {/* Left: Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {app.university}
                    <PriorityBadge priority={app.priority} />
                  </h3>
                  <p className="text-blue-400 font-medium">{app.program}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm text-slate-400 mt-2">
                <span className="flex items-center gap-1"><MapPin size={14}/> {app.location}</span>
                <span className="flex items-center gap-1 text-slate-200 bg-slate-800 px-2 rounded">Type: {app.type}</span>
                <span className="text-orange-300">Deadline: {app.deadline || 'N/A'}</span>
                <span>Prob: {app.probability}%</span>
              </div>

              {/* Professor Contact */}
              {(app.professorName) && (
                <div className="mt-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-slate-300">Prof. {app.professorName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${app.professorContacted ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {app.professorContacted ? 'Contacted' : 'Not Contacted'}
                    </span>
                  </div>
                  {app.professorEmail && <div className="text-slate-500 flex items-center gap-1"><Mail size={12}/> {app.professorEmail}</div>}
                </div>
              )}
            </div>

            {/* Right: Checklist */}
            <div className="w-full md:w-64 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Documents</h4>
              <div className="space-y-2">
                {app.documents.map((doc, idx) => (
                  <div key={idx} onClick={() => toggleDoc(app, idx)} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 p-1 rounded transition-colors">
                    {doc.isReady ? <CheckCircle size={16} className="text-green-500"/> : <Circle size={16} className="text-slate-600"/>}
                    <span className={`text-sm ${doc.isReady ? 'text-slate-400 line-through' : 'text-slate-300'}`}>{doc.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 justify-start border-l border-slate-700 pl-4">
              <button onClick={() => { setEditingApp(app); setIsModalOpen(true); }} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-200">
                Edit
              </button>
              <button onClick={() => deleteApp(app.id)} className="p-2 bg-red-900/20 hover:bg-red-900/40 rounded text-red-400">
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
        {apps.length === 0 && <div className="text-center text-slate-500 py-10">No applications tracked.</div>}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Master's Application">
        <Input label="University" value={editingApp.university || ''} onChange={e => setEditingApp({...editingApp, university: e.target.value})} />
        <Input label="Program" value={editingApp.program || ''} onChange={e => setEditingApp({...editingApp, program: e.target.value})} />
        
        <div className="grid grid-cols-2 gap-4">
          <Input label="Location" value={editingApp.location || ''} onChange={e => setEditingApp({...editingApp, location: e.target.value})} />
          <Input label="Deadline" type="date" value={editingApp.deadline || ''} onChange={e => setEditingApp({...editingApp, deadline: e.target.value})} />
        </div>

        <div className="grid grid-cols-2 gap-4">
           <Select 
            label="Type" 
            value={editingApp.type || MasterAppType.NON_SCHOLARSHIP} 
            onChange={e => setEditingApp({...editingApp, type: e.target.value as MasterAppType})}
            options={Object.values(MasterAppType).map(v => ({ value: v, label: v }))}
          />
          <Select 
            label="Priority" 
            value={editingApp.priority || Priority.MEDIUM}
            onChange={e => setEditingApp({...editingApp, priority: e.target.value as Priority})}
            options={Object.values(Priority).map(v => ({ value: v, label: v }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select 
             label="English Req" 
             value={editingApp.englishReq || EnglishReq.NONE} 
             onChange={e => setEditingApp({...editingApp, englishReq: e.target.value as EnglishReq})}
             options={Object.values(EnglishReq).map(v => ({ value: v, label: v }))}
           />
           <Input label="Probability Score (%)" type="number" value={editingApp.probability || 0} onChange={e => setEditingApp({...editingApp, probability: parseInt(e.target.value)})} />
        </div>
        
        <hr className="border-slate-700 my-4" />
        <h4 className="text-sm font-bold text-white mb-2">Professor Contact Info</h4>
        <div className="grid grid-cols-2 gap-4">
           <Input label="Name" value={editingApp.professorName || ''} onChange={e => setEditingApp({...editingApp, professorName: e.target.value})} />
           <Input label="Email" value={editingApp.professorEmail || ''} onChange={e => setEditingApp({...editingApp, professorEmail: e.target.value})} />
        </div>
         <Select 
            label="Contact Status" 
            value={editingApp.professorContacted ? 'true' : 'false'}
            onChange={e => setEditingApp({...editingApp, professorContacted: e.target.value === 'true'})}
            options={[{value: 'true', label: 'Contacted'}, {value: 'false', label: 'Not Yet'}]}
          />

        <div className="mt-4 flex justify-end">
          <button onClick={handleSave} className="bg-primary text-white px-4 py-2 rounded-lg font-medium">Save Application</button>
        </div>
      </Modal>
    </div>
  );
};

export default MasterTracker;