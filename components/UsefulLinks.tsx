import React, { useState, useEffect } from 'react';
import { UsefulLink, LinkCategory } from '../types';
import { linkService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Modal, Input, Select, TextArea, Card } from './Shared';
import { Plus, Trash2, ExternalLink, Edit2, Link as LinkIcon } from 'lucide-react';

const UsefulLinks = () => {
  const { currentUser } = useAuth();
  const [links, setLinks] = useState<UsefulLink[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<LinkCategory | 'ALL'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<Partial<UsefulLink>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = linkService.subscribe(currentUser.uid, setLinks);
    return () => unsubscribe();
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) {
      alert('You must be logged in to save links');
      return;
    }

    // Validation
    if (!editingLink.title?.trim()) {
      alert('Please enter a title for the link');
      return;
    }

    if (!editingLink.url?.trim()) {
      alert('Please enter a URL for the link');
      return;
    }

    try {
      setIsSaving(true);
      
      const baseLink: Omit<UsefulLink, 'id'> = {
        title: editingLink.title.trim(),
        url: editingLink.url.trim(),
        category: editingLink.category || LinkCategory.OTHER,
        description: editingLink.description?.trim() || '',
        userId: currentUser.uid,
        createdAt: editingLink.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingLink.id) {
        await linkService.update(editingLink.id, baseLink);
      } else {
        await linkService.add(baseLink, currentUser.uid);
      }
      
      setIsModalOpen(false);
      setEditingLink({});
    } catch (error) {
      console.error('Error saving link:', error);
      alert(`Failed to save link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLink = async (id: string) => {
    if (confirm('Delete this link?')) {
      await linkService.delete(id);
    }
  };

  // Filter links by category
  const filteredLinks = selectedCategory === 'ALL' 
    ? links 
    : links.filter(link => link.category === selectedCategory);

  // Group links by category
  const linksByCategory = filteredLinks.reduce((acc, link) => {
    if (!acc[link.category]) {
      acc[link.category] = [];
    }
    acc[link.category].push(link);
    return acc;
  }, {} as Record<string, UsefulLink[]>);

  return (
    <div className="p-4 md:p-8 animate-in fade-in">
      <PageHeader 
        title="Useful Links" 
        action={
          <button 
            onClick={() => { setEditingLink({}); setIsModalOpen(true); }}
            className="bg-primary hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <Plus size={16} /> Add Link
          </button>
        }
      />

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            selectedCategory === 'ALL'
              ? 'bg-primary text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          All
        </button>
        {Object.values(LinkCategory).map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedCategory === category
                ? 'bg-primary text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Links Grid */}
      {(Object.entries(linksByCategory) as [string, UsefulLink[]][]).map(([category, categoryLinks]) => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <LinkIcon size={20} className="text-blue-400" />
            {category}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryLinks.map(link => (
              <Card key={link.id} className="relative group hover:border-blue-500/50 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="font-bold text-lg text-white hover:text-blue-400 flex items-center gap-2 transition-colors"
                    >
                      {link.title}
                      <ExternalLink size={14} />
                    </a>
                    {link.description && (
                      <p className="text-slate-400 text-sm mt-2 line-clamp-2">
                        {link.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between items-center">
                  <span className="text-xs text-slate-500">
                    {new Date(link.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditingLink(link); setIsModalOpen(true); }} 
                      className="text-slate-400 hover:text-white text-xs"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => deleteLink(link.id)} 
                      className="text-red-400 hover:text-red-300"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {filteredLinks.length === 0 && (
        <div className="text-center text-slate-500 py-10">
          No links found. Add your first useful link!
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingLink.id ? "Edit Link" : "New Link"}
      >
        <Input 
          label="Title" 
          value={editingLink.title || ''} 
          onChange={e => setEditingLink({...editingLink, title: e.target.value})} 
          placeholder="e.g., OpenAI Documentation"
        />
        <Input 
          label="URL" 
          value={editingLink.url || ''} 
          onChange={e => setEditingLink({...editingLink, url: e.target.value})} 
          placeholder="https://..."
        />
        
        <Select 
          label="Category" 
          value={editingLink.category || LinkCategory.OTHER}
          onChange={e => setEditingLink({...editingLink, category: e.target.value as LinkCategory})}
          options={Object.values(LinkCategory).map(v => ({ value: v, label: v }))}
        />

        <TextArea 
          label="Description (Optional)" 
          value={editingLink.description || ''} 
          onChange={e => setEditingLink({...editingLink, description: e.target.value})} 
          placeholder="Brief description of what this link is about..."
        />
        
        <div className="mt-4 flex justify-end gap-2">
          <button 
            type="button"
            onClick={() => setIsModalOpen(false)} 
            className="bg-slate-700 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-600 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleSave} 
            className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Link'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default UsefulLinks;
