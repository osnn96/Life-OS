import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { FullTaskPage, FullTaskSection, FullTaskItem, Priority } from '../types';
import { fullTaskService, taskService } from '../services/db';
import { 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronRight, 
  CheckSquare, 
  Square, 
  Search, 
  FileText, 
  Sparkles, 
  ArrowUp, 
  ArrowDown, 
  Calendar, 
  Copy, 
  Check, 
  Eye, 
  Code2, 
  FolderPlus,
  RefreshCw,
  Clock,
  Layers
} from 'lucide-react';

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; badge: string; ring: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', badge: 'bg-blue-500/20 text-blue-300', ring: 'focus:ring-blue-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30', badge: 'bg-purple-500/20 text-purple-300', ring: 'focus:ring-purple-500' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-300', ring: 'focus:ring-emerald-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', badge: 'bg-amber-500/20 text-amber-300', ring: 'focus:ring-amber-500' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30', badge: 'bg-rose-500/20 text-rose-300', ring: 'focus:ring-rose-500' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', badge: 'bg-cyan-500/20 text-cyan-300', ring: 'focus:ring-cyan-500' },
  slate: { bg: 'bg-slate-800/40', text: 'text-slate-300', border: 'border-slate-700/50', badge: 'bg-slate-700/50 text-slate-300', ring: 'focus:ring-slate-500' },
};

const DEFAULT_SECTIONS: FullTaskSection[] = [
  {
    id: 'sec-today',
    title: '🎯 Today & Immediate Tasks',
    color: 'blue',
    isCollapsed: false,
    items: [
      { id: 'item-1', text: 'Plan out the day', isCompleted: false },
      { id: 'item-2', text: 'Review critical deadlines', isCompleted: false }
    ]
  },
  {
    id: 'sec-week',
    title: '⚡ Tomorrow & This Week',
    color: 'purple',
    isCollapsed: false,
    items: [
      { id: 'item-3', text: 'Work on ongoing project goals', isCompleted: false }
    ]
  },
  {
    id: 'sec-future',
    title: '🔮 Future & Upcoming',
    color: 'amber',
    isCollapsed: false,
    items: [
      { id: 'item-4', text: 'Schedule next month preparations', isCompleted: false }
    ]
  },
  {
    id: 'sec-longterm',
    title: '🚀 Long Term & Big Goals',
    color: 'emerald',
    isCollapsed: false,
    items: [
      { id: 'item-5', text: 'Master degree / career milestone milestones', isCompleted: false }
    ]
  },
  {
    id: 'sec-dump',
    title: '💡 Brain Dump & Unscheduled',
    color: 'slate',
    isCollapsed: false,
    items: [
      { id: 'item-6', text: 'Any quick thought or note to organize later', isCompleted: false }
    ]
  }
];

export default function FullTaskManager() {
  const { currentUser } = useAuth();
  const [page, setPage] = useState<FullTaskPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'completed'>('all');
  const [markdownMode, setMarkdownMode] = useState(false);
  const [markdownText, setMarkdownText] = useState('');
  const [scheduleModalItem, setScheduleModalItem] = useState<{ text: string; sectionTitle: string } | null>(null);
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [schedulePriority, setSchedulePriority] = useState<Priority>(Priority.MEDIUM);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  const itemInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // 1. Subscribe to FullTaskPage in Firestore
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = fullTaskService.subscribe(currentUser.uid, (pages) => {
      if (pages && pages.length > 0) {
        setPage(pages[0]);
      } else {
        // Initialize with default template
        const initialPage: Omit<FullTaskPage, 'id'> = {
          userId: currentUser.uid,
          title: 'Full-Task Master Board',
          sections: DEFAULT_SECTIONS,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        fullTaskService.add(initialPage, currentUser.uid);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Save changes to Firestore
  const savePage = useCallback(async (updatedSections: FullTaskSection[], title?: string) => {
    if (!page || !currentUser) return;
    setSaving(true);
    try {
      await fullTaskService.update(page.id, {
        sections: updatedSections,
        title: title !== undefined ? title : page.title,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error saving full task board:', err);
    } finally {
      setSaving(false);
    }
  }, [page, currentUser]);

  // Section actions
  const addSection = () => {
    if (!page) return;
    const newSection: FullTaskSection = {
      id: 'sec-' + Date.now(),
      title: 'New Section',
      color: 'blue',
      isCollapsed: false,
      items: [{ id: 'item-' + Date.now(), text: '', isCompleted: false }]
    };
    const updated = [...page.sections, newSection];
    setPage({ ...page, sections: updated });
    savePage(updated);
  };

  const updateSectionTitle = (sectionId: string, title: string) => {
    if (!page) return;
    const updated = page.sections.map(s => s.id === sectionId ? { ...s, title } : s);
    setPage({ ...page, sections: updated });
    savePage(updated);
  };

  const updateSectionColor = (sectionId: string, color: any) => {
    if (!page) return;
    const updated = page.sections.map(s => s.id === sectionId ? { ...s, color } : s);
    setPage({ ...page, sections: updated });
    savePage(updated);
  };

  const toggleSectionCollapse = (sectionId: string) => {
    if (!page) return;
    const updated = page.sections.map(s => s.id === sectionId ? { ...s, isCollapsed: !s.isCollapsed } : s);
    setPage({ ...page, sections: updated });
    savePage(updated);
  };

  const deleteSection = (sectionId: string) => {
    if (!page) return;
    const sec = page.sections.find(s => s.id === sectionId);
    if (sec && sec.items.length > 0) {
      if (!confirm(`Delete section "${sec.title}" and its ${sec.items.length} tasks?`)) return;
    }
    const updated = page.sections.filter(s => s.id !== sectionId);
    setPage({ ...page, sections: updated });
    savePage(updated);
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (!page) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= page.sections.length) return;
    const updated = [...page.sections];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setPage({ ...page, sections: updated });
    savePage(updated);
  };

  // Item actions
  const addItem = (sectionId: string, afterItemId?: string) => {
    if (!page) return;
    const newItemId = 'item-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const newItem: FullTaskItem = {
      id: newItemId,
      text: '',
      isCompleted: false
    };

    const updated = page.sections.map(s => {
      if (s.id !== sectionId) return s;
      if (!afterItemId) {
        return { ...s, items: [...s.items, newItem] };
      }
      const idx = s.items.findIndex(i => i.id === afterItemId);
      if (idx === -1) {
        return { ...s, items: [...s.items, newItem] };
      }
      const newItems = [...s.items];
      newItems.splice(idx + 1, 0, newItem);
      return { ...s, items: newItems };
    });

    setPage({ ...page, sections: updated });
    savePage(updated);

    // Focus newly added item
    setTimeout(() => {
      itemInputRefs.current[newItemId]?.focus();
    }, 50);
  };

  const updateItemText = (sectionId: string, itemId: string, text: string) => {
    if (!page) return;
    const updated = page.sections.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        items: s.items.map(i => i.id === itemId ? { ...i, text } : i)
      };
    });
    setPage({ ...page, sections: updated });
    savePage(updated);
  };

  const toggleItemComplete = (sectionId: string, itemId: string) => {
    if (!page) return;
    const updated = page.sections.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        items: s.items.map(i => i.id === itemId ? { ...i, isCompleted: !i.isCompleted } : i)
      };
    });
    setPage({ ...page, sections: updated });
    savePage(updated);
  };

  const deleteItem = (sectionId: string, itemId: string, focusPrevious = false) => {
    if (!page) return;
    let prevItemId: string | null = null;
    const sec = page.sections.find(s => s.id === sectionId);
    if (sec) {
      const idx = sec.items.findIndex(i => i.id === itemId);
      if (idx > 0) prevItemId = sec.items[idx - 1].id;
    }

    const updated = page.sections.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        items: s.items.filter(i => i.id !== itemId)
      };
    });
    setPage({ ...page, sections: updated });
    savePage(updated);

    if (focusPrevious && prevItemId) {
      setTimeout(() => {
        itemInputRefs.current[prevItemId!]?.focus();
      }, 50);
    }
  };

  // Convert to / from Markdown
  const generateMarkdown = () => {
    if (!page) return '';
    return page.sections.map(s => {
      const header = `## ${s.title}\n`;
      const items = s.items.map(i => `- [${i.isCompleted ? 'x' : ' '}] ${i.text}`).join('\n');
      return header + (items ? items + '\n' : '');
    }).join('\n');
  };

  const openMarkdownView = () => {
    setMarkdownText(generateMarkdown());
    setMarkdownMode(true);
  };

  const applyMarkdown = () => {
    if (!page) return;
    const lines = markdownText.split('\n');
    const newSections: FullTaskSection[] = [];
    let currentSec: FullTaskSection | null = null;

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        const title = trimmed.replace(/^#+\s*/, '');
        currentSec = {
          id: 'sec-' + Date.now() + '-' + lineIdx,
          title: title || 'Untitled Section',
          color: 'blue',
          isCollapsed: false,
          items: []
        };
        newSections.push(currentSec);
      } else if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]')) {
        const isDone = trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]');
        const text = trimmed.substring(5).trim();
        if (!currentSec) {
          currentSec = {
            id: 'sec-' + Date.now() + '-default',
            title: 'General Tasks',
            color: 'slate',
            isCollapsed: false,
            items: []
          };
          newSections.push(currentSec);
        }
        currentSec.items.push({
          id: 'item-' + Date.now() + '-' + lineIdx,
          text,
          isCompleted: isDone
        });
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = trimmed.substring(2).trim();
        if (!currentSec) {
          currentSec = {
            id: 'sec-' + Date.now() + '-default',
            title: 'General Tasks',
            color: 'slate',
            isCollapsed: false,
            items: []
          };
          newSections.push(currentSec);
        }
        currentSec.items.push({
          id: 'item-' + Date.now() + '-' + lineIdx,
          text,
          isCompleted: false
        });
      }
    });

    if (newSections.length > 0) {
      setPage({ ...page, sections: newSections });
      savePage(newSections);
    }
    setMarkdownMode(false);
  };

  // Schedule task to formal Tasks manager
  const handleScheduleConfirm = async () => {
    if (!scheduleModalItem || !currentUser) return;
    try {
      await taskService.add({
        title: scheduleModalItem.text,
        priority: schedulePriority,
        dueDate: scheduleDate,
        isDaily: scheduleDate === new Date().toISOString().split('T')[0],
        isCompleted: false,
        description: `Scheduled from Full-Task [${scheduleModalItem.sectionTitle}]`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as any, currentUser.uid);

      alert(`Task "${scheduleModalItem.text}" scheduled for ${scheduleDate}!`);
      setScheduleModalItem(null);
    } catch (err) {
      console.error('Error scheduling task:', err);
      alert('Failed to schedule task.');
    }
  };

  // Stats calculation
  const totalTasks = page?.sections.reduce((acc, s) => acc + s.items.length, 0) || 0;
  const completedTasks = page?.sections.reduce((acc, s) => acc + s.items.filter(i => i.isCompleted).length, 0) || 0;
  const activeTasks = totalTasks - completedTasks;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="animate-spin text-blue-500" size={20} />
          <span>Loading Full-Task page...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-in fade-in">
      {/* Notion Page Cover / Banner */}
      <div className="relative mb-8 pb-6 border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">📓</span>
              <input
                type="text"
                value={page?.title || 'Full-Task'}
                onChange={(e) => {
                  if (!page) return;
                  setPage({ ...page, title: e.target.value });
                  savePage(page.sections, e.target.value);
                }}
                className="text-3xl md:text-4xl font-extrabold text-white bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500/50 rounded px-1 transition-all"
                placeholder="Full-Task Title..."
              />
            </div>
            <p className="text-slate-400 text-sm ml-1">
              Your free-form Notion master task page. Gather headings, checklists, and plan everything at your own pace.
            </p>
          </div>

          {/* Sync status & Mode Switch */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              <span className={`w-2 h-2 rounded-full ${saving ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span>{saving ? 'Saving...' : 'Synced to Cloud'}</span>
            </div>

            <button
              onClick={() => markdownMode ? applyMarkdown() : openMarkdownView()}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Toggle Markdown view to copy or paste bulk tasks"
            >
              {markdownMode ? <Eye size={14} /> : <Code2 size={14} />}
              <span>{markdownMode ? 'Interactive View' : 'Markdown / Bulk'}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-3 gap-3 mt-6 max-w-md">
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg text-center">
            <div className="text-xs text-slate-500 font-semibold uppercase">Total</div>
            <div className="text-lg font-bold text-white mt-0.5">{totalTasks}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg text-center">
            <div className="text-xs text-blue-400 font-semibold uppercase">Pending</div>
            <div className="text-lg font-bold text-blue-400 mt-0.5">{activeTasks}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg text-center">
            <div className="text-xs text-emerald-400 font-semibold uppercase">Done</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{completedTasks}</div>
          </div>
        </div>
      </div>

      {/* Markdown / Bulk Mode View */}
      {markdownMode ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl animate-in fade-in">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Code2 size={18} className="text-blue-400" /> Raw Markdown & Bulk Task Editor
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Use <code className="text-blue-400">## Heading</code> for sections and <code className="text-blue-400">- [ ] Task</code> for checklist items.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(markdownText);
                  setCopiedMarkdown(true);
                  setTimeout(() => setCopiedMarkdown(false), 2000);
                }}
                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700"
              >
                {copiedMarkdown ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedMarkdown ? 'Copied!' : 'Copy Markdown'}</span>
              </button>
              <button
                onClick={applyMarkdown}
                className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-1.5 rounded-lg shadow-sm"
              >
                Apply to Board
              </button>
            </div>
          </div>

          <textarea
            value={markdownText}
            onChange={(e) => setMarkdownText(e.target.value)}
            rows={18}
            className="w-full bg-slate-950 font-mono text-sm text-slate-200 border border-slate-800 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 leading-relaxed"
            placeholder={`## Today\n- [ ] Example task\n- [x] Completed task\n\n## Next Week\n- [ ] Future goal`}
          />
        </div>
      ) : (
        /* Interactive Notion Canvas View */
        <div>
          {/* Controls Bar: Search, Filters, Add Section */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder="Search across all headings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Filter tabs */}
              <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1 rounded-md font-medium transition ${filterMode === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterMode('active')}
                  className={`px-3 py-1 rounded-md font-medium transition ${filterMode === 'active' ? 'bg-slate-800 text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilterMode('completed')}
                  className={`px-3 py-1 rounded-md font-medium transition ${filterMode === 'completed' ? 'bg-slate-800 text-emerald-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Done
                </button>
              </div>

              <button
                onClick={addSection}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3.5 py-2 rounded-lg shadow-sm transition"
              >
                <FolderPlus size={15} />
                <span>New Heading</span>
              </button>
            </div>
          </div>

          {/* Sections List */}
          <div className="space-y-6">
            {page?.sections.map((section, sIndex) => {
              const colorStyle = COLOR_MAP[section.color || 'blue'] || COLOR_MAP.blue;
              const filteredItems = section.items.filter(item => {
                if (searchQuery && !item.text.toLowerCase().includes(searchQuery.toLowerCase())) {
                  return false;
                }
                if (filterMode === 'active' && item.isCompleted) return false;
                if (filterMode === 'completed' && !item.isCompleted) return false;
                return true;
              });

              const sectionCompletedCount = section.items.filter(i => i.isCompleted).length;

              return (
                <div
                  key={section.id}
                  className={`bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm transition-all hover:border-slate-700/80`}
                >
                  {/* Section Header */}
                  <div className={`p-3.5 px-4 flex items-center justify-between gap-3 border-b border-slate-800/60 ${colorStyle.bg}`}>
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <button
                        onClick={() => toggleSectionCollapse(section.id)}
                        className="text-slate-400 hover:text-white transition p-0.5 rounded"
                      >
                        {section.isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                      </button>

                      {/* Heading Title (Editable) */}
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                        className={`font-bold text-base md:text-lg bg-transparent border-none outline-none ${colorStyle.text} focus:ring-1 focus:ring-blue-500/40 rounded px-1 flex-1`}
                        placeholder="Heading title..."
                      />

                      {/* Items counter */}
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${colorStyle.badge}`}>
                        {sectionCompletedCount}/{section.items.length}
                      </span>
                    </div>

                    {/* Section Tools: Color, Reorder, Add item, Delete */}
                    <div className="flex items-center gap-1">
                      {/* Color dots picker */}
                      <div className="hidden sm:flex items-center gap-1 mr-1">
                        {['blue', 'purple', 'emerald', 'amber', 'rose', 'slate'].map((c) => (
                          <button
                            key={c}
                            onClick={() => updateSectionColor(section.id, c)}
                            className={`w-3.5 h-3.5 rounded-full transition-transform ${c === (section.color || 'blue') ? 'scale-125 ring-2 ring-white/50' : 'opacity-40 hover:opacity-100'} ${COLOR_MAP[c].badge}`}
                            title={`Change color to ${c}`}
                          />
                        ))}
                      </div>

                      {/* Move Section */}
                      <button
                        onClick={() => moveSection(sIndex, 'up')}
                        disabled={sIndex === 0}
                        className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-20 transition"
                        title="Move Section Up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moveSection(sIndex, 'down')}
                        disabled={sIndex === page.sections.length - 1}
                        className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-20 transition"
                        title="Move Section Down"
                      >
                        <ArrowDown size={14} />
                      </button>

                      {/* Quick Add Todo */}
                      <button
                        onClick={() => addItem(section.id)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition ml-1"
                        title="Add task to this heading"
                      >
                        <Plus size={16} />
                      </button>

                      {/* Delete Section */}
                      <button
                        onClick={() => deleteSection(section.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                        title="Delete Heading"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Section Tasks List (Collapsible) */}
                  {!section.isCollapsed && (
                    <div className="p-3 md:p-4 space-y-1.5">
                      {filteredItems.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-500 italic">
                          No tasks under this heading. Press &ldquo;+ Task&rdquo; to start typing.
                        </div>
                      ) : (
                        filteredItems.map((item) => (
                          <div
                            key={item.id}
                            className={`group flex items-start gap-3 py-1.5 px-2.5 rounded-lg hover:bg-slate-800/50 transition-colors ${item.isCompleted ? 'opacity-60' : ''}`}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleItemComplete(section.id, item.id)}
                              className="mt-0.5 text-slate-400 hover:text-blue-400 transition"
                            >
                              {item.isCompleted ? (
                                <CheckSquare size={18} className="text-emerald-400" />
                              ) : (
                                <Square size={18} className="text-slate-500 group-hover:text-slate-400" />
                              )}
                            </button>

                            {/* Task Inline Input */}
                            <input
                              ref={(el) => (itemInputRefs.current[item.id] = el)}
                              type="text"
                              value={item.text}
                              onChange={(e) => updateItemText(section.id, item.id, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addItem(section.id, item.id);
                                } else if (e.key === 'Backspace' && item.text === '') {
                                  e.preventDefault();
                                  deleteItem(section.id, item.id, true);
                                }
                              }}
                              placeholder="To-do item... (press Enter for next)"
                              className={`flex-1 bg-transparent border-none outline-none text-sm leading-relaxed transition-all ${item.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}
                            />

                            {/* Action Buttons (visible on hover) */}
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                              {/* Quick Schedule to main Tasks */}
                              <button
                                onClick={() => setScheduleModalItem({ text: item.text, sectionTitle: section.title })}
                                className="p-1 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded text-xs flex items-center gap-1"
                                title="Schedule this task to Daily Tasks"
                              >
                                <Calendar size={13} />
                              </button>

                              {/* Delete Item */}
                              <button
                                onClick={() => deleteItem(section.id, item.id)}
                                className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                                title="Delete task"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}

                      {/* Bottom Quick-Add Row */}
                      <button
                        onClick={() => addItem(section.id)}
                        className="w-full text-left py-1.5 px-2.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 rounded-lg flex items-center gap-2 transition"
                      >
                        <Plus size={14} />
                        <span>Add to-do...</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Add Section Card */}
          <div className="mt-8 pt-4 border-t border-slate-800 flex justify-center">
            <button
              onClick={addSection}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 text-sm font-medium px-5 py-2.5 rounded-xl shadow-sm transition"
            >
              <Plus size={16} className="text-blue-400" />
              <span>Add Another Heading Section</span>
            </button>
          </div>
        </div>
      )}

      {/* Schedule to Tasks Modal */}
      {scheduleModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-blue-400 font-bold mb-2">
              <Calendar size={18} /> Schedule Task to Main Tasks
            </div>
            <p className="text-slate-300 text-sm font-medium mb-4 p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/40">
              &ldquo;{scheduleModalItem.text}&rdquo;
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Priority</label>
                <select
                  value={schedulePriority}
                  onChange={(e) => setSchedulePriority(e.target.value as Priority)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={Priority.HIGH}>High Priority</option>
                  <option value={Priority.MEDIUM}>Medium Priority</option>
                  <option value={Priority.LOW}>Low Priority</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setScheduleModalItem(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleScheduleConfirm}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm shadow-sm transition"
              >
                Schedule Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
