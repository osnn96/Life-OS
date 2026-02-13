import React, { useState, useEffect } from 'react';
import { MasterApplication, Priority, MasterAppType, EnglishReq, DocumentItem } from '../types';
import { masterService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { PriorityBadge, Card, PageHeader, Modal, Input, Select, TextArea } from './Shared';
import { Plus, Trash2, BookOpen, CheckCircle, Circle, MapPin, Mail, FileText, X, Check, Award, Globe, GraduationCap, ArrowLeft } from 'lucide-react';
import ScholarshipProgramsView from './ScholarshipProgramsView';
import CountriesView from './CountriesView';

type MasterViewType = 'SCHOLARSHIPS' | 'COUNTRIES' | 'APPLICATIONS' | null;

// Default document templates
const DEFAULT_DOCUMENTS: Omit<DocumentItem, 'id'>[] = [
  { name: 'CV', isCompleted: false, isRequired: true },
  { name: 'Transcript', isCompleted: false, isRequired: true },
  { name: 'Motivation Letter', isCompleted: false, isRequired: true },
  { name: 'Reference Letters', isCompleted: false, isRequired: false },
  { name: 'Language Certificate', isCompleted: false, isRequired: false },
];

const MasterTracker = () => {
  const { currentUser } = useAuth();
  const [view, setView] = useState<MasterViewType>(null);
  const [apps, setApps] = useState<MasterApplication[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<MasterApplication | null>(null);
  const [editingApp, setEditingApp] = useState<Partial<MasterApplication>>({});
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  // Helper function to extract country from location string
  const extractCountry = (location: string): string => {
    if (!location) return '';
    const parts = location.split(',').map(p => p.trim());
    return parts[parts.length - 1] || '';
  };

  // Subscribe to real-time updates with userId
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = masterService.subscribe(currentUser.uid, (apps) => {
      // Normalize documents: ensure all have unique IDs
      const normalizedApps = apps.map(app => ({
        ...app,
        documents: app.documents?.map(doc => ({
          ...doc,
          id: doc.id || crypto.randomUUID() // Add ID if missing
        })) || []
      }));
      setApps(normalizedApps);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Auto-migrate country field from location for existing apps
  useEffect(() => {
    if (!currentUser || apps.length === 0) return;

    const migrateCountries = async () => {
      const appsNeedingCountry = apps.filter(app => !app.country && app.location);
      
      if (appsNeedingCountry.length === 0) return;

      console.log(`Migrating country field for ${appsNeedingCountry.length} applications...`);

      for (const app of appsNeedingCountry) {
        const country = extractCountry(app.location || '');
        if (country) {
          try {
            await masterService.update(app.id, {
              country,
              updatedAt: new Date().toISOString()
            });
          } catch (error) {
            console.error(`Error migrating country for app ${app.id}:`, error);
          }
        }
      }

      console.log('Country migration completed!');
    };

    migrateCountries();
  }, [apps.length, currentUser]); // Only run when apps are first loaded

  const handleSave = async () => {
    if (!currentUser) return;

    // Ensure all documents have unique IDs
    const documentsWithIds = (editingApp.documents || DEFAULT_DOCUMENTS.map(doc => ({ ...doc, id: crypto.randomUUID() }))).map(doc => ({
      ...doc,
      id: doc.id || crypto.randomUUID()
    }));

    const baseApp: Omit<MasterApplication, 'id'> = {
      university: editingApp.university || 'Unknown Uni',
      program: editingApp.program || 'Unknown Program',
      location: editingApp.location || '',
      country: editingApp.country || extractCountry(editingApp.location || ''),
      type: editingApp.type || MasterAppType.NON_SCHOLARSHIP,
      deadline: editingApp.deadline || '',
      priority: editingApp.priority || Priority.MEDIUM,
      englishReq: editingApp.englishReq || EnglishReq.NONE,
      probability: editingApp.probability || 50,
      documents: documentsWithIds,
      userId: currentUser.uid,
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
      await masterService.add(baseApp, currentUser.uid);
    }
    setIsModalOpen(false);
    setEditingApp({});
  };

  const deleteApp = async (id: string) => {
    if(confirm('Delete application?')) {
      await masterService.delete(id);
    }
  };

  // Open document modal
  const openDocumentModal = (app: MasterApplication) => {
    setSelectedApp(app);
    setIsDocModalOpen(true);
  };

  // Toggle document completion
  const toggleDocument = async (docId: string) => {
    if (!selectedApp) return;

    // Get fresh app data from apps array
    const currentApp = apps.find(a => a.id === selectedApp.id);
    if (!currentApp) return;

    const updatedDocs = currentApp.documents.map(doc =>
      doc.id === docId ? { ...doc, isCompleted: !doc.isCompleted } : doc
    );

    await masterService.update(selectedApp.id, {
      documents: updatedDocs,
      updatedAt: new Date().toISOString()
    });
  };

  // Add custom document
  const addCustomDocument = async () => {
    if (!selectedApp) return;

    // Get fresh app data from apps array
    const currentApp = apps.find(a => a.id === selectedApp.id);
    if (!currentApp) return;

    const newDoc: DocumentItem = {
      id: crypto.randomUUID(),
      name: 'New Document',
      isCompleted: false,
      isRequired: false,
      notes: ''
    };

    await masterService.update(selectedApp.id, {
      documents: [...currentApp.documents, newDoc],
      updatedAt: new Date().toISOString()
    });
  };

  // Delete document
  const deleteDocument = async (docId: string) => {
    if (!selectedApp) return;

    // Get fresh app data from apps array
    const currentApp = apps.find(a => a.id === selectedApp.id);
    if (!currentApp) return;

    const updatedDocs = currentApp.documents.filter(doc => doc.id !== docId);

    await masterService.update(selectedApp.id, {
      documents: updatedDocs,
      updatedAt: new Date().toISOString()
    });
  };

  // Update document name
  const updateDocumentName = async (docId: string, newName: string) => {
    if (!selectedApp) return;

    // Get fresh app data from apps array
    const currentApp = apps.find(a => a.id === selectedApp.id);
    if (!currentApp) return;

    const updatedDocs = currentApp.documents.map(doc =>
      doc.id === docId ? { ...doc, name: newName } : doc
    );

    await masterService.update(selectedApp.id, {
      documents: updatedDocs,
      updatedAt: new Date().toISOString()
    });
  };

  // Form document management
  const addFormDocument = () => {
    setEditingApp(prev => ({
      ...prev,
      documents: [
        ...(prev.documents || []),
        {
          id: crypto.randomUUID(),
          name: 'New Document',
          isCompleted: false,
          isRequired: false
        }
      ]
    }));
  };

  const removeFormDocument = (docId: string) => {
    setEditingApp(prev => ({
      ...prev,
      documents: (prev.documents || []).filter(doc => doc.id !== docId)
    }));
  };

  const updateFormDocumentName = (docId: string, name: string) => {
    setEditingApp(prev => ({
      ...prev,
      documents: (prev.documents || []).map(doc =>
        doc.id === docId ? { ...doc, name } : doc
      )
    }));
  };

  const toggleFormDocumentRequired = (docId: string) => {
    setEditingApp(prev => ({
      ...prev,
      documents: (prev.documents || []).map(doc =>
        doc.id === docId ? { ...doc, isRequired: !doc.isRequired } : doc
      )
    }));
  };

  const toggleFormDocumentCompleted = (docId: string) => {
    setEditingApp(prev => ({
      ...prev,
      documents: (prev.documents || []).map(doc =>
        doc.id === docId ? { ...doc, isCompleted: !doc.isCompleted } : doc
      )
    }));
  };

  // Separate apps into active, done (accepted), and rejected
  const activeApps = apps.filter(app => !app.isDone);
  const doneApps = apps.filter(app => app.isDone && !app.isRejected);
  const rejectedApps = apps.filter(app => app.isDone && app.isRejected);

  // Toggle done status
  const toggleDoneStatus = async (appId: string, isRejected: boolean = false) => {
    const app = apps.find(a => a.id === appId);
    if (!app) return;

    await masterService.update(appId, {
      isDone: !app.isDone,
      isRejected: isRejected,
      updatedAt: new Date().toISOString()
    });
  };

  // Hero View: Navigation Cards
  if (!view) {
    return (
      <div className="p-4 md:p-8 animate-in fade-in">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Master's Degree Tracking</h1>
          <p className="text-gray-400">Select a view to get started</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Scholarship Programs Card */}
          <button
            onClick={() => setView('SCHOLARSHIPS')}
            className="group relative bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-sm border-2 border-purple-500/20 hover:border-purple-500/40 rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/20 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-blue-500/0 group-hover:from-purple-500/10 group-hover:to-blue-500/10 rounded-2xl transition-all duration-300" />
            <div className="relative">
              <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                <Award className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Scholarship Programs</h2>
              <p className="text-gray-400">
                Track and manage scholarship programs with linked universities and application statuses
              </p>
            </div>
          </button>

          {/* Countries Card */}
          <button
            onClick={() => setView('COUNTRIES')}
            className="group relative bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm border-2 border-blue-500/20 hover:border-blue-500/40 rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:to-cyan-500/10 rounded-2xl transition-all duration-300" />
            <div className="relative">
              <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                <Globe className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Countries</h2>
              <p className="text-gray-400">
                Explore applications grouped by country and view universities in each region
              </p>
            </div>
          </button>

          {/* Applications Card */}
          <button
            onClick={() => setView('APPLICATIONS')}
            className="group relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm border-2 border-green-500/20 hover:border-green-500/40 rounded-2xl p-8 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-green-500/20 text-left"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/0 to-emerald-500/0 group-hover:from-green-500/10 group-hover:to-emerald-500/10 rounded-2xl transition-all duration-300" />
            <div className="relative">
              <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500/30 transition-colors">
                <GraduationCap className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Applications</h2>
              <p className="text-gray-400">
                Manage your master's degree applications with document tracking and professor contacts
              </p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // View-specific rendering
  if (view === 'SCHOLARSHIPS') {
    return (
      <div className="p-4 md:p-8 animate-in fade-in">
        <button
          onClick={() => setView(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Menu
        </button>
        <ScholarshipProgramsView />
      </div>
    );
  }

  if (view === 'COUNTRIES') {
    return (
      <div className="p-4 md:p-8 animate-in fade-in">
        <button
          onClick={() => setView(null)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Menu
        </button>
        <CountriesView />
      </div>
    );
  }

  // APPLICATIONS View - Original MasterTracker Implementation

  return (
    <div className="p-4 md:p-8 animate-in fade-in">
      <button
        onClick={() => setView(null)}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Menu
      </button>

      <PageHeader 
        title="Master's Degree Applications" 
        action={
          <button 
            onClick={() => { 
              setEditingApp({
                documents: DEFAULT_DOCUMENTS.map(doc => ({ ...doc, id: crypto.randomUUID() }))
              }); 
              setIsModalOpen(true); 
            }}
            className="bg-primary hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <Plus size={16} /> Add Application
          </button>
        }
      />

      {/* Active Applications */}
      <h2 className="text-xl font-bold text-white mb-4">Active Applications</h2>
      <div className="space-y-4 mb-8">
        {activeApps.map(app => (
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

              {/* Additional Notes */}
              {app.notes && (
                <div className="mt-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 text-sm">
                  <div className="font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <FileText size={12}/> Notes
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {app.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Right: Document Summary Button */}
            <div className="w-full md:w-64">
              <button
                onClick={() => openDocumentModal(app)}
                className="w-full bg-slate-900/50 hover:bg-slate-800 p-4 rounded-lg border border-slate-700/50 transition-colors text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                    <FileText size={14} /> Documents
                  </h4>
                  <span className="text-slate-400">›</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Progress:</span>
                    <span className="text-white font-medium">
                      {app.documents?.filter(d => d.isCompleted).length || 0} / {app.documents?.length || 0}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${((app.documents?.filter(d => d.isCompleted).length || 0) / (app.documents?.length || 1)) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </button>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 justify-start border-l border-slate-700 pl-4">
              <button onClick={() => { setEditingApp(app); setIsModalOpen(true); }} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-200">
                Edit
              </button>
              <button 
                onClick={() => toggleDoneStatus(app.id, false)}
                className="p-2 bg-green-900/20 hover:bg-green-900/40 rounded text-green-400 text-xs"
                title="Mark as Done (Accepted)"
              >
                ✓ Done
              </button>
              <button 
                onClick={() => toggleDoneStatus(app.id, true)}
                className="p-2 bg-red-900/20 hover:bg-red-900/40 rounded text-red-400 text-xs"
                title="Mark as Rejected"
              >
                ✗ Rejected
              </button>
              <button onClick={() => deleteApp(app.id)} className="p-2 bg-red-900/20 hover:bg-red-900/40 rounded text-red-400">
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
        {activeApps.length === 0 && <div className="text-center text-slate-500 py-10">No active applications tracked.</div>}
      </div>

      {/* Done/Accepted Applications */}
      {doneApps.length > 0 && (
        <>
          <h2 className="text-xl font-bold text-green-400 mb-4 mt-8">Done Applications</h2>
          <div className="space-y-4 mb-8">
            {doneApps.map(app => (
              <Card key={app.id} className="flex flex-col md:flex-row gap-6 opacity-70 border-green-500/30">
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {app.university}
                        <span className="text-green-400 text-sm">✓ Done</span>
                      </h3>
                      <p className="text-blue-400 font-medium">{app.program}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-slate-400 mt-2">
                    <span className="flex items-center gap-1"><MapPin size={14}/> {app.location}</span>
                    <span className="flex items-center gap-1 text-slate-200 bg-slate-800 px-2 rounded">Type: {app.type}</span>
                  </div>

                  {app.notes && (
                    <div className="mt-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 text-sm">
                      <p className="text-slate-400 text-xs">{app.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 justify-start border-l border-slate-700 pl-4">
                  <button onClick={() => { setEditingApp(app); setIsModalOpen(true); }} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 text-xs">
                    Edit
                  </button>
                  <button 
                    onClick={() => toggleDoneStatus(app.id, false)}
                    className="p-2 bg-yellow-900/20 hover:bg-yellow-900/40 rounded text-yellow-400 text-xs"
                    title="Move back to Active"
                  >
                    ↺ Active
                  </button>
                  <button onClick={() => deleteApp(app.id)} className="p-2 bg-red-900/20 hover:bg-red-900/40 rounded text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Rejected Applications */}
      {rejectedApps.length > 0 && (
        <>
          <h2 className="text-xl font-bold text-red-400 mb-4 mt-8">Rejected Applications</h2>
          <div className="space-y-4 mb-8">
            {rejectedApps.map(app => (
              <Card key={app.id} className="flex flex-col md:flex-row gap-6 opacity-60 border-red-500/30">
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {app.university}
                        <span className="text-red-400 text-sm">✗ Rejected</span>
                      </h3>
                      <p className="text-blue-400 font-medium">{app.program}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-slate-400 mt-2">
                    <span className="flex items-center gap-1"><MapPin size={14}/> {app.location}</span>
                    <span className="flex items-center gap-1 text-slate-200 bg-slate-800 px-2 rounded">Type: {app.type}</span>
                  </div>

                  {app.notes && (
                    <div className="mt-3 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 text-sm">
                      <p className="text-slate-400 text-xs">{app.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 justify-start border-l border-slate-700 pl-4">
                  <button onClick={() => { setEditingApp(app); setIsModalOpen(true); }} className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 text-xs">
                    Edit
                  </button>
                  <button 
                    onClick={() => toggleDoneStatus(app.id, false)}
                    className="p-2 bg-yellow-900/20 hover:bg-yellow-900/40 rounded text-yellow-400 text-xs"
                    title="Move back to Active"
                  >
                    ↺ Active
                  </button>
                  <button onClick={() => deleteApp(app.id)} className="p-2 bg-red-900/20 hover:bg-red-900/40 rounded text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Application Modal */}
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

        {/* Document Management in Form */}
        <hr className="border-slate-700 my-4" />
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-white">Required Documents</h4>
            <button
              type="button"
              onClick={addFormDocument}
              className="flex items-center gap-1 text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <Plus size={14} /> Add Document
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(editingApp.documents || []).map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 bg-slate-700/50 p-2 rounded">
                <button
                  type="button"
                  onClick={() => toggleFormDocumentCompleted(doc.id)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    doc.isCompleted
                      ? 'bg-green-500 border-green-500'
                      : 'border-slate-500 hover:border-green-500'
                  }`}
                >
                  {doc.isCompleted && <Check size={14} className="text-white" />}
                </button>
                <input
                  type="text"
                  value={doc.name}
                  onChange={(e) => updateFormDocumentName(doc.id, e.target.value)}
                  className={`flex-1 bg-slate-600 text-white rounded px-2 py-1 text-sm ${
                    doc.isCompleted ? 'line-through text-slate-400' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => toggleFormDocumentRequired(doc.id)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    doc.isRequired
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-slate-600 text-slate-400'
                  }`}
                >
                  {doc.isRequired ? 'Required' : 'Optional'}
                </button>
                <button
                  type="button"
                  onClick={() => removeFormDocument(doc.id)}
                  className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
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

        <TextArea 
          label="Additional Notes" 
          value={editingApp.notes || ''} 
          onChange={e => setEditingApp({...editingApp, notes: e.target.value})}
          placeholder="Any special requirements, deadlines, or notes about this application..."
        />

        <div className="mt-4 flex justify-end">
          <button onClick={handleSave} className="bg-primary text-white px-4 py-2 rounded-lg font-medium">Save Application</button>
        </div>
      </Modal>

      {/* Document Management Modal */}
      {isDocModalOpen && selectedApp && (() => {
        // Get real-time synced app data
        const currentApp = apps.find(a => a.id === selectedApp.id) || selectedApp;
        return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50" onClick={() => setIsDocModalOpen(false)}>
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">{currentApp.university}</h3>
                <p className="text-sm text-slate-400">{currentApp.program}</p>
              </div>
              <button onClick={() => setIsDocModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-3">
              {currentApp.documents?.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => toggleDocument(doc.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        doc.isCompleted
                          ? 'bg-green-500 border-green-500'
                          : 'border-slate-500 hover:border-green-500'
                      }`}
                    >
                      {doc.isCompleted && <Check size={14} className="text-white" />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      {editingDocId === doc.id ? (
                        <input
                          type="text"
                          autoFocus
                          defaultValue={doc.name}
                          onBlur={(e) => {
                            updateDocumentName(doc.id, e.target.value);
                            setEditingDocId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              updateDocumentName(doc.id, e.currentTarget.value);
                              setEditingDocId(null);
                            }
                            if (e.key === 'Escape') {
                              setEditingDocId(null);
                            }
                          }}
                          className="w-full bg-slate-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p 
                          onClick={() => setEditingDocId(doc.id)}
                          className={`font-medium cursor-text hover:bg-slate-600/30 px-2 py-1 rounded transition-colors ${
                            doc.isCompleted ? 'text-slate-400 line-through' : 'text-white'
                          }`}
                        >
                          {doc.name}
                        </p>
                      )}
                      {doc.isRequired && (
                        <span className="text-xs text-red-400 ml-2">Required</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-500/20 rounded transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <button
                onClick={addCustomDocument}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-600 rounded-lg text-slate-400 hover:border-blue-500 hover:text-blue-400 transition-colors"
              >
                <Plus size={18} />
                Add Custom Document
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Progress:</span>
                <span className="text-white font-medium">
                  {currentApp.documents?.filter(d => d.isCompleted).length || 0} / {currentApp.documents?.length || 0}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${((currentApp.documents?.filter(d => d.isCompleted).length || 0) / (currentApp.documents?.length || 1)) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};

export default MasterTracker;