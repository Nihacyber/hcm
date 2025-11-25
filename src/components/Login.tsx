import { useState } from 'react';
import { login, teacherLogin } from '../lib/auth';
import { User, Permission, Teacher } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Lock, LogIn, Phone, GraduationCap, Users } from 'lucide-react';

interface Props {
  onLogin: (user: User, permissions: Permission) => void;
  onTeacherLogin: (teacher: Teacher) => void;
}

export default function Login({ onLogin, onTeacherLogin }: Props) {
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async () => {
    const adminResult = await login(username, password);
    if (adminResult) {
      if (adminResult.error) {
        setError(adminResult.error);
        return false;
      }
      onLogin(adminResult.user, adminResult.permissions);
      return true;
    }
    return false;
  };

  const handleTeacherPhoneLogin = async () => {
    const trimmedPhone = phoneNumber.trim();

    const teachers = await db.find<Teacher>(Collections.TEACHERS, { phone: trimmedPhone });

    let teacher = null;

    if (teachers && teachers.length > 0) {
      teacher = teachers.find(t => t.school_id !== null) || teachers[0];
    } else {
      const allTeachers = await db.find<Teacher>(Collections.TEACHERS, {});

      const matches = allTeachers?.filter(t => t.phone?.replace(/\s+/g, '') === trimmedPhone.replace(/\s+/g, '')) || [];
      teacher = matches.find(t => t.school_id !== null) || matches[0] || null;
    }

    if (teacher) {
      localStorage.setItem('currentTeacher', JSON.stringify(teacher));
      onTeacherLogin(teacher);
      return true;
    }
    return false;
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await handleTeacherPhoneLogin();
      if (!success) {
        setError('Phone number not found. Please contact your administrator.');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await handleAdminLogin();
      if (!success) {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  if (showStaffLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-8 text-white">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                <Users size={32} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-center">Staff Login</h2>
            <p className="text-slate-200 text-center mt-2 text-sm">Employee & Administrator Access</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleStaffSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-transparent transition-all"
                  placeholder="Enter your username"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white px-4 py-3 rounded-lg hover:from-slate-800 hover:to-slate-900 transition-all flex items-center justify-center gap-2 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogIn size={20} />
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowStaffLogin(false);
                  setError('');
                  setUsername('');
                  setPassword('');
                }}
                className="w-full text-slate-600 hover:text-slate-800 text-sm font-medium py-2 transition-colors"
              >
                Back to Teacher Login
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-10 text-white text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-6 shadow-lg">
              <GraduationCap size={42} />
            </div>
            <h1 className="text-4xl font-bold mb-2">Welcome Back</h1>
            <p className="text-blue-100 text-lg">Hauna Central Management System</p>
          </div>

          <div className="p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Teacher Login</h2>
              <p className="text-gray-600">Access your profile with your phone number</p>
            </div>

            <form onSubmit={handleTeacherSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="text-gray-400" size={22} />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your phone number"
                    autoFocus
                  />
                </div>
                <p className="mt-3 text-sm text-gray-500 flex items-start gap-2">
                  <span className="text-blue-600 font-semibold mt-0.5">•</span>
                  <span>Use the phone number registered with your school</span>
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-3 font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <LogIn size={22} />
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>

          <div className="bg-gray-50 px-10 py-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setShowStaffLogin(true);
                setError('');
              }}
              className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium py-2 transition-colors group"
            >
              <Users size={16} className="group-hover:scale-110 transition-transform" />
              <span>Employee / Admin Login</span>
            </button>
          </div>
        </div>

        <div className="text-center mt-8 text-white/80 text-sm">
          <p>Hauna Central Management System</p>
          <p className="mt-1">Secure access for teachers and staff</p>
        </div>
      </div>
    </div>
  );
}
