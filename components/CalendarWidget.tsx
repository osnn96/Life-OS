import React, { useState, useEffect } from 'react';
import { taskService, masterService } from '../services/db';
import { Task, MasterApplication, Priority } from '../types';
import { Clock, AlertCircle } from 'lucide-react';

const CalendarWidget = () => {
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [events, setEvents] = useState<{ tasks: Task[], masters: MasterApplication[] }>({ tasks: [], masters: [] });

  useEffect(() => {
    // 1. Calculate the sliding 7-day window starting from TODAY
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
    setWeekDays(days);

    // 2. Subscribe to real-time updates
    const unsubscribeTasks = taskService.subscribe((tasks) => {
      setEvents(prev => ({ ...prev, tasks }));
    });
    const unsubscribeMasters = masterService.subscribe((masters) => {
      setEvents(prev => ({ ...prev, masters }));
    });

    return () => {
      unsubscribeTasks();
      unsubscribeMasters();
    };
  }, []);

  const getDayEvents = (date: Date) => {
    // Format date to YYYY-MM-DD to match input[type="date"] values
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Filter tasks due on this date (and not completed)
    const dayTasks = events.tasks.filter(t => t.dueDate === dateStr && !t.isCompleted);
    // Filter master's deadlines on this date
    const dayMasters = events.masters.filter(m => m.deadline === dateStr);
    
    return { dayTasks, dayMasters };
  };

  return (
    <div className="mb-8 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="text-primary" size={20}/> 7-Day Overview
        </h2>
      </div>

      {/* Horizontal Scroll Container for Mobile / Grid for Desktop */}
      <div className="overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex md:grid md:grid-cols-7 gap-3 min-w-[800px] md:min-w-0">
          {weekDays.map((date, idx) => {
            const { dayTasks, dayMasters } = getDayEvents(date);
            const isToday = idx === 0; // First item is always today

            return (
              <div 
                key={idx}
                className={`
                  flex-1 min-w-[130px] md:min-w-0
                  flex flex-col
                  bg-surface border rounded-xl p-3 min-h-[180px] transition-colors
                  ${isToday ? 'border-primary shadow-lg shadow-blue-500/10 bg-slate-800' : 'border-slate-700/50 hover:border-slate-600'}
                `}
              >
                {/* Header */}
                <div className={`pb-2 mb-2 border-b ${isToday ? 'border-blue-500/30' : 'border-slate-700'}`}>
                  <div className={`text-xs font-bold uppercase mb-0.5 ${isToday ? 'text-blue-400' : 'text-slate-500'}`}>
                    {date.toLocaleDateString(undefined, { weekday: 'long' })}
                  </div>
                  <div className={`text-xl font-bold ${isToday ? 'text-white' : 'text-slate-300'}`}>
                    {date.getDate()} <span className="text-xs font-normal text-slate-500">{date.toLocaleDateString(undefined, { month: 'short' })}</span>
                  </div>
                </div>

                {/* Content List */}
                <div className="flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                  {/* Master's Deadlines (High Importance) */}
                  {dayMasters.map(m => (
                    <div key={m.id} className="group relative bg-red-900/20 border border-red-500/30 rounded p-1.5 hover:bg-red-900/30 transition-colors">
                      <div className="text-[10px] font-bold text-red-400 uppercase leading-none mb-1 flex items-center gap-1">
                        <AlertCircle size={8} /> Deadline
                      </div>
                      <div className="text-xs text-red-100 font-medium leading-tight truncate" title={`${m.university} - ${m.program}`}>
                        {m.university}
                      </div>
                    </div>
                  ))}

                  {/* Tasks */}
                  {dayTasks.map(t => (
                    <div key={t.id} className="bg-slate-700/50 border border-slate-600/50 rounded p-1.5 hover:bg-slate-700 transition-colors">
                      <div className="text-xs text-slate-200 font-medium leading-tight line-clamp-3" title={t.title}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 mb-0.5 ${
                          t.priority === Priority.HIGH ? 'bg-red-400' : 
                          t.priority === Priority.MEDIUM ? 'bg-orange-400' : 'bg-green-400'
                        }`}></span>
                        {t.title}
                      </div>
                    </div>
                  ))}

                  {/* Empty State */}
                  {dayMasters.length === 0 && dayTasks.length === 0 && (
                    <div className="flex-1 flex items-center justify-center opacity-20">
                      <div className="w-1 h-8 bg-slate-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarWidget;