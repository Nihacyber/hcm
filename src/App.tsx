import { useState, useEffect } from 'react';
import { User, Permission, Teacher } from './lib/models';
import { getCurrentUser, getCurrentTeacher, logout } from './lib/auth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TeacherPortal from './components/TeacherPortal';
import UserManagement from './components/UserManagement';
import SchoolManagement from './components/SchoolManagement';
import TeacherManagement from './components/TeacherManagement';
import MentorManagement from './components/MentorManagement';
import AdminPersonnelManagement from './components/AdminPersonnelManagement';
import TrainingProgramManagement from './components/TrainingProgramManagement';
import TrainingAssignmentManagement from './components/TrainingAssignmentManagement';
import BulkUpload from './components/BulkUpload';
import SchoolAssignments from './components/SchoolAssignments';
import DailyAttendanceReport from './components/DailyAttendanceReport';
import EmployeeTasks from './components/EmployeeTasks';
import SchoolFollowups from './components/SchoolFollowups';
import DeviceManagement from './components/DeviceManagement';
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  Users,
  Briefcase,
  BookOpen,
  Target,
  UserCog,
  LogOut,
  Menu,
  X,
  Upload,
  UserCheck,
  Calendar,
  CheckSquare,
  MessageSquare,
  Shield
} from 'lucide-react';

type View = 'dashboard' | 'users' | 'schools' | 'teachers' | 'mentors' | 'personnel' | 'programs' | 'assignments' | 'bulk-upload' | 'school-assignments' | 'daily-report' | 'my-tasks' | 'school-followups' | 'devices';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPermissions, setCurrentPermissions] = useState<Permission | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const storedUser = getCurrentUser();
    if (storedUser) {
      setCurrentUser(storedUser.user);
      setCurrentPermissions(storedUser.permissions);
    }

    const storedTeacher = getCurrentTeacher();
    if (storedTeacher) {
      setCurrentTeacher(storedTeacher);
    }
  }, []);

  const handleLogin = (user: User, permissions: Permission) => {
    setCurrentUser(user);
    setCurrentPermissions(permissions);
  };

  const handleTeacherLogin = (teacher: Teacher) => {
    setCurrentTeacher(teacher);
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setCurrentPermissions(null);
    setCurrentTeacher(null);
    setCurrentView('dashboard');
  };

  if (currentTeacher) {
    return <TeacherPortal teacher={currentTeacher} onLogout={handleLogout} />;
  }

  if (!currentUser || !currentPermissions) {
    return <Login onLogin={handleLogin} onTeacherLogin={handleTeacherLogin} />;
  }

  const navigationItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: LayoutDashboard, show: true },
    { id: 'my-tasks' as View, label: 'My Tasks', icon: CheckSquare, show: currentUser.role === 'employee' || currentUser.role === 'admin' },
    { id: 'school-followups' as View, label: 'School Followups', icon: MessageSquare, show: currentUser.role === 'employee' || currentUser.role === 'admin' },
    { id: 'users' as View, label: 'Users', icon: UserCog, show: currentPermissions.can_manage_users || currentUser.role === 'admin' },
    { id: 'devices' as View, label: 'Device Management', icon: Shield, show: currentUser.role === 'admin' },
    { id: 'schools' as View, label: 'Schools', icon: Building2, show: true },
    { id: 'teachers' as View, label: 'Teachers', icon: GraduationCap, show: true },
    { id: 'mentors' as View, label: 'Mentors', icon: Users, show: true },
    { id: 'personnel' as View, label: 'Personnel', icon: Briefcase, show: true },
    { id: 'programs' as View, label: 'Training Programs', icon: BookOpen, show: true },
    { id: 'assignments' as View, label: 'Assignments', icon: Target, show: true },
    { id: 'bulk-upload' as View, label: 'Bulk Upload', icon: Upload, show: currentUser.role === 'admin' },
    { id: 'school-assignments' as View, label: 'School Assignments', icon: UserCheck, show: currentUser.role === 'admin' || currentPermissions.can_manage_schools },
    { id: 'daily-report' as View, label: 'Daily Attendance Report', icon: Calendar, show: currentUser.role === 'admin' || currentUser.role === 'employee' || currentPermissions.can_view_reports },
  ].filter(item => item.show);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'my-tasks':
        return <EmployeeTasks currentUser={currentUser} />;
      case 'school-followups':
        return <SchoolFollowups currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'users':
        return <UserManagement currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'devices':
        return <DeviceManagement />;
      case 'schools':
        return <SchoolManagement currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'teachers':
        return <TeacherManagement currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'mentors':
        return <MentorManagement currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'personnel':
        return <AdminPersonnelManagement currentPermissions={currentPermissions} />;
      case 'programs':
        return <TrainingProgramManagement currentPermissions={currentPermissions} />;
      case 'assignments':
        return <TrainingAssignmentManagement currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'bulk-upload':
        return <BulkUpload currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'school-assignments':
        return <SchoolAssignments currentUser={currentUser} currentPermissions={currentPermissions} />;
      case 'daily-report':
        return <DailyAttendanceReport currentUser={currentUser} currentPermissions={currentPermissions} />;
      default:
        return <Dashboard currentUser={currentUser} currentPermissions={currentPermissions} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-blue-600">HCMS</h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1">Central Management System</p>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200">
            <div className="mb-3 px-2">
              <p className="text-sm font-medium text-gray-900">{currentUser.full_name}</p>
              <p className="text-xs text-gray-500">{currentUser.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="lg:hidden bg-white shadow-sm border-b border-gray-200 p-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-700 hover:text-gray-900"
          >
            <Menu size={24} />
          </button>
          <h2 className="text-lg font-bold text-gray-900">HCMS</h2>
          <div className="w-6" />
        </div>

        <div className="p-6 lg:p-8">
          {renderView()}
        </div>
      </main>
    </div>
  );
}
