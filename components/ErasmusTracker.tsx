import React, { useState, useEffect } from 'react';
import { ErasmusInternship, Priority, ErasmusStatus } from '../types';
import { erasmusService } from '../services/db';
import { PriorityBadge, Card, PageHeader, Modal, Input, Select, TextArea, StatusBadge } from './Shared';
import { Plus, Trash2, Globe, Banknote } from 'lucide-react';

const ErasmusTracker = () => {
  const [items, setItems] = useState<ErasmusInternship[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<ErasmusInternship>>({});

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = erasmusService.subscribe(setItems);
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    const baseItem: Omit<ErasmusInternship, 'id'> = {
      company: editingItem.company || 'Unknown',
      role: editingItem.role || 'Intern',
      location: editingItem.location || '',
      status: editingItem.status || ErasmusStatus.APPLIED,
      priority: editingItem.priority || Priority.MEDIUM,
      contactPerson: editingItem.contactPerson || '',
      contactNotes: editingItem.contactNotes || '',
      visaRequired: editingItem.visaRequired || false,
      grantAmount: editingItem.grantAmount || '',
      createdAt: editingItem.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingItem.id) {
      await erasmusService.update(editingItem.id, baseItem);
    } else {
      await erasmusService.add(baseItem);
    }
    setIsModalOpen(false);
    setEditingItem({});
  };

  const deleteItem = async (id: string) => {
    if(confirm('Delete internship?')) {
      await erasmusService.delete(id);
    }
  };

  return (
    <div className="p-4 md:p-8 animate-in fade-in">
      <PageHeader 
        title="Erasmus Internships" 
        action={
          <button 
            onClick={() => { setEditingItem({}); setIsModalOpen(true); }}
            className="bg-primary hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <Plus size={16} /> Add Internship
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(item => (
          <Card key={item.id}>
             <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-lg text-white">{item.company}</h3>
                <p className="text-slate-400 text-sm">{item.role}</p>
              </div>
              <PriorityBadge priority={item.priority} />
            </div>

            <div className="flex gap-2 mb-3">
               <StatusBadge status={item.status} color="emerald" />
               {item.visaRequired && <span className="text-xs border border-orange-500/50 bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded">Visa Req</span>}
            </div>

            <div className="space-y-1 text-sm text-slate-400">
               <div className="flex items-center gap-2"><Globe size={14} /> {item.location}</div>
               {item.grantAmount && <div className="flex items-center gap-2 text-green-400"><Banknote size={14} /> Grant: {item.grantAmount}</div>}
               {item.contactPerson && <div className="text-xs mt-2 italic border-l-2 border-slate-600 pl-2">Contact: {item.contactPerson}</div>}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700 flex justify-end gap-2">
              <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="text-slate-400 hover:text-white text-xs uppercase font-semibold">Edit</button>
              <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
            </div>
          </Card>
        ))}
        {items.length === 0 && <div className="col-span-full text-center text-slate-500 py-10">No internships tracked.</div>}
      </div>

       <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Erasmus Internship">
        <Input label="Company" value={editingItem.company || ''} onChange={e => setEditingItem({...editingItem, company: e.target.value})} />
        <Input label="Role" value={editingItem.role || ''} onChange={e => setEditingItem({...editingItem, role: e.target.value})} />
        <Input label="Location" value={editingItem.location || ''} onChange={e => setEditingItem({...editingItem, location: e.target.value})} />
        
        <div className="grid grid-cols-2 gap-4">
          <Select 
            label="Status" 
            value={editingItem.status || ErasmusStatus.APPLIED}
            onChange={e => setEditingItem({...editingItem, status: e.target.value as ErasmusStatus})}
            options={Object.values(ErasmusStatus).map(v => ({ value: v, label: v }))}
          />
          <Select 
            label="Priority" 
            value={editingItem.priority || Priority.MEDIUM}
            onChange={e => setEditingItem({...editingItem, priority: e.target.value as Priority})}
            options={Object.values(Priority).map(v => ({ value: v, label: v }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
           <Input label="Grant Amount" value={editingItem.grantAmount || ''} onChange={e => setEditingItem({...editingItem, grantAmount: e.target.value})} />
           <Select 
            label="Visa Required" 
            value={editingItem.visaRequired ? 'true' : 'false'}
            onChange={e => setEditingItem({...editingItem, visaRequired: e.target.value === 'true'})}
            options={[{value:'true', label:'Yes'}, {value:'false', label:'No'}]}
          />
        </div>
        <TextArea label="Contact Notes" value={editingItem.contactNotes || ''} onChange={e => setEditingItem({...editingItem, contactNotes: e.target.value})} />
        
        <div className="mt-4 flex justify-end">
          <button onClick={handleSave} className="bg-primary text-white px-4 py-2 rounded-lg font-medium">Save Internship</button>
        </div>
      </Modal>
    </div>
  );
};

export default ErasmusTracker;