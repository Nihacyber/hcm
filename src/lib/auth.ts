import { User, Permission, Teacher } from './models';
import { api } from './api';
import { trackDeviceLogin } from './deviceTracking';

const STORAGE_KEY = 'hcms_current_user';
const TEACHER_STORAGE_KEY = 'hcms_current_teacher';

export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const login = async (username: string, password: string): Promise<{ user: User; permissions: Permission; error?: string } | null> => {
  try {
    // Use server-side authentication endpoint
    const response = await api.post<{ user: User; permissions: Permission }>('/auth/login', {
      username,
      password
    });

    if (!response || !response.user) {
      return null;
    }

    const { user, permissions } = response;

    // Track device login
    const deviceCheck = await trackDeviceLogin(user.id!);
    if (!deviceCheck.allowed) {
      return { user, permissions: getDefaultPermissions(user.id!), error: deviceCheck.reason };
    }

    const userWithPermissions = {
      user,
      permissions: permissions || getDefaultPermissions(user.id!)
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(userWithPermissions));
    return userWithPermissions;
  } catch (error: any) {
    console.error('Login error:', error);
    return { user: {} as User, permissions: {} as Permission, error: error.message || 'Login failed' };
  }
};

export const teacherLogin = async (phone: string): Promise<Teacher | null> => {
  try {
    // Use server-side authentication endpoint
    const response = await api.post<{ teacher: Teacher }>('/auth/teacher-login', {
      phone
    });

    if (!response || !response.teacher) {
      return null;
    }

    const { teacher } = response;

    localStorage.setItem(TEACHER_STORAGE_KEY, JSON.stringify(teacher));
    return teacher;
  } catch (error) {
    console.error('Teacher login error:', error);
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TEACHER_STORAGE_KEY);
};

export const getCurrentUser = (): { user: User; permissions: Permission } | null => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const getCurrentTeacher = (): Teacher | null => {
  const stored = localStorage.getItem(TEACHER_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const generateUsername = (fullName: string): string => {
  const cleaned = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const random = Math.floor(Math.random() * 1000);
  return `${cleaned}${random}`;
};

export const generatePassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const getDefaultPermissions = (userId: string): Permission => ({
  id: '',
  user_id: userId,
  can_delete_schools: false,
  can_manage_users: false,
  can_assign_training: false,
  can_view_reports: false,
  can_manage_schools: false,
  can_manage_teachers: false,
  can_manage_mentors: false,
  can_manage_admin_personnel: false,
  can_manage_training_programs: false,
});
