import React, { useState, useEffect } from 'react';
import { Task, Priority } from '../types';
import { taskService } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { PriorityBadge, Card, PageHeader, Modal, Input, Select, TextArea } from './Shared';
import { Plus, CheckSquare, Square, Trash2, Calendar, Archive, Layers, FileText, RefreshCw } from 'lucide-react';

const TaskManager = () => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<'DAILY' | 'BACKLOG' | 'UPCOMING' | 'DONE' | 'ALL'>('DAILY');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Partial<Task>>({});
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Subscribe to real-time updates with userId
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = taskService.subscribe(currentUser.uid, setTasks);
    return () => unsubscribe();
  }, [currentUser]);

  // Auto-move overdue daily tasks to backlog
  useEffect(() => {
    if (!currentUser || tasks.length === 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    tasks.forEach(async (task) => {
      // If task is daily, not completed, and due date is in the past
      if (task.isDaily && !task.isCompleted && task.dueDate && task.dueDate < today) {
        await taskService.update(task.id, {
          isDaily: false,
          overdueFromDaily: true
        });
      }
    });
  }, [tasks, currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;

    try {
      // Default dueDate to today if not specified
      const today = new Date().toISOString().split('T')[0];

      const baseTask: Omit<Task, 'id'> = {
        title: editingTask.title || 'New Task',
        priority: editingTask.priority || Priority.MEDIUM,
        isDaily: editingTask.isDaily ?? (view === 'DAILY' || view === 'ALL'),
        isCompleted: editingTask.isCompleted || false,
        description: editingTask.description || '',
        isRecurring: editingTask.isRecurring || false,
        userId: currentUser.uid,
        createdAt: editingTask.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add optional fields
      if (editingTask.dueDate) {
        (baseTask as any).dueDate = editingTask.dueDate;
      } else if (!editingTask.id) {
        // Only set today for new tasks
        (baseTask as any).dueDate = today;
      } else {
        // For editing: undefined will trigger deleteField in db service
        (baseTask as any).dueDate = undefined;
      }
      
      if (editingTask.isRecurring && editingTask.recurrenceType) {
        (baseTask as any).recurrenceType = editingTask.recurrenceType;
      }
      if (editingTask.isRecurring && editingTask.recurrenceDays) {
        (baseTask as any).recurrenceDays = editingTask.recurrenceDays;
      }
      if (editingTask.lastCompletedDate) {
        (baseTask as any).lastCompletedDate = editingTask.lastCompletedDate;
      }
      if (editingTask.overdueFromDaily) {
        (baseTask as any).overdueFromDaily = editingTask.overdueFromDaily;
      }

      if (editingTask.id) {
        await taskService.update(editingTask.id, baseTask);
      } else {
        await taskService.add(baseTask, currentUser.uid);
      }
      
      setIsModalOpen(false);
      setEditingTask({});
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task. Please try again.');
    }
  };

  const toggleComplete = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation(); // Prevent opening modal
    
    // If task is recurring and being marked complete
    if (task.isRecurring && !task.isCompleted) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Calculate next due date based on recurrence type
      let nextDueDate = new Date();
      
      if (task.recurrenceType === 'daily') {
        nextDueDate.setDate(nextDueDate.getDate() + 1);
      } else if (task.recurrenceType === 'weekly') {
        nextDueDate.setDate(nextDueDate.getDate() + 7);
      } else if (task.recurrenceType === 'monthly') {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      } else if (task.recurrenceType === 'weekdays' && task.recurrenceDays?.length) {
        // Find next occurrence day
        const currentDay = today.getDay();
        const sortedDays = [...task.recurrenceDays].sort((a, b) => a - b);
        
        // Find next day in the week
        let nextDay = sortedDays.find(day => day > currentDay);
        
        // If no day found this week, use first day next week
        if (nextDay === undefined) {
          nextDay = sortedDays[0];
          const daysToAdd = (7 - currentDay) + nextDay;
          nextDueDate.setDate(nextDueDate.getDate() + daysToAdd);
        } else {
          nextDueDate.setDate(nextDueDate.getDate() + (nextDay - currentDay));
        }
      }
      
      // Create new recurring instance
      const newTask: Omit<Task, 'id'> = {
        ...task,
        isCompleted: false,
        dueDate: nextDueDate.toISOString().split('T')[0],
        lastCompletedDate: todayStr,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await taskService.add(newTask, task.userId);
    }
    
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

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    // Add visual feedback
    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedTaskId(null);
    (e.target as HTMLElement).style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    
    if (!draggedTaskId || draggedTaskId === targetTaskId) return;

    // Find the dragged and target tasks
    const draggedIndex = filteredTasks.findIndex(t => t.id === draggedTaskId);
    const targetIndex = filteredTasks.findIndex(t => t.id === targetTaskId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder the tasks
    const reorderedTasks = [...filteredTasks];
    const [draggedTask] = reorderedTasks.splice(draggedIndex, 1);
    reorderedTasks.splice(targetIndex, 0, draggedTask);

    // Update order for all affected tasks
    const updates = reorderedTasks.map((task, index) => 
      taskService.update(task.id, { order: index })
    );

    await Promise.all(updates);
  };

  // Get today's date for filtering upcoming tasks
  const today = React.useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const filteredTasks = tasks.filter(t => {
    if (view === 'ALL') return true;
    // DAILY: Show tasks due today (regardless of isDaily flag)
    if (view === 'DAILY') return !t.isCompleted && t.dueDate === today;
    // BACKLOG: Show tasks without due date or isDaily=false
    if (view === 'BACKLOG') return !t.isCompleted && (!t.dueDate || !t.isDaily);
    if (view === 'UPCOMING') {
      // Show tasks with due date in the future
      return t.dueDate && t.dueDate > today && !t.isCompleted;
    }
    if (view === 'DONE') return t.isCompleted;
    return true;
  }).sort((a, b) => {
    // For DONE view, sort by updated date (completion date)
    if (view === 'DONE') {
      return b.updatedAt.localeCompare(a.updatedAt); // Newest first
    }
    // Sort completed to bottom (for non-DONE views)
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    // For upcoming view, sort by due date
    if (view === 'UPCOMING' && a.dueDate && b.dueDate) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    // Sort by custom order if set (for drag & drop)
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    // Sort by priority
    const pMap = { [Priority.HIGH]: 0, [Priority.MEDIUM]: 1, [Priority.LOW]: 2 };
    return pMap[a.priority] - pMap[b.priority];
  });

  return (
    <div className="p-4 md:p-8 animate-in fade-in">
      <PageHeader 
        title={view === 'DAILY' ? "Today's Focus" : view === 'BACKLOG' ? "Backlog" : view === 'UPCOMING' ? "Upcoming Tasks" : view === 'DONE' ? "Done Tasks" : "All Tasks"} 
        action={
          <button 
            onClick={() => { 
              // Set dueDate to today for new tasks in DAILY view
              const initialTask = view === 'DAILY' ? { dueDate: new Date().toISOString().split('T')[0] } : {};
              setEditingTask(initialTask); 
              setIsModalOpen(true); 
            }}
            className="bg-primary hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            <Plus size={16} /> Add Task
          </button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex p-1 bg-slate-900 rounded-lg mb-6 w-full max-w-3xl border border-slate-800">
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
          onClick={() => setView('DONE')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${view === 'DONE' ? 'bg-surface text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <CheckSquare size={14} /> Done
        </button>
        <button 
          onClick={() => setView('ALL')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${view === 'ALL' ? 'bg-surface text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Layers size={14} /> All
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
              transition-all cursor-move hover:border-slate-500 active:scale-[0.99] group
              ${task.isCompleted ? 'opacity-50' : ''}
              ${draggedTaskId === task.id ? 'opacity-50 scale-95' : ''}
            `}
            draggable={!task.isCompleted && view !== 'DONE'}
            onDragStart={(e) => handleDragStart(e, task.id)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, task.id)}
          >
            <div onClick={() => openEditModal(task)} className="w-full cursor-pointer">
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
                         <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400 bg-blue-500/20 border border-blue-500/50 px-2 py-0.5 rounded flex items-center gap-1">
                           <RefreshCw size={10} /> 
                           {task.recurrenceType === 'weekdays' && task.recurrenceDays?.length 
                             ? `${task.recurrenceDays.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d].substring(0,2)).join(',')}`
                             : task.recurrenceType
                           }
                         </span>
                       )}
                       {task.overdueFromDaily && (
                         <span className="text-[10px] uppercase tracking-wider font-bold text-orange-400 bg-orange-500/20 border border-orange-500/50 px-2 py-0.5 rounded animate-pulse">
                           NOT COMPLETED
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
              { value: 'true', label: 'Daily View' },
              { value: 'false', label: 'Backlog' },
            ]}
          />
        </div>
        <Input 
          label="Due Date (Optional)" 
          type="date"
          value={editingTask.dueDate || ''}
          onChange={e => setEditingTask({...editingTask, dueDate: e.target.value || undefined})}
        />
        
        <div className="border-t border-slate-700 pt-3 mt-3">
          <label className="flex items-center gap-2 text-sm text-slate-300 mb-2">
            <input
              type="checkbox"
              checked={editingTask.isRecurring || false}
              onChange={e => setEditingTask({...editingTask, isRecurring: e.target.checked, recurrenceType: e.target.checked ? 'weekly' : undefined})}
              className="rounded"
            />
            Recurring Task
          </label>
          {editingTask.isRecurring && (
            <>
              <Select
                label="Repeat Every"
                value={editingTask.recurrenceType || 'weekly'}
                onChange={e => setEditingTask({...editingTask, recurrenceType: e.target.value as any})}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'weekdays', label: 'Specific Days of Week' },
                ]}
              />
              {editingTask.recurrenceType === 'weekdays' && (
                <div className="mt-2 mb-4">
                  <label className="text-xs text-slate-400 font-semibold uppercase mb-2 block">Select Days</label>
                  <div className="flex flex-wrap gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const days = editingTask.recurrenceDays || [];
                          const newDays = days.includes(index)
                            ? days.filter(d => d !== index)
                            : [...days, index].sort();
                          setEditingTask({...editingTask, recurrenceDays: newDays});
                        }}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          (editingTask.recurrenceDays || []).includes(index)
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        <TextArea
          label="Notes / Description"
          placeholder="Add extra details here..."
          value={editingTask.description || ''}
          onChange={e => setEditingTask({...editingTask, description: e.target.value})}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button 
            type="button" 
            onClick={() => { setIsModalOpen(false); setEditingTask({}); }}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSave();
            }}
            className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium"
          >
            Save Task
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default TaskManager;