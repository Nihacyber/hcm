import { useState, useEffect } from 'react';
import { TrainingAssignment, TrainingProgram, Teacher, Permission, TrainingAttendance, User } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Plus, Edit2, Trash2, Target, CheckCircle2, Clock, AlertCircle, ClipboardCheck, Users } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import Notification from './Notification';

interface Props {
  currentUser: User;
  currentPermissions: Permission;
}

type AssignmentWithDetails = TrainingAssignment & {
  training_program?: TrainingProgram;
  teacher?: Teacher & { school?: any };
};

type SchoolGroup = {
  school_id: string;
  school_name: string;
  assignments: AssignmentWithDetails[];
};

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateAutoProgress = (assignment: AssignmentWithDetails): number => {
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

export default function TrainingAssignmentManagement({ currentUser, currentPermissions }: Props) {
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showBulkAttendanceModal, setShowBulkAttendanceModal] = useState(false);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [notification, setNotification] = useState<{ isOpen: boolean; type: 'success' | 'error' | 'info' | 'warning'; title: string; message?: string } | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<TrainingAssignment | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithDetails | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<TrainingAttendance[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'school'>('school');
  const [bulkAttendanceData, setBulkAttendanceData] = useState<{ [key: string]: boolean }>({});
  const [bulkAttendanceForm, setBulkAttendanceForm] = useState({
    attendance_date: getLocalDate(),
    status: 'present' as 'present' | 'absent' | 'late' | 'excused',
    notes: '',
  });
  const [attendanceForm, setAttendanceForm] = useState({
    attendance_date: getLocalDate(),
    status: 'present' as 'present' | 'absent' | 'late' | 'excused',
    notes: '',
  });

  const [formData, setFormData] = useState({
    training_program_id: '',
    teacher_id: '',
    due_date: '',
    status: 'assigned' as 'assigned' | 'in_progress' | 'completed' | 'overdue',
    progress_percentage: 0,
    completion_date: '',
    score: '',
  });

  const [bulkAssignForm, setBulkAssignForm] = useState({
    training_program_id: '',
    due_date: '',
    school_id: 'all',
  });

  const canAssign = currentPermissions.can_assign_training;

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    setLoading(true);

    try {
      let assignedSchoolIds: string[] = [];

      if (currentUser.role !== 'admin' && currentUser.id) {
        const userAssignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });
        assignedSchoolIds = userAssignments?.map((a: any) => a.school_id) || [];
      }

      // Build filter for assignments
      let assignmentFilter: any = {};
      if (filterStatus !== 'all') {
        assignmentFilter.status = filterStatus;
      }

      // Load data in parallel
      const [assignmentsData, programsData, allTeachers, allSchools] = await Promise.all([
        db.find(Collections.TRAINING_ASSIGNMENTS, assignmentFilter, { sort: { assigned_date: -1 } }),
        db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, { status: 'active' }, { sort: { title: 1 } }),
        db.find<Teacher>(Collections.TEACHERS, { status: 'active' }, { sort: { last_name: 1 } }),
        db.find(Collections.SCHOOLS, {}, { sort: { name: 1 } })
      ]);

      // Map assignments with joined data
      let mapped = assignmentsData.map((a: any) => {
        const teacher = allTeachers.find(t => t.id === a.teacher_id);
        const school = teacher?.school_id ? allSchools.find(s => s.id === teacher.school_id) : undefined;
        const program = programsData.find(p => p.id === a.training_program_id);

        return {
          ...a,
          training_program: program,
          teacher: teacher ? { ...teacher, school } : undefined
        };
      });



      // Filter by assigned schools if not admin
      if (currentUser.role !== 'admin' && assignedSchoolIds.length > 0) {
        const beforeFilter = mapped.length;
        mapped = mapped.filter((a: any) => a.teacher && assignedSchoolIds.includes(a.teacher.school_id));
        console.log(`Filtered by assigned schools: ${beforeFilter} -> ${mapped.length}`);
      }

      console.log('Final assignments to display:', mapped.length);
      console.log('==================================');

      setAssignments(mapped);
      setPrograms(programsData);

      // Filter teachers and schools by assigned schools
      let filteredTeachers = allTeachers;
      let filteredSchools = allSchools;

      if (currentUser.role !== 'admin' && assignedSchoolIds.length > 0) {
        filteredTeachers = allTeachers.filter(t => t.school_id && assignedSchoolIds.includes(t.school_id));
        filteredSchools = allSchools.filter((s: any) => s.id && assignedSchoolIds.includes(s.id));
      }

      setTeachers(filteredTeachers.map(t => ({
        ...t,
        school: allSchools.find((s: any) => s.id === t.school_id)
      })));
      setSchools(filteredSchools);
    } catch (error) {
      console.error('Error loading training assignment data:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      training_program_id: formData.training_program_id,
      teacher_id: formData.teacher_id,
      due_date: formData.due_date || null,
      status: formData.status,
      progress_percentage: formData.progress_percentage,
      completion_date: formData.completion_date || null,
      score: formData.score ? parseInt(formData.score) : null,
    };

    if (editingAssignment && editingAssignment.id) {
      await db.updateById(Collections.TRAINING_ASSIGNMENTS, editingAssignment.id, data);
    } else {
      await db.insertOne(Collections.TRAINING_ASSIGNMENTS, {
        ...data,
        assigned_by: currentUser.id,
        assigned_date: getLocalDate(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
    }

    loadData();
    resetForm();
  };

  const handleBulkAssign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bulkAssignForm.training_program_id) {
      setNotification({
        isOpen: true,
        type: 'warning',
        title: 'Training Program Required',
        message: 'Please select a training program to continue'
      });
      return;
    }

    let assignedSchoolIds: string[] = [];

    if (currentUser.role !== 'admin' && currentUser.id) {
      const userAssignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });
      assignedSchoolIds = userAssignments?.map((a: any) => a.school_id) || [];
    }

    let teachersToAssign = teachers;

    if (bulkAssignForm.school_id !== 'all') {
      teachersToAssign = teachers.filter(t => t.school_id === bulkAssignForm.school_id);
    }

    if (currentUser.role !== 'admin') {
      teachersToAssign = teachersToAssign.filter(t => t.school_id && assignedSchoolIds.includes(t.school_id));
    }

    if (teachersToAssign.length === 0) {
      setNotification({
        isOpen: true,
        type: 'info',
        title: 'No Teachers Found',
        message: 'No teachers available to assign to this training program'
      });
      return;
    }

    const existingAssignments = await db.find(Collections.TRAINING_ASSIGNMENTS, {
      training_program_id: bulkAssignForm.training_program_id
    });

    const existingTeacherIds = new Set(existingAssignments?.map((a: any) => a.teacher_id) || []);

    const assignmentsToCreate = teachersToAssign
      .filter(t => !existingTeacherIds.has(t.id))
      .map(teacher => ({
        training_program_id: bulkAssignForm.training_program_id,
        teacher_id: teacher.id,
        due_date: bulkAssignForm.due_date || null,
        status: 'assigned' as const,
        progress_percentage: 0,
        assigned_date: getLocalDate(),
        assigned_by: currentUser.id,
      }));

    if (assignmentsToCreate.length === 0) {
      setNotification({
        isOpen: true,
        type: 'info',
        title: 'Already Assigned',
        message: 'All teachers are already assigned to this training program'
      });
      return;
    }

    await db.insertMany(Collections.TRAINING_ASSIGNMENTS, assignmentsToCreate as any);

    setNotification({
      isOpen: true,
      type: 'success',
      title: 'Assignments Created',
      message: `Successfully assigned ${assignmentsToCreate.length} teacher(s) to the training program`
    });
    setShowBulkAssignModal(false);
    setBulkAssignForm({
      training_program_id: '',
      due_date: '',
      school_id: 'all',
    });
    loadData();
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Assignment',
      message: 'Are you sure you want to delete this training assignment? This action cannot be undone.',
      onConfirm: async () => {
        await db.deleteById(Collections.TRAINING_ASSIGNMENTS, id);
        setConfirmDialog(null);
        loadData();
      }
    });
  };

  const resetForm = () => {
    setFormData({
      training_program_id: '',
      teacher_id: '',
      due_date: '',
      status: 'assigned',
      progress_percentage: 0,
      completion_date: '',
      score: '',
    });
    setEditingAssignment(null);
    setShowModal(false);
  };

  const openEditModal = (assignment: AssignmentWithDetails) => {
    setEditingAssignment(assignment);
    setFormData({
      training_program_id: assignment.training_program_id,
      teacher_id: assignment.teacher_id,
      due_date: assignment.due_date || '',
      status: assignment.status,
      progress_percentage: assignment.progress_percentage,
      completion_date: assignment.completion_date || '',
      score: assignment.score?.toString() || '',
    });
    setShowModal(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="text-green-600" size={20} />;
      case 'in_progress': return <Clock className="text-blue-600" size={20} />;
      case 'overdue': return <AlertCircle className="text-red-600" size={20} />;
      default: return <Target className="text-gray-600" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openAttendanceModal = async (assignment: AssignmentWithDetails) => {
    setSelectedAssignment(assignment);
    const data = await db.find<TrainingAttendance>(
      Collections.TRAINING_ATTENDANCE,
      { assignment_id: assignment.id },
      { sort: { attendance_date: -1 } }
    );

    setAttendanceRecords(data);
    setShowAttendanceModal(true);
  };

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    try {
      await db.upsert(
        Collections.TRAINING_ATTENDANCE,
        {
          teacher_id: selectedAssignment.teacher_id,
          training_program_id: selectedAssignment.training_program_id,
          attendance_date: attendanceForm.attendance_date
        },
        {
          assignment_id: selectedAssignment.id,
          teacher_id: selectedAssignment.teacher_id,
          training_program_id: selectedAssignment.training_program_id,
          attendance_date: attendanceForm.attendance_date,
          status: attendanceForm.status,
          notes: attendanceForm.notes,
          recorded_by: currentUser.id,
          updated_at: new Date().toISOString(),
        } as any
      );
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message
      });
      return;
    }

    setNotification({
      isOpen: true,
      type: 'success',
      title: 'Attendance Recorded',
      message: 'Attendance has been successfully recorded'
    });

    openAttendanceModal(selectedAssignment);
    setAttendanceForm({
      attendance_date: getLocalDate(),
      status: 'present',
      notes: '',
    });
  };

  const handleDeleteAttendance = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Attendance Record',
      message: 'Are you sure you want to delete this attendance record? This action cannot be undone.',
      onConfirm: async () => {
        await db.deleteById(Collections.TRAINING_ATTENDANCE, id);
        setConfirmDialog(null);
        if (selectedAssignment) openAttendanceModal(selectedAssignment);
      }
    });
  };

  const openBulkAttendanceModal = async (program: TrainingProgram) => {
    setSelectedProgram(program);
    setBulkAttendanceData({});
    setBulkAttendanceForm({
      attendance_date: getLocalDate(),
      status: 'present',
      notes: '',
    });
    setShowBulkAttendanceModal(true);
  };

  const toggleTeacherSelection = (assignmentId: string) => {
    setBulkAttendanceData(prev => ({
      ...prev,
      [assignmentId]: !prev[assignmentId]
    }));
  };

  const toggleAllTeachers = () => {
    const programAssignments = assignments.filter(
      a => a.training_program_id === selectedProgram?.id
    );
    const allSelected = programAssignments.every(a => bulkAttendanceData[a.id]);

    const newData: { [key: string]: boolean } = {};
    programAssignments.forEach(a => {
      newData[a.id] = !allSelected;
    });
    setBulkAttendanceData(newData);
  };

  const handleBulkAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedAssignmentIds = Object.keys(bulkAttendanceData).filter(
      id => bulkAttendanceData[id]
    );

    if (selectedAssignmentIds.length === 0) {
      setNotification({
        isOpen: true,
        type: 'warning',
        title: 'No Teachers Selected',
        message: 'Please select at least one teacher to record attendance'
      });
      return;
    }

    const attendanceRecords = selectedAssignmentIds.map(assignmentId => {
      const assignment = assignments.find(a => a.id === assignmentId);
      return {
        assignment_id: assignmentId,
        teacher_id: assignment!.teacher_id,
        training_program_id: assignment!.training_program_id,
        attendance_date: bulkAttendanceForm.attendance_date,
        status: bulkAttendanceForm.status,
        notes: bulkAttendanceForm.notes,
        recorded_by: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    try {
      // Use insertMany for bulk insert (MongoDB will handle duplicates based on unique indexes)
      await db.insertMany(Collections.TRAINING_ATTENDANCE, attendanceRecords as any);
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: error.message
      });
      return;
    }

    setNotification({
      isOpen: true,
      type: 'success',
      title: 'Attendance Recorded',
      message: `Attendance recorded for ${selectedAssignmentIds.length} teacher(s)`
    });
    setShowBulkAttendanceModal(false);
    setBulkAttendanceData({});
  };

  const groupAssignmentsBySchool = (): SchoolGroup[] => {
    const filtered = selectedSchoolFilter
      ? assignments.filter(a => a.teacher?.school_id === selectedSchoolFilter)
      : assignments.filter(a => a.teacher?.school_id);

    const grouped = new Map<string, SchoolGroup>();

    filtered.forEach(assignment => {
      if (!assignment.teacher?.school_id) return;

      const schoolId = assignment.teacher.school_id;
      const schoolName = assignment.teacher.school?.name || 'Unknown School';

      if (!grouped.has(schoolId)) {
        grouped.set(schoolId, {
          school_id: schoolId,
          school_name: schoolName,
          assignments: []
        });
      }

      grouped.get(schoolId)!.assignments.push(assignment);
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.school_name.localeCompare(b.school_name)
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const schoolGroups = groupAssignmentsBySchool();
  const filteredAssignments = selectedSchoolFilter
    ? assignments.filter(a => a.teacher?.school_id === selectedSchoolFilter)
    : assignments.filter(a => a.teacher?.school_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Training Assignments</h2>
          <p className="text-gray-600 mt-1">Track teacher training progress and completion</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'list' | 'school')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
          >
            <option value="school">Group by School</option>
            <option value="list">List View</option>
          </select>
          <select
            value={selectedSchoolFilter}
            onChange={(e) => setSelectedSchoolFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">All Schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Status</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          <button
            onClick={() => {
              if (programs.length === 0) {
                setNotification({
                  isOpen: true,
                  type: 'info',
                  title: 'No Training Programs',
                  message: 'Please create a training program first before recording attendance'
                });
                return;
              }
              openBulkAttendanceModal(programs[0]);
            }}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Users size={20} />
            Bulk Attendance
          </button>
          {canAssign && (
            <>
              <button
                onClick={() => setShowBulkAssignModal(true)}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Users size={20} />
                Bulk Assign
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                Assign Training
              </button>
            </>
          )}
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Training Program</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {assignment.teacher ? `${assignment.teacher.first_name} ${assignment.teacher.last_name}` : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {assignment.teacher?.school?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{assignment.training_program?.title || 'N/A'}</div>
                    <div className="text-xs text-gray-500">
                      {assignment.training_program?.duration_hours || 0} hours
                      {assignment.training_program?.start_date && assignment.training_program?.end_date && (
                        <span className="ml-2">
                          • {new Date(assignment.training_program.start_date).toLocaleDateString()} - {new Date(assignment.training_program.end_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${calculateAutoProgress(assignment) === 100 ? 'bg-green-600' :
                              calculateAutoProgress(assignment) >= 50 ? 'bg-blue-600' :
                                'bg-yellow-600'
                              }`}
                            style={{ width: `${calculateAutoProgress(assignment)}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{calculateAutoProgress(assignment)}%</span>
                      </div>
                      {assignment.training_program?.start_date && assignment.training_program?.end_date && assignment.status !== 'completed' && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium" title="Progress calculated based on training duration">
                          Auto
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(assignment.status)}
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                        {assignment.status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openAttendanceModal(assignment)}
                        className="text-green-600 hover:text-green-900"
                        title="Manage Attendance"
                      >
                        <ClipboardCheck size={18} />
                      </button>
                      {canAssign && (
                        <>
                          <button
                            onClick={() => openEditModal(assignment)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(assignment.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {schoolGroups.map((group) => (
            <div key={group.school_id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{group.school_name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {group.assignments.length} assignment{group.assignments.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      Completed: {group.assignments.filter(a => a.status === 'completed').length}
                    </div>
                    <div className="text-sm text-gray-600">
                      In Progress: {group.assignments.filter(a => a.status === 'in_progress').length}
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Training Program</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {group.assignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {assignment.teacher ? `${assignment.teacher.first_name} ${assignment.teacher.last_name}` : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{assignment.training_program?.title || 'N/A'}</div>
                          <div className="text-xs text-gray-500">
                            {assignment.training_program?.duration_hours || 0} hours
                            {assignment.training_program?.start_date && assignment.training_program?.end_date && (
                              <span className="ml-2">
                                • {new Date(assignment.training_program.start_date).toLocaleDateString()} - {new Date(assignment.training_program.end_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${calculateAutoProgress(assignment) === 100 ? 'bg-green-600' :
                                    calculateAutoProgress(assignment) >= 50 ? 'bg-blue-600' :
                                      'bg-yellow-600'
                                    }`}
                                  style={{ width: `${calculateAutoProgress(assignment)}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600">{calculateAutoProgress(assignment)}%</span>
                            </div>
                            {assignment.training_program?.start_date && assignment.training_program?.end_date && assignment.status !== 'completed' && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium" title="Progress calculated based on training duration">
                                Auto
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(assignment.status)}
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                              {assignment.status.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openAttendanceModal(assignment)}
                              className="text-green-600 hover:text-green-900"
                              title="Manage Attendance"
                            >
                              <ClipboardCheck size={18} />
                            </button>
                            {canAssign && (
                              <>
                                <button
                                  onClick={() => openEditModal(assignment)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleDelete(assignment.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {assignments.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Target className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">No training assignments found. Assign your first training to get started.</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teacher *</label>
                  <select
                    required
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Training Program *</label>
                  <select
                    required
                    value={formData.training_program_id}
                    onChange={(e) => setFormData({ ...formData, training_program_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Program</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress_percentage}
                    onChange={(e) => setFormData({ ...formData, progress_percentage: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Score (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Completion Date</label>
                <input
                  type="date"
                  value={formData.completion_date}
                  onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingAssignment ? 'Update' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAttendanceModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4">
              <h3 className="text-xl font-bold">Attendance Management</h3>
              <p className="text-gray-600">
                {selectedAssignment.teacher?.first_name} {selectedAssignment.teacher?.last_name} - {selectedAssignment.training_program?.title}
              </p>
            </div>

            <form onSubmit={handleAttendanceSubmit} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900">Record New Attendance</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={attendanceForm.attendance_date}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, attendance_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    value={attendanceForm.status}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={attendanceForm.notes}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
                    placeholder="Optional notes"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Record Attendance
              </button>
            </form>

            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 mb-3">Attendance History</h4>
              {attendanceRecords.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No attendance records yet</p>
              ) : (
                <div className="space-y-2">
                  {attendanceRecords.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <span className="font-medium">{new Date(record.attendance_date).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${record.status === 'present' ? 'bg-green-100 text-green-800' :
                          record.status === 'absent' ? 'bg-red-100 text-red-800' :
                            record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                          }`}>
                          {record.status}
                        </span>
                        {record.notes && (
                          <span className="text-sm text-gray-600">{record.notes}</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteAttendance(record.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowAttendanceModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showBulkAttendanceModal && selectedProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Bulk Attendance Recording</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Training Program</label>
              <select
                value={selectedProgram.id}
                onChange={(e) => {
                  const program = programs.find(p => p.id === e.target.value);
                  if (program) openBulkAttendanceModal(program);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.title}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handleBulkAttendanceSubmit} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h4 className="font-semibold text-gray-900">Attendance Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={bulkAttendanceForm.attendance_date}
                      onChange={(e) => setBulkAttendanceForm({ ...bulkAttendanceForm, attendance_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                    <select
                      value={bulkAttendanceForm.status}
                      onChange={(e) => setBulkAttendanceForm({ ...bulkAttendanceForm, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                      <option value="excused">Excused</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input
                      type="text"
                      value={bulkAttendanceForm.notes}
                      onChange={(e) => setBulkAttendanceForm({ ...bulkAttendanceForm, notes: e.target.value })}
                      placeholder="Optional notes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                  <h4 className="font-semibold text-gray-900">
                    Select Teachers ({Object.values(bulkAttendanceData).filter(Boolean).length} selected)
                  </h4>
                  <button
                    type="button"
                    onClick={toggleAllTeachers}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {assignments.filter(a => a.training_program_id === selectedProgram.id).every(a => bulkAttendanceData[a.id])
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto p-4">
                  {(() => {
                    const programAssignments = assignments.filter(a => a.training_program_id === selectedProgram.id);

                    if (programAssignments.length === 0) {
                      return <p className="text-gray-500 text-center py-4">No teachers assigned to this training program</p>;
                    }

                    const groupedBySchool = new Map<string, AssignmentWithDetails[]>();
                    programAssignments.forEach(assignment => {
                      if (!assignment.teacher?.school_id) return;
                      const schoolId = assignment.teacher.school_id;
                      if (!groupedBySchool.has(schoolId)) {
                        groupedBySchool.set(schoolId, []);
                      }
                      groupedBySchool.get(schoolId)!.push(assignment);
                    });

                    const sortedGroups = Array.from(groupedBySchool.entries()).sort((a, b) => {
                      const schoolA = a[1][0]?.teacher?.school?.name || 'Unknown';
                      const schoolB = b[1][0]?.teacher?.school?.name || 'Unknown';
                      return schoolA.localeCompare(schoolB);
                    });

                    return (
                      <div className="space-y-3">
                        {sortedGroups.map(([schoolId, schoolAssignments]) => {
                          const schoolName = schoolAssignments[0]?.teacher?.school?.name || 'Unknown School';
                          return (
                            <div key={schoolId} className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-2 border-b border-blue-200">
                                <h5 className="font-semibold text-gray-900">{schoolName}</h5>
                                <p className="text-xs text-gray-600">
                                  {schoolAssignments.length} teacher{schoolAssignments.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                              <div className="space-y-1 p-2">
                                {schoolAssignments.map((assignment) => (
                                  <label
                                    key={assignment.id}
                                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={bulkAttendanceData[assignment.id] || false}
                                      onChange={() => toggleTeacherSelection(assignment.id)}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-gray-900 text-sm">
                                        {assignment.teacher?.first_name} {assignment.teacher?.last_name}
                                      </div>
                                      <div className="text-xs text-gray-500 truncate">
                                        {assignment.teacher?.email}
                                      </div>
                                    </div>
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                      assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                        assignment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                          'bg-gray-100 text-gray-800'
                                      }`}>
                                      {assignment.status.replace('_', ' ')}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkAttendanceModal(false);
                    setBulkAttendanceData({});
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Record Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Bulk Assign Training</h3>
              <form onSubmit={handleBulkAssign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Training Program *</label>
                  <select
                    value={bulkAssignForm.training_program_id}
                    onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, training_program_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Program</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>{program.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Filter</label>
                  <select
                    value={bulkAssignForm.school_id}
                    onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, school_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All My Schools</option>
                    {schools.map(school => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-500 mt-1">
                    This will assign all active teachers from selected school(s) to the training program
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={bulkAssignForm.due_date}
                    onChange={(e) => setBulkAssignForm({ ...bulkAssignForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Teachers who are already assigned to this program will be skipped.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkAssignModal(false);
                      setBulkAssignForm({
                        training_program_id: '',
                        due_date: '',
                        school_id: 'all',
                      });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Assign All Teachers
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          type="danger"
        />
      )}

      {notification && (
        <Notification
          isOpen={notification.isOpen}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}
