import React, { useState, useEffect } from 'react';
import { Note, NotePriority } from '../types';
import { noteService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Modal, Input, Select, TextArea, Card } from './Shared';
import { Plus, Trash2, Edit2, StickyNote, Calendar } from 'lucide-react';

const NOTES_CONFIG: { priority: NotePriority; label: string; color: string; ring: string }[] = [
  {
    priority: NotePriority.IMPORTANT,
    label: 'Important',
    color: 'text-red-400 border-red-500/50',
    ring: 'border-red-500/30 hover:border-red-500/60',
  },
  {
    priority: NotePriority.MID,
    label: 'Mid',
    color: 'text-orange-400 border-orange-500/50',
    ring: 'border-orange-500/30 hover:border-orange-500/60',
  },
  {
    priority: NotePriority.LOW,
    label: 'Low',
    color: 'text-green-400 border-green-500/50',
    ring: 'border-green-500/30 hover:border-green-500/60',
  },
];

const Notes = () => {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Partial<Note>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = noteService.subscribe(currentUser.uid, setNotes);
    return () => unsubscribe();
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) {
      alert('You must be logged in to save notes');
      return;
    }

    if (!editingNote.title?.trim()) {
      alert('Please enter a title for the note');
      return;
    }

    try {
      setIsSaving(true);

      const baseNote: Omit<Note, 'id'> = {
        title: editingNote.title.trim(),
        content: editingNote.content?.trim() || '',
        priority: editingNote.priority || NotePriority.MID,
        date: editingNote.date || undefined,
        userId: currentUser.uid,
        createdAt: editingNote.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingNote.id) {
        await noteService.update(editingNote.id, baseNote);
      } else {
        await noteService.add(baseNote, currentUser.uid);
      }

      setIsModalOpen(false);
      setEditingNote({});
    } catch (error) {
      console.error('Error saving note:', error);
      alert(`Failed to save note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNote = async (id: string) => {
    if (confirm('Delete this note?')) {
      await noteService.delete(id);
    }
  };

  const notesByPriority = (priority: NotePriority) =>
    notes
      .filter(n => n.priority === priority)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="p-4 md:p-8 animate-in fade-in">
      <PageHeader
        title="Notes"
        icon={StickyNote}
        action={
          <button
            onClick={() => { setEditingNote({}); setIsModalOpen(true); }}
            className="bg-primary hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <Plus size={16} /> Add Note
          </button>
        }
      />

      {/* Priority Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {NOTES_CONFIG.map(({ priority, label, color, ring }) => {
          const priorityNotes = notesByPriority(priority);
          return (
            <div key={priority} className="flex flex-col">
              <h2 className={`text-lg font-bold mb-4 pb-2 border-b flex items-center gap-2 ${color}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${priority === NotePriority.IMPORTANT ? 'bg-red-400' : priority === NotePriority.MID ? 'bg-orange-400' : 'bg-green-400'}`}></span>
                {label}
                <span className="text-xs text-slate-500 font-normal ml-1">({priorityNotes.length})</span>
              </h2>

              <div className="space-y-3">
                {priorityNotes.length === 0 && (
                  <div className="text-center text-slate-600 text-sm py-6 border border-dashed border-slate-700 rounded-xl">
                    No notes yet
                  </div>
                )}
                {priorityNotes.map(note => (
                  <Card key={note.id} className={`border ${ring} transition-colors group`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-white break-words">{note.title}</h3>
                          {note.date && (
                            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-blue-400 bg-blue-500/20 border border-blue-500/50 px-2 py-0.5 rounded">
                              <Calendar size={10} /> {note.date}
                            </span>
                          )}
                        </div>
                        {note.content && (
                          <p className="text-sm text-slate-400 mt-1.5 line-clamp-3 break-words">{note.content}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => { setEditingNote(note); setIsModalOpen(true); }}
                          className="text-slate-400 hover:text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="text-red-400 hover:text-red-300 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
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
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNote.id ? "Edit Note" : "New Note"}
      >
        <Input
          label="Title"
          value={editingNote.title || ''}
          onChange={e => setEditingNote({ ...editingNote, title: e.target.value })}
          placeholder="e.g., Call advisor about documents"
        />
        <TextArea
          label="Content (Optional)"
          value={editingNote.content || ''}
          onChange={e => setEditingNote({ ...editingNote, content: e.target.value })}
          placeholder="Add extra details here..."
        />
        <Select
          label="Priority"
          value={editingNote.priority || NotePriority.MID}
          onChange={e => setEditingNote({ ...editingNote, priority: e.target.value as NotePriority })}
          options={Object.values(NotePriority).map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))}
        />
        <Input
          label="Date (Optional)"
          type="date"
          value={editingNote.date || ''}
          onChange={e => setEditingNote({ ...editingNote, date: e.target.value || undefined })}
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
            {isSaving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Notes;
