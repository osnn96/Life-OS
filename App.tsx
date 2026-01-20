import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Briefcase, 
  GraduationCap, 
  Plane, 
  Menu,
  X,
  LogOut
} from 'lucide-react';
import { AppView, Priority, Task, JobApplication, MasterApplication } from './types';
import { taskService, jobService, masterService } from './services/db';
import { AuthProvider, useAuth } from './context/AuthContext';

// Module Imports
import TaskManager from './components/TaskManager';
import JobTracker from './components/JobTracker';
import MasterTracker from './components/MasterTracker';
import ErasmusTracker from './components/ErasmusTracker';
import CalendarWidget from './components/CalendarWidget';
import Auth from './components/Auth';
import { Card, PriorityBadge } from './components/Shared';

// Dashboard Summary Component
const DashboardHome = ({ setView }: { setView: (v: AppView) => void }) => {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [masters, setMasters] = useState<MasterApplication[]>([]);
  const [stats, setStats] = useState({
    urgentTasks: 0,
    dailyTasks: 0,
    jobApps: 0,
    masterApps: 0,
    upcomingDeadlines: 0
  });

  // Subscribe to real-time updates with userId
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeTasks = taskService.subscribe(currentUser.uid, setTasks);
    const unsubscribeJobs = jobService.subscribe(currentUser.uid, setJobs);
    const unsubscribeMasters = masterService.subscribe(currentUser.uid, setMasters);

    return () => {
      unsubscribeTasks();
      unsubscribeJobs();
      unsubscribeMasters();
    };
  }, [currentUser]);

  // Update stats whenever data changes
  useEffect(() => {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    const isUrgent = (dStr?: string) => {
      if (!dStr) return false;
      const d = new Date(dStr);
      return d >= now && d <= nextWeek;
    };

    setStats({
      urgentTasks: tasks.filter(t => t.priority === Priority.HIGH && !t.isCompleted).length,
      dailyTasks: tasks.filter(t => t.isDaily && !t.isCompleted).length,
      jobApps: jobs.length,
      masterApps: masters.length,
      upcomingDeadlines: masters.filter(m => isUrgent(m.deadline)).length + tasks.filter(t => isUrgent(t.dueDate)).length
    });
  }, [tasks, jobs, masters]);

  return (
    <div className="p-4 md:p-8 animate-in fade-in">
      <h1 className="text-3xl font-bold text-white mb-6">Welcome Back</h1>
      
      {/* Calendar Section */}
      <CalendarWidget />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="border-l-4 border-l-red-500 cursor-pointer hover:bg-slate-800 transition">
          <h3 className="text-slate-400 text-sm font-bold uppercase">Urgent Tasks</h3>
          <p className="text-3xl font-bold text-white mt-2">{stats.urgentTasks}</p>
        </Card>
        <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:bg-slate-800 transition">
          <h3 className="text-slate-400 text-sm font-bold uppercase">Due Today</h3>
          <p className="text-3xl font-bold text-white mt-2">{stats.dailyTasks}</p>
        </Card>
        <Card className="border-l-4 border-l-purple-500 cursor-pointer hover:bg-slate-800 transition">
          <h3 className="text-slate-400 text-sm font-bold uppercase">Active Job Apps</h3>
          <p className="text-3xl font-bold text-white mt-2">{stats.jobApps}</p>
        </Card>
        <Card className="border-l-4 border-l-orange-500 cursor-pointer hover:bg-slate-800 transition">
          <h3 className="text-slate-400 text-sm font-bold uppercase">Deadlines (7d)</h3>
          <p className="text-3xl font-bold text-white mt-2">{stats.upcomingDeadlines}</p>
        </Card>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button onClick={() => setView('TASKS')} className="p-4 bg-slate-800 border border-slate-700 rounded-xl text-left hover:border-primary transition-colors group">
          <CheckSquare className="text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-slate-200">Manage Tasks</span>
        </button>
        <button onClick={() => setView('JOBS')} className="p-4 bg-slate-800 border border-slate-700 rounded-xl text-left hover:border-purple-500 transition-colors group">
          <Briefcase className="text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-slate-200">Track Jobs</span>
        </button>
        <button onClick={() => setView('MASTERS')} className="p-4 bg-slate-800 border border-slate-700 rounded-xl text-left hover:border-orange-500 transition-colors group">
          <GraduationCap className="text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-slate-200">Master's Apps</span>
        </button>
        <button onClick={() => setView('ERASMUS')} className="p-4 bg-slate-800 border border-slate-700 rounded-xl text-left hover:border-emerald-500 transition-colors group">
          <Plane className="text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="font-semibold text-slate-200">Erasmus</span>
        </button>
      </div>
    </div>
  );
};

const App = () => {
  const { currentUser, logout } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('DASHBOARD');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // If not logged in, show Auth page
  if (!currentUser) {
    return <Auth />;
  }

  const NavItem = ({ view, label, icon: Icon }: { view: AppView, label: string, icon: any }) => (
    <button 
      onClick={() => { setCurrentView(view); setMobileMenuOpen(false); }}
      className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-all duration-200 ${currentView === view ? 'bg-primary text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-background text-slate-200 font-sans">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-4 fixed h-full z-10">
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-lg"></div>
          <h1 className="text-xl font-bold text-white tracking-tight">LifeOS</h1>
        </div>
        <nav className="space-y-2 flex-1">
          <NavItem view="DASHBOARD" label="Dashboard" icon={LayoutDashboard} />
          <NavItem view="TASKS" label="Tasks" icon={CheckSquare} />
          <NavItem view="JOBS" label="Job Applications" icon={Briefcase} />
          <NavItem view="MASTERS" label="Master's Apps" icon={GraduationCap} />
          <NavItem view="ERASMUS" label="Erasmus" icon={Plane} />
        </nav>
        <div className="border-t border-slate-800 pt-4 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
          <div className="text-xs text-slate-600 px-4 mt-2">
            {currentUser?.displayName || currentUser?.email}
          </div>
        </div>
        <div className="text-xs text-slate-600 px-4 py-2">v1.1.0 Multi-User</div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-4 z-20 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <div className="w-6 h-6 bg-gradient-to-tr from-blue-500 to-purple-500 rounded"></div>
           <span className="font-bold text-white">LifeOS</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-900 z-10 pt-20 px-4 space-y-2 animate-in slide-in-from-top-10">
          <NavItem view="DASHBOARD" label="Dashboard" icon={LayoutDashboard} />
          <NavItem view="TASKS" label="Tasks" icon={CheckSquare} />
          <NavItem view="JOBS" label="Job Applications" icon={Briefcase} />
          <NavItem view="MASTERS" label="Master's Apps" icon={GraduationCap} />
          <NavItem view="ERASMUS" label="Erasmus" icon={Plane} />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 mt-16 md:mt-0 min-h-screen bg-background">
        {currentView === 'DASHBOARD' && <DashboardHome setView={setCurrentView} />}
        {currentView === 'TASKS' && <TaskManager />}
        {currentView === 'JOBS' && <JobTracker />}
        {currentView === 'MASTERS' && <MasterTracker />}
        {currentView === 'ERASMUS' && <ErasmusTracker />}
      </main>
    </div>
  );
};

// Wrap App with AuthProvider
const AppWithAuth = () => (
  <AuthProvider>
    <App />
  </AuthProvider>
);

export default AppWithAuth;