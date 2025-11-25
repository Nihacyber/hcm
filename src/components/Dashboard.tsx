import { useState, useEffect } from 'react';
import { Permission, User } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Building2, GraduationCap, Users, BookOpen, Target, TrendingUp, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import AttendanceAnalytics from './AttendanceAnalytics';

interface Props {
  currentUser: User;
  currentPermissions: Permission;
}

interface Stats {
  schools: number;
  teachers: number;
  mentors: number;
  trainingPrograms: number;
  activeAssignments: number;
  completedAssignments: number;
  overdueAssignments: number;
  completionRate: number;
  pendingFollowups: number;
}

interface RecentActivity {
  type: string;
  description: string;
  timestamp: string;
}

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateAutoProgress = (assignment: any): number => {
  if (assignment.status === 'completed') {
    return 100;
  }

  const program = assignment.training_program;
  if (!program?.start_date || !program?.end_date) {
    return assignment.progress_percentage || 0;
  }

  const startDate = new Date(program.start_date);
  const endDate = new Date(program.end_date);
  const today = new Date();

  if (today < startDate) {
    return 0;
  }

  if (today >= endDate) {
    return assignment.status === 'completed' ? 100 : assignment.progress_percentage || 0;
  }

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysPassed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const autoProgress = Math.round((daysPassed / totalDays) * 100);

  return Math.min(100, Math.max(0, autoProgress));
};

export default function Dashboard({ currentUser, currentPermissions }: Props) {
  const [stats, setStats] = useState<Stats>({
    schools: 0,
    teachers: 0,
    mentors: 0,
    trainingPrograms: 0,
    activeAssignments: 0,
    completedAssignments: 0,
    overdueAssignments: 0,
    completionRate: 0,
    pendingFollowups: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [pendingFollowupSchools, setPendingFollowupSchools] = useState<any[]>([]);

  const canViewReports = currentPermissions.can_view_reports;
  const isAdminOrEmployee = currentUser.role === 'admin' || currentUser.role === 'employee';

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      let assignedSchoolIds: string[] = [];

      if (currentUser.role !== 'admin' && currentUser.id) {
        const userAssignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });
        assignedSchoolIds = userAssignments?.map((a: any) => a.school_id) || [];
      }

      // Build filters for role-based access
      let schoolFilter = {};
      let teacherFilter = {};
      let mentorFilter = {};

      if (currentUser.role !== 'admin' && assignedSchoolIds.length > 0) {
        schoolFilter = { id: { $in: assignedSchoolIds } };
        teacherFilter = { school_id: { $in: assignedSchoolIds } };
        mentorFilter = { school_id: { $in: assignedSchoolIds } };
      } else if (currentUser.role !== 'admin') {
        // No access if not admin and no assigned schools
        schoolFilter = { id: 'none' };
        teacherFilter = { id: 'none' };
        mentorFilter = { id: 'none' };
      }

      const [
        schools,
        teachers,
        mentorSchools,
        programs,
        assignmentsData
      ] = await Promise.all([
        db.count(Collections.SCHOOLS, schoolFilter),
        db.count(Collections.TEACHERS, teacherFilter),
        db.count(Collections.MENTOR_SCHOOLS, mentorFilter),
        db.count(Collections.TRAINING_PROGRAMS, { status: 'active' }),
        db.find(Collections.TRAINING_ASSIGNMENTS, {})
      ]);

      // Load programs for assignments to calculate progress
      const allPrograms = await db.find(Collections.TRAINING_PROGRAMS, {});
      const assignments = assignmentsData.map((a: any) => ({
        ...a,
        training_program: allPrograms.find(p => p.id === a.training_program_id)
      }));

      const activeAssignments = assignments.filter((a: any) => a.status === 'in_progress' || a.status === 'assigned').length;
      const completedAssignments = assignments.filter((a: any) => a.status === 'completed').length;
      const overdueAssignments = assignments.filter((a: any) => a.status === 'overdue').length;

      const totalAutoProgress = assignments.reduce((sum: number, assignment: any) => {
        const progress = calculateAutoProgress(assignment);
        return sum + progress;
      }, 0);
      const completionRate = assignments.length > 0 ? Math.round(totalAutoProgress / assignments.length) : 0;

      const today = getLocalDate();
      const followupData = await db.find(
        Collections.SCHOOL_FOLLOWUPS,
        {
          employee_id: currentUser.id,
          next_followup_date: { $lte: today }
        },
        { limit: 100 }
      );

      const uniqueSchoolIds = new Set(followupData?.map((f: any) => f.school_id) || []);
      const pendingFollowups = uniqueSchoolIds.size;

      const schoolsNeedingFollowup = await db.find(
        Collections.SCHOOLS,
        { id: { $in: Array.from(uniqueSchoolIds) } },
        { limit: 5 }
      );

      setPendingFollowupSchools(schoolsNeedingFollowup || []);

      setStats({
        schools,
        teachers,
        mentors: mentorSchools,
        trainingPrograms: programs,
        activeAssignments,
        completedAssignments,
        overdueAssignments,
        completionRate,
        pendingFollowups,
      });

      const activity: RecentActivity[] = [];

      // Load recent schools
      let recentSchoolsFilter = {};
      if (currentUser.role !== 'admin' && assignedSchoolIds.length > 0) {
        recentSchoolsFilter = { id: { $in: assignedSchoolIds } };
      } else if (currentUser.role !== 'admin') {
        recentSchoolsFilter = { id: 'none' };
      }

      const recentSchools = await db.find(
        Collections.SCHOOLS,
        recentSchoolsFilter,
        { sort: { created_at: -1 }, limit: 3 }
      );

      recentSchools?.forEach((school: any) => {
        activity.push({
          type: 'school',
          description: `New school added: ${school.name}`,
          timestamp: school.created_at,
        });
      });

      // Load recent teachers
      let recentTeachersFilter = {};
      if (currentUser.role !== 'admin' && assignedSchoolIds.length > 0) {
        recentTeachersFilter = { school_id: { $in: assignedSchoolIds } };
      } else if (currentUser.role !== 'admin') {
        recentTeachersFilter = { id: 'none' };
      }

      const recentTeachers = await db.find(
        Collections.TEACHERS,
        recentTeachersFilter,
        { sort: { created_at: -1 }, limit: 3 }
      );

      recentTeachers?.forEach((teacher: any) => {
        activity.push({
          type: 'teacher',
          description: `New teacher added: ${teacher.first_name} ${teacher.last_name}`,
          timestamp: teacher.created_at,
        });
      });

      activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activity.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }

    setLoading(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Overview of your educational management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Schools</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.schools}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Building2 className="text-blue-600" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Teachers</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.teachers}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <GraduationCap className="text-green-600" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mentors</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.mentors}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Users className="text-yellow-600" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Training Programs</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.trainingPrograms}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <BookOpen className="text-purple-600" size={28} />
            </div>
          </div>
        </div>
      </div>

      {stats.pendingFollowups > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Calendar className="text-orange-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Schools Need Followup</h3>
                <p className="text-sm text-gray-600">You have {stats.pendingFollowups} school(s) that need followup today</p>
              </div>
            </div>
            <span className="bg-orange-600 text-white text-sm font-bold px-3 py-1 rounded-full">
              {stats.pendingFollowups}
            </span>
          </div>
          {pendingFollowupSchools.length > 0 && (
            <div className="mt-4 space-y-2">
              {pendingFollowupSchools.map((school) => (
                <div key={school.id} className="bg-white rounded-lg p-3 border border-orange-200">
                  <p className="font-medium text-gray-900">{school.name}</p>
                  <p className="text-xs text-gray-500">Code: {school.code}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {canViewReports && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <Target className="text-blue-600" size={24} />
                <h3 className="text-lg font-bold text-gray-900">Active Assignments</h3>
              </div>
              <p className="text-4xl font-bold text-blue-600">{stats.activeAssignments}</p>
              <p className="text-sm text-gray-600 mt-2">In progress or assigned</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="text-green-600" size={24} />
                <h3 className="text-lg font-bold text-gray-900">Completed</h3>
              </div>
              <p className="text-4xl font-bold text-green-600">{stats.completedAssignments}</p>
              <p className="text-sm text-gray-600 mt-2">Successfully finished</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="text-red-600" size={24} />
                <h3 className="text-lg font-bold text-gray-900">Overdue</h3>
              </div>
              <p className="text-4xl font-bold text-red-600">{stats.overdueAssignments}</p>
              <p className="text-sm text-gray-600 mt-2">Require attention</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="text-blue-600" size={24} />
              <h3 className="text-lg font-bold text-gray-900">Average Training Progress</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-8">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-green-500 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm transition-all duration-500"
                    style={{ width: `${stats.completionRate}%` }}
                  >
                    {stats.completionRate > 10 && `${stats.completionRate}%`}
                  </div>
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stats.completionRate}%</div>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Based on training duration and time elapsed • {stats.completedAssignments} completed
            </p>
          </div>
        </>
      )}

      {isAdminOrEmployee && <AttendanceAnalytics />}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`p-2 rounded-lg ${activity.type === 'school' ? 'bg-blue-100' : 'bg-green-100'
                  }`}>
                  {activity.type === 'school' ? (
                    <Building2 className={activity.type === 'school' ? 'text-blue-600' : 'text-green-600'} size={16} />
                  ) : (
                    <GraduationCap className="text-green-600" size={16} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        )}
      </div>
    </div>
  );
}
