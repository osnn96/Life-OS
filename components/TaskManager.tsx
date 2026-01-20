import React, { useState, useEffect } from 'react';
import { Task, Priority } from '../types';
import { taskService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { PriorityBadge, Card, PageHeader, Modal, Input, Select, TextArea } from './Shared';
import { Plus, CheckSquare, Square, Trash2, Calendar, Archive, Layers, FileText } from 'lucide-react';

const TaskManager = () => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<'DAILY' | 'BACKLOG' | 'UPCOMING' | 'ALL'>('DAILY');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task>>({});

  // Subscribe to real-time updates with userId
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = taskService.subscribe(currentUser.uid, setTasks);
    return () => unsubscribe();
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;

    // Default dueDate to today if not specified
    const today = new Date().toISOString().split('T')[0];

    const baseTask: Omit<Task, 'id'> = {
      title: editingTask.title || 'New Task',
      priority: editingTask.priority || Priority.MEDIUM,
      isDaily: editingTask.isDaily ?? (view === 'DAILY' || view === 'ALL'),
      isCompleted: editingTask.isCompleted || false,
      description: editingTask.description || '',
      dueDate: editingTask.dueDate || today,
      isRecurring: editingTask.isRecurring || false,
      recurringType: editingTask.recurringType,
      recurringDays: editingTask.recurringDays,
      recurringDate: editingTask.recurringDate,
      userId: currentUser.uid,
      createdAt: editingTask.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingTask.id) {
      await taskService.update(editingTask.id, baseTask);
    } else {
      await taskService.add(baseTask, currentUser.uid);
    }
    setIsModalOpen(false);
    setEditingTask({});
  };

  const toggleComplete = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation(); // Prevent opening modal
    await taskService.update(task.id, { isCompleted: !task.isCompleted });
  };

  const deleteTask = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent opening modal
    if(confirm('Delete this task?')) {
      await taskService.delete(id);
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const today = new Date().toISOString().split('T')[0];
  
  const filteredTasks = tasks.filter(t => {
    if (view === 'ALL') return true;
    if (view === 'DAILY') return t.isDaily;
    if (view === 'BACKLOG') return !t.isDaily;
    if (view === 'UPCOMING') {
      // Show tasks with due date in the future
      return t.dueDate && t.dueDate > today;
    }
    return true;
  }).sort((a, b) => {
    // Sort completed to bottom
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    // For upcoming view, sort by due date
    if (view === 'UPCOMING' && a.dueDate && b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    // Sort by priority
    const pMap = { [Priority.HIGH]: 0, [Priority.MEDIUM]: 1, [Priority.LOW]: 2 };
    return pMap[a.priority] - pMap[b.priority];
  });

  return (
    <div className="p-4 md:p-8 animate-in fade-in">
      <PageHeader 
        title={view === 'DAILY' ? "Today's Focus" : view === 'BACKLOG' ? "Backlog" : view === 'UPCOMING' ? "Upcoming Tasks" : "All Tasks"} 
        action={
          <button 
            onClick={() => { setEditingTask({}); setIsModalOpen(true); }}
            className="bg-primary hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <Plus size={16} /> Add Task
          </button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex p-1 bg-slate-900 rounded-lg mb-6 w-full max-w-2xl border border-slate-800">
        <button 
          onClick={() => setView('DAILY')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${view === 'DAILY' ? 'bg-surface text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Calendar size={14} /> Today
        </button>
        <button 
          onClick={() => setView('UPCOMING')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${view === 'UPCOMING' ? 'bg-surface text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <FileText size={14} /> Upcoming
        </button>
        <button 
          onClick={() => setView('BACKLOG')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${view === 'BACKLOG' ? 'bg-surface text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Archive size={14} /> Backlog
        </button>
        <button 
          onClick={() => setView('ALL')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${view === 'ALL' ? 'bg-surface text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Layers size={14} /> All Tasks
        </button>
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 && (
          <div className="text-center py-10 text-slate-500">No tasks found in this view.</div>
        )}
        {filteredTasks.map(task => (
          <Card 
            key={task.id} 
            className={`
              transition-all cursor-pointer hover:border-slate-500 active:scale-[0.99] group
              ${task.isCompleted ? 'opacity-50' : ''}
            `}
          >
            <div onClick={() => openEditModal(task)} className="w-full">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <button onClick={(e) => toggleComplete(e, task)} className="mt-1 text-slate-400 hover:text-primary transition-colors">
                    {task.isCompleted ? <CheckSquare size={24} className="text-green-500" /> : <Square size={24} />}
                  </button>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between items-start pr-2">
                       <span className={`font-medium ${task.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {task.title}
                      </span>
                      {/* Mobile-friendly Actions positioned at top right of content */}
                       <div className="flex items-center gap-2 md:hidden">
                          <PriorityBadge priority={task.priority} />
                       </div>
                    </div>
                   
                    <div className="flex flex-wrap gap-2 text-xs text-slate-400 items-center mt-1">
                       <div className="hidden md:block">
                          <PriorityBadge priority={task.priority} />
                       </div>
                       {task.dueDate && <span className="bg-slate-800 px-2 py-0.5 rounded">Due: {task.dueDate}</span>}
                       {task.isRecurring && (
                         <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400 border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                           🔄 {task.recurringType === 'daily' ? 'Daily' : task.recurringType === 'weekly' ? 'Weekly' : 'Monthly'}
                         </span>
                       )}
                       {view === 'ALL' && (
                         <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 border border-slate-700 px-1 rounded">
                           {task.isDaily ? 'Today' : 'Backlog'}
                         </span>
                       )}
                    </div>

                    {/* Description / Note Preview */}
                    {task.description && (
                      <div className="mt-3 flex gap-2 items-start text-xs text-slate-400 bg-slate-900/50 p-2.5 rounded border border-slate-700/50">
                        <FileText size={14} className="mt-0.5 shrink-0 text-slate-500" />
                        <p className="line-clamp-2">{task.description}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Desktop Delete Action */}
                <button 
                  onClick={(e) => deleteTask(e, task.id)}
                  className="hidden md:block p-2 hover:bg-red-900/30 rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              {/* Mobile Only Delete (Bottom Right) */}
              <div className="md:hidden flex justify-end mt-2 pt-2 border-t border-slate-800">
                 <button 
                  onClick={(e) => deleteTask(e, task.id)}
                  className="text-xs text-red-400 flex items-center gap-1"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTask.id ? "Edit Task" : "New Task"}>
        <Input 
          label="Title" 
          value={editingTask.title || ''} 
          onChange={e => setEditingTask({...editingTask, title: e.target.value})} 
        />
        <div className="grid grid-cols-2 gap-4">
          <Select 
            label="Priority" 
            value={editingTask.priority || Priority.MEDIUM}
            onChange={e => setEditingTask({...editingTask, priority: e.target.value as Priority})}
            options={[
              { value: Priority.HIGH, label: 'High' },
              { value: Priority.MEDIUM, label: 'Medium' },
              { value: Priority.LOW, label: 'Low' },
            ]}
          />
          <Select 
            label="List" 
            value={editingTask.isDaily ? 'true' : 'false'}
            onChange={e => setEditingTask({...editingTask, isDaily: e.target.value === 'true'})}
            options={[
              { value: 'true', label: 'Today' },
              { value: 'false', label: 'Backlog' },
            ]}
          />
        </div>
        <Input 
          label="Due Date" 
          type="date"
          value={editingTask.dueDate || ''}
          onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})}
        />
        
        {/* Recurring Task Section */}
        <div className="space-y-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input
              type="checkbox"
              checked={editingTask.isRecurring || false}
              onChange={e => setEditingTask({...editingTask, isRecurring: e.target.checked, recurringType: e.target.checked ? 'weekly' : undefined})}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            <span className="font-medium">🔄 Recurring Task</span>
          </label>

          {editingTask.isRecurring && (
            <div className="space-y-3 ml-6">
              <Select
                label="Repeat Pattern"
                value={editingTask.recurringType || 'weekly'}
                onChange={e => setEditingTask({...editingTask, recurringType: e.target.value as any})}
                options={[
                  { value: 'daily', label: 'Every Day' },
                  { value: 'weekly', label: 'Weekly (Select Days)' },
                  { value: 'monthly', label: 'Monthly (Select Date)' },
                ]}
              />

              {editingTask.recurringType === 'weekly' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Repeat On</label>
                  <div className="flex flex-wrap gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                      const isSelected = (editingTask.recurringDays || []).includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const days = editingTask.recurringDays || [];
                            const newDays = isSelected
                              ? days.filter(d => d !== idx)
                              : [...days, idx].sort();
                            setEditingTask({...editingTask, recurringDays: newDays});
                          }}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-blue-500 text-white'
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {editingTask.recurringType === 'monthly' && (
                <Input
                  label="Day of Month (1-31)"
                  type="number"
                  min="1"
                  max="31"
                  value={editingTask.recurringDate || ''}
                  onChange={e => setEditingTask({...editingTask, recurringDate: parseInt(e.target.value) || undefined})}
                />
              )}
            </div>
          )}
        </div>

        <TextArea
          label="Notes / Description"
          placeholder="Add extra details here..."
          value={editingTask.description || ''}
          onChange={e => setEditingTask({...editingTask, description: e.target.value})}
        />
        <div className="mt-4 flex justify-end">
          <button onClick={handleSave} className="bg-primary text-white px-4 py-2 rounded-lg font-medium">
            Save Task
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default TaskManager;