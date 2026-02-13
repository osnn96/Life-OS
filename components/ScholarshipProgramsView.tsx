import React, { useEffect, useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Calendar, 
  DollarSign, 
  FileText, 
  University,
  X,
  CheckCircle2
} from 'lucide-react';
import { scholarshipService, masterService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { ScholarshipProgram, ScholarshipStatus, DocumentItem, MasterApplication, Priority } from '../types';

// Helper to create default documents with unique IDs
const createDefaultDocuments = (): DocumentItem[] => [
  { id: crypto.randomUUID(), name: 'CV', isCompleted: false, isRequired: true },
  { id: crypto.randomUUID(), name: 'Research Proposal', isCompleted: false, isRequired: true },
  { id: crypto.randomUUID(), name: 'Motivation Letter', isCompleted: false, isRequired: true },
  { id: crypto.randomUUID(), name: 'Reference Letters (2-3)', isCompleted: false, isRequired: true },
  { id: crypto.randomUUID(), name: 'Language Certificate', isCompleted: false, isRequired: false },
  { id: crypto.randomUUID(), name: 'Academic Transcripts', isCompleted: false, isRequired: true }
];

// Helper to normalize old documents (add id if missing)
const normalizeDocuments = (documents: any[]): DocumentItem[] => {
  if (!documents || documents.length === 0) return createDefaultDocuments();
  
  return documents.map((doc, index) => ({
    id: doc.id || `legacy-${index}-${doc.name}`,
    name: doc.name || 'Unnamed Document',
    isCompleted: doc.isCompleted || false,
    isRequired: doc.isRequired !== undefined ? doc.isRequired : true
  }));
};

const ScholarshipProgramsView: React.FC = () => {
  const { currentUser } = useAuth();
  const [scholarships, setScholarships] = useState<ScholarshipProgram[]>([]);
  const [applications, setApplications] = useState<MasterApplication[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState<ScholarshipProgram | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCountryForLink, setSelectedCountryForLink] = useState('');
  const [selectedUniversityForLink, setSelectedUniversityForLink] = useState('');
  const [linkedStatus, setLinkedStatus] = useState<ScholarshipStatus>(ScholarshipStatus.NOT_APPLIED);

  const [formData, setFormData] = useState<{
    name: string;
    type: string;
    description: string;
    deadline: string;
    fundingAmount: string;
    notes: string;
    linkedUniversities: Array<{universityName: string; location: string; status: ScholarshipStatus}>;
    documents: DocumentItem[];
  }>({
    name: '',
    type: '',
    description: '',
    deadline: '',
    fundingAmount: '',
    notes: '',
    linkedUniversities: [],
    documents: createDefaultDocuments()
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    const unsubscribeScholarships = scholarshipService.subscribe(currentUser.uid, (data) => {
      setScholarships(data);
    });

    const unsubscribeApps = masterService.subscribe(currentUser.uid, (data) => {
      setApplications(data);
    });

    return () => {
      unsubscribeScholarships();
      unsubscribeApps();
    };
  }, [currentUser?.uid]);

  // Extract unique countries and universities
  const countriesWithUniversities = useMemo(() => {
    const countryMap = new Map<string, Set<string>>();
    
    applications.forEach(app => {
      const country = app.country || (app.location ? app.location.split(',').pop()?.trim() : '');
      if (country) {
        if (!countryMap.has(country)) {
          countryMap.set(country, new Set());
        }
        countryMap.get(country)!.add(`${app.university}|${app.location}`);
      }
    });

    return Array.from(countryMap.entries()).map(([country, universities]) => ({
      country,
      universities: Array.from(universities).map(uniData => {
        const [name, location] = uniData.split('|');
        return { name, location };
      })
    })).sort((a, b) => a.country.localeCompare(b.country));
  }, [applications]);

  const handleAdd = async () => {
    if (!currentUser?.uid) {
      alert('No user logged in!');
      return;
    }

    if (!formData.name.trim()) {
      alert('Please enter scholarship name!');
      return;
    }

    try {
      const dataToSend = {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        deadline: formData.deadline,
        fundingAmount: formData.fundingAmount,
        notes: formData.notes,
        linkedUniversities: formData.linkedUniversities || [],
        documents: formData.documents || [],
        priority: Priority.MEDIUM,
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await scholarshipService.add(dataToSend, currentUser.uid);
      resetForm();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding scholarship:', error);
      alert('Error: ' + (error as Error).message);
    }
  };

  const handleUpdate = async () => {
    if (!selectedScholarship?.id || !formData.name.trim()) return;

    try {
      await scholarshipService.update(selectedScholarship.id, {
        ...formData,
        updatedAt: new Date().toISOString()
      });

      setIsEditModalOpen(false);
      setSelectedScholarship(null);
      resetForm();
    } catch (error) {
      console.error('Error updating scholarship:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scholarship program?')) return;
    
    try {
      await scholarshipService.delete(id);
    } catch (error) {
      console.error('Error deleting scholarship:', error);
    }
  };

  const openEditModal = (scholarship: ScholarshipProgram) => {
    setSelectedScholarship(scholarship);
    const normalizedDocs = normalizeDocuments(scholarship.documents || []);
    setFormData({
      name: scholarship.name,
      type: scholarship.type,
      description: scholarship.description || '',
      deadline: scholarship.deadline || '',
      fundingAmount: scholarship.fundingAmount || '',
      notes: scholarship.notes || '',
      linkedUniversities: scholarship.linkedUniversities || [],
      documents: normalizedDocs
    });
    setIsEditModalOpen(true);
  };

  const openDetailModal = (scholarship: ScholarshipProgram) => {
    setSelectedScholarship(scholarship);
    setIsDetailModalOpen(true);
  };

  const toggleDocumentCompletion = async (docId: string) => {
    if (!selectedScholarship?.id) return;

    const normalizedDocs = normalizeDocuments(selectedScholarship.documents || []);
    const updatedDocuments = normalizedDocs.map(doc =>
      doc.id === docId ? { ...doc, isCompleted: !doc.isCompleted } : doc
    );

    try {
      await scholarshipService.update(selectedScholarship.id, {
        documents: updatedDocuments,
        updatedAt: new Date().toISOString()
      });

      setSelectedScholarship({
        ...selectedScholarship,
        documents: updatedDocuments
      });
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      description: '',
      deadline: '',
      fundingAmount: '',
      notes: '',
      linkedUniversities: [],
      documents: createDefaultDocuments()
    });
    setSelectedCountryForLink('');
    setSelectedUniversityForLink('');
    setLinkedStatus(ScholarshipStatus.NOT_APPLIED);
  };

  // Form document management
  const addFormDocument = () => {
    setFormData(prev => ({
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
    setFormData(prev => ({
      ...prev,
      documents: (prev.documents || []).filter(doc => doc.id !== docId)
    }));
  };

  const updateFormDocumentName = (docId: string, name: string) => {
    setFormData(prev => ({
      ...prev,
      documents: (prev.documents || []).map(doc =>
        doc.id === docId ? { ...doc, name } : doc
      )
    }));
  };

  const toggleFormDocumentRequired = (docId: string) => {
    setFormData(prev => ({
      ...prev,
      documents: (prev.documents || []).map(doc =>
        doc.id === docId ? { ...doc, isRequired: !doc.isRequired } : doc
      )
    }));
  };

  const toggleFormDocumentCompleted = (docId: string) => {
    setFormData(prev => ({
      ...prev,
      documents: (prev.documents || []).map(doc =>
        doc.id === docId ? { ...doc, isCompleted: !doc.isCompleted } : doc
      )
    }));
  };

  const calculateDocumentProgress = (documents?: DocumentItem[]) => {
    if (!documents || documents.length === 0) return 0;
    const completed = documents.filter(d => d.isCompleted).length;
    return (completed / documents.length) * 100;
  };

  const getStatusColor = (status: ScholarshipStatus) => {
    switch (status) {
      case ScholarshipStatus.ACCEPTED:
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case ScholarshipStatus.APPLIED:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case ScholarshipStatus.REJECTED:
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusText = (status: ScholarshipStatus) => {
    return status.replace('_', ' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">🎓 Scholarship Programs</h2>
        <button
          onClick={() => {
            resetForm();
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Scholarship
        </button>
      </div>

      {/* Scholarship Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scholarships.map((scholarship) => {
          const docProgress = calculateDocumentProgress(scholarship.documents);
          
          return (
            <div
              key={scholarship.id}
              onClick={() => openDetailModal(scholarship)}
              className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all cursor-pointer"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-white line-clamp-2 flex-1">
                  {scholarship.name}
                </h3>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(scholarship);
                    }}
                    className="p-1.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <Edit className="w-4 h-4 text-blue-400" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(scholarship.id);
                    }}
                    className="p-1.5 hover:bg-white/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>

              {/* Type Badge */}
              {scholarship.type && (
                <span className="inline-block px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded mb-3">
                  {scholarship.type}
                </span>
              )}

              {/* Info Grid */}
              <div className="space-y-2 mb-4">
                {scholarship.deadline && (
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Calendar className="w-4 h-4 text-yellow-400" />
                    <span>{new Date(scholarship.deadline).toLocaleDateString()}</span>
                  </div>
                )}
                
                {scholarship.fundingAmount && (
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span>{scholarship.fundingAmount}</span>
                  </div>
                )}
              </div>

              {/* Document Progress */}
              {scholarship.documents && scholarship.documents.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Documents
                    </span>
                    <span>
                      {scholarship.documents.filter(d => d.isCompleted).length}/{scholarship.documents.length}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${docProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Linked Universities */}
              {scholarship.linkedUniversities && scholarship.linkedUniversities.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <University className="w-3 h-3" />
                    <span>Linked Universities ({scholarship.linkedUniversities.length})</span>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {scholarship.linkedUniversities.map((uni, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white/5 rounded px-2 py-1 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-white truncate">{uni.universityName}</div>
                          <div className="text-gray-400 text-xs truncate">{uni.location}</div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-xs border ${getStatusColor(uni.status)}`}>
                          {getStatusText(uni.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {scholarships.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <University className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No scholarship programs yet. Add your first scholarship!</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                {isAddModalOpen ? 'Add Scholarship Program' : 'Edit Scholarship Program'}
              </h3>
              <button
                onClick={() => {
                  isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
                  resetForm();
                }}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Program Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Erasmus Mundus Joint Masters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Type
                </label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Full Scholarship, Research Grant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Program details, requirements, coverage..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Funding Amount
                  </label>
                  <input
                    type="text"
                    value={formData.fundingAmount}
                    onChange={(e) => setFormData({ ...formData, fundingAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., €25,000/year"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Document Management Section */}
              <hr className="border-white/10 my-4" />
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-gray-300">Required Documents</h4>
                  <button
                    type="button"
                    onClick={addFormDocument}
                    className="flex items-center gap-1 text-sm px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Document
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(formData.documents || []).map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 bg-white/5 p-2 rounded">
                      <button
                        type="button"
                        onClick={() => toggleFormDocumentCompleted(doc.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          doc.isCompleted
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-500 hover:border-green-500'
                        }`}
                      >
                        {doc.isCompleted && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </button>
                      <input
                        type="text"
                        value={doc.name}
                        onChange={(e) => updateFormDocumentName(doc.id, e.target.value)}
                        className={`flex-1 bg-white/10 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          doc.isCompleted ? 'line-through text-gray-400' : ''
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => toggleFormDocumentRequired(doc.id)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          doc.isRequired
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-600 text-gray-400'
                        }`}
                      >
                        {doc.isRequired ? 'Required' : 'Optional'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFormDocument(doc.id)}
                        className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* University Linking Section */}
              <hr className="border-white/10 my-4" />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-300">Link to Universities</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Country</label>
                    <select
                      value={selectedCountryForLink}
                      onChange={(e) => {
                        setSelectedCountryForLink(e.target.value);
                        setSelectedUniversityForLink('');
                      }}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Country</option>
                      {countriesWithUniversities.map((c) => (
                        <option key={c.country} value={c.country}>
                          {c.country}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">University</label>
                    <select
                      value={selectedUniversityForLink}
                      onChange={(e) => setSelectedUniversityForLink(e.target.value)}
                      disabled={!selectedCountryForLink}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">Select University</option>
                      {selectedCountryForLink && 
                        countriesWithUniversities
                          .find(c => c.country === selectedCountryForLink)?.universities
                          .map((uni, idx) => (
                            <option key={idx} value={`${uni.name}|${uni.location}`}>
                              {uni.name}
                            </option>
                          ))
                      }
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Application Status</label>
                  <select
                    value={linkedStatus}
                    onChange={(e) => setLinkedStatus(e.target.value as ScholarshipStatus)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={ScholarshipStatus.NOT_APPLIED}>Not Applied</option>
                    <option value={ScholarshipStatus.APPLIED}>Applied</option>
                    <option value={ScholarshipStatus.ACCEPTED}>Accepted</option>
                    <option value={ScholarshipStatus.REJECTED}>Rejected</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedCountryForLink || !selectedUniversityForLink) return;
                    
                    const [uniName, uniLocation] = selectedUniversityForLink.split('|');
                    
                    const newLink = {
                      universityName: uniName,
                      location: uniLocation,
                      status: linkedStatus
                    };

                    setFormData(prev => ({
                      ...prev,
                      linkedUniversities: [
                        ...(prev.linkedUniversities || []),
                        newLink
                      ]
                    }));

                    // Reset selection
                    setSelectedCountryForLink('');
                    setSelectedUniversityForLink('');
                    setLinkedStatus(ScholarshipStatus.NOT_APPLIED);
                  }}
                  disabled={!selectedCountryForLink || !selectedUniversityForLink}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add University Link
                </button>

                {/* Linked Universities List */}
                {formData.linkedUniversities && formData.linkedUniversities.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400">Linked Universities ({formData.linkedUniversities.length})</p>
                    {formData.linkedUniversities.map((link, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white/5 rounded-lg p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{link.universityName}</p>
                          <p className="text-xs text-gray-400 truncate">{link.location}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs rounded border ${getStatusColor(link.status)}`}>
                            {getStatusText(link.status)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                linkedUniversities: (prev.linkedUniversities || []).filter((_, i) => i !== idx)
                              }));
                            }}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={isAddModalOpen ? handleAdd : handleUpdate}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
              >
                {isAddModalOpen ? 'Add Scholarship' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedScholarship && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">{selectedScholarship.name}</h3>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedScholarship(null);
                }}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                {selectedScholarship.type && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Type</p>
                    <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded">
                      {selectedScholarship.type}
                    </span>
                  </div>
                )}

                {selectedScholarship.deadline && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Deadline</p>
                    <p className="text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-yellow-400" />
                      {new Date(selectedScholarship.deadline).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {selectedScholarship.fundingAmount && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Funding</p>
                    <p className="text-white flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      {selectedScholarship.fundingAmount}
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedScholarship.description && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Description</p>
                  <p className="text-gray-300 whitespace-pre-wrap">{selectedScholarship.description}</p>
                </div>
              )}

              {/* Documents */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Required Documents
                  </h4>
                  <span className="text-sm text-gray-400">
                    {selectedScholarship.documents?.filter(d => d.isCompleted).length || 0}/
                    {selectedScholarship.documents?.length || 0}
                  </span>
                </div>
                <div className="space-y-2">
                  {normalizeDocuments(selectedScholarship.documents || []).map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => toggleDocumentCompletion(doc.id)}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          doc.isCompleted 
                            ? 'bg-green-500 border-green-500' 
                            : 'border-gray-500'
                        }`}>
                          {doc.isCompleted && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`${doc.isCompleted ? 'text-gray-400 line-through' : 'text-white'}`}>
                            {doc.name}
                          </span>
                          {doc.isRequired && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Linked Universities */}
              {selectedScholarship.linkedUniversities && selectedScholarship.linkedUniversities.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
                    <University className="w-5 h-5" />
                    Linked Universities ({selectedScholarship.linkedUniversities.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedScholarship.linkedUniversities.map((uni, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                      >
                        <div>
                          <p className="text-white font-medium">{uni.universityName}</p>
                          <p className="text-sm text-gray-400">{uni.location}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(uni.status)}`}>
                          {getStatusText(uni.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedScholarship.notes && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Notes</p>
                  <p className="text-gray-300 whitespace-pre-wrap bg-white/5 p-3 rounded-lg">
                    {selectedScholarship.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholarshipProgramsView;
