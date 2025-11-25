import { useState, useEffect } from 'react';
import { Teacher, School, Permission, TrainingAssignment, TrainingProgram, TrainingAttendance, User } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Plus, Edit2, Trash2, GraduationCap, Eye, BookOpen, Search } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  currentUser: User;
  currentPermissions: Permission;
}

type TeacherWithSchool = Teacher & {
  school?: School;
  training_programs?: string[];
};

type AssignmentWithDetails = TrainingAssignment & {
  training_program?: TrainingProgram;
};

export default function TeacherManagement({ currentUser, currentPermissions }: Props) {
  const [teachers, setTeachers] = useState<TeacherWithSchool[]>([]);
  const [allTeachers, setAllTeachers] = useState<TeacherWithSchool[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<TeacherWithSchool[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('');
  const [phoneSearch, setPhoneSearch] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherWithSchool | null>(null);
  const [teacherAssignments, setTeacherAssignments] = useState<AssignmentWithDetails[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<TrainingAttendance[]>([]);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    school_id: '',
    subject_specialization: '',
    qualification: '',
    hire_date: '',
    status: 'active' as 'active' | 'on_leave' | 'inactive',
  });

  const canManage = currentPermissions.can_manage_teachers;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let filtered: TeacherWithSchool[];

    if (phoneSearch.trim()) {
      const searchTerm = phoneSearch.trim().replace(/\s+/g, '');
      filtered = allTeachers.filter(t =>
        t.phone?.replace(/\s+/g, '').includes(searchTerm)
      );
    } else {
      filtered = teachers;
    }

    if (selectedSchoolFilter && !phoneSearch.trim()) {
      filtered = filtered.filter(t => t.school_id === selectedSchoolFilter);
    }

    setFilteredTeachers(filtered);
  }, [selectedSchoolFilter, phoneSearch, teachers, allTeachers]);

  const loadData = async () => {
    setLoading(true);

    try {
      let assignedSchoolIds: string[] = [];

      if (currentUser.role !== 'admin' && currentUser.id) {
        const userAssignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });
        assignedSchoolIds = userAssignments?.map((a: any) => a.school_id) || [];
      }

      // Load schools
      let schoolsData: School[] = [];
      if (currentUser.role !== 'admin' && assignedSchoolIds.length > 0) {
        const allSchools = await db.find<School>(Collections.SCHOOLS, {}, { sort: { name: 1 } });
        schoolsData = allSchools.filter(s => s.id && assignedSchoolIds.includes(s.id));
      } else if (currentUser.role === 'admin') {
        schoolsData = await db.find<School>(Collections.SCHOOLS, {}, { sort: { name: 1 } });
      }

      setSchools(schoolsData);

      // Load all teachers with schools
      const allTeachersData = await db.find<Teacher>(Collections.TEACHERS, {}, { sort: { last_name: 1 } });

      // Load filtered teachers
      let teachersData: Teacher[] = [];
      if (currentUser.role !== 'admin' && assignedSchoolIds.length > 0) {
        teachersData = allTeachersData.filter(t => t.school_id && assignedSchoolIds.includes(t.school_id));
      } else if (currentUser.role === 'admin') {
        teachersData = allTeachersData;
      }

      // Load training assignments for all teachers
      const assignmentsData = await db.find(Collections.TRAINING_ASSIGNMENTS, {});
      const allPrograms = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {});

      // Map teacher assignments
      const teacherTrainingMap = new Map<string, string[]>();
      assignmentsData.forEach((assignment: any) => {
        const program = allPrograms.find(p => p.id === assignment.training_program_id);
        if (program?.title && assignment.teacher_id) {
          if (!teacherTrainingMap.has(assignment.teacher_id)) {
            teacherTrainingMap.set(assignment.teacher_id, []);
          }
          teacherTrainingMap.get(assignment.teacher_id)!.push(program.title);
        }
      });

      // Map teachers with schools and training programs
      const mappedAll = allTeachersData.map(t => ({
        ...t,
        school: schoolsData.find(s => s.id === t.school_id),
        training_programs: teacherTrainingMap.get(t.id!) || []
      }));
      setAllTeachers(mappedAll);

      const mapped = teachersData.map(t => ({
        ...t,
        school: schoolsData.find(s => s.id === t.school_id),
        training_programs: teacherTrainingMap.get(t.id!) || []
      }));
      setTeachers(mapped);
      setFilteredTeachers(mapped);
    } catch (error) {
      console.error('Error loading teacher data:', error);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      ...formData,
      school_id: formData.school_id || null,
      hire_date: formData.hire_date || null,
    };

    try {
      if (editingTeacher && editingTeacher.id) {
        await db.updateById<Teacher>(Collections.TEACHERS, editingTeacher.id, data);
      } else {
        await db.insertOne<Teacher>(Collections.TEACHERS, {
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
      }

      loadData();
      resetForm();
    } catch (error: any) {
      console.error('Error saving teacher:', error);
      alert('Failed to save teacher: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Teacher',
      message: 'Are you sure you want to delete this teacher? This will also delete all their training assignments and attendance records. This action cannot be undone.',
      onConfirm: async () => {
        await db.deleteById(Collections.TEACHERS, id);
        setConfirmDialog(null);
        loadData();
      }
    });
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      school_id: '',
      subject_specialization: '',
      qualification: '',
      hire_date: '',
      status: 'active',
    });
    setEditingTeacher(null);
    setShowModal(false);
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email,
      phone: teacher.phone,
      school_id: teacher.school_id || '',
      subject_specialization: teacher.subject_specialization,
      qualification: teacher.qualification || '',
      hire_date: teacher.hire_date || '',
      status: teacher.status,
    });
    setShowModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'on_leave': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openProfileModal = async (teacher: TeacherWithSchool) => {
    setSelectedTeacher(teacher);

    try {
      const [assignments, attendance] = await Promise.all([
        db.find(Collections.TRAINING_ASSIGNMENTS, { teacher_id: teacher.id }, { sort: { assigned_date: -1 } }),
        db.find<TrainingAttendance>(Collections.TRAINING_ATTENDANCE, { teacher_id: teacher.id }, { sort: { attendance_date: -1 } })
      ]);

      // Load training programs for assignments
      const allPrograms = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {});

      const mappedAssignments = assignments.map((a: any) => ({
        ...a,
        training_program: allPrograms.find(p => p.id === a.training_program_id)
      }));

      // Load programs for attendance
      const mappedAttendance = attendance.map((a: any) => ({
        ...a,
        training_program: allPrograms.find(p => p.id === a.training_program_id)
      }));

      setTeacherAssignments(mappedAssignments);
      setTeacherAttendance(mappedAttendance);
      setShowProfileModal(true);
    } catch (error) {
      console.error('Error loading teacher profile:', error);
    }
  };


  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Teacher Management</h2>
          <p className="text-gray-600 mt-1">Manage teacher profiles and assignments</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by phone..."
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-48"
            />
          </div>
          <select
            value={selectedSchoolFilter}
            onChange={(e) => setSelectedSchoolFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
          >
            <option value="">All Schools</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Add Teacher
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{filteredTeachers.length}</span> of <span className="font-semibold text-gray-900">{phoneSearch.trim() ? allTeachers.length : teachers.length}</span> teachers
          {(selectedSchoolFilter || phoneSearch) && (
            <span className="ml-2 text-blue-600">
              (
              {selectedSchoolFilter && !phoneSearch.trim() && `filtered by ${schools.find(s => s.id === selectedSchoolFilter)?.name}`}
              {phoneSearch && `phone search: "${phoneSearch}" (searching all schools)`}
              )
            </span>
          )}
        </p>
        {(selectedSchoolFilter || phoneSearch) && (
          <button
            onClick={() => {
              setSelectedSchoolFilter('');
              setPhoneSearch('');
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTeachers.map((teacher) => (
              <tr key={teacher.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <GraduationCap className="text-blue-600" size={20} />
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900">{teacher.first_name} {teacher.last_name}</div>
                        {teacher.training_programs && teacher.training_programs.length > 0 && (
                          <div className="flex gap-1">
                            {teacher.training_programs.map((program, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                                title={`Assigned to ${program}`}
                              >
                                {program.includes('C.10') ? 'C.10' : program.substring(0, 8)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{teacher.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{teacher.school?.name || 'Unassigned'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{teacher.subject_specialization || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{teacher.phone || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(teacher.status)}`}>
                    {teacher.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openProfileModal(teacher)}
                      className="text-purple-600 hover:text-purple-900"
                      title="View Profile & Trainings"
                    >
                      <Eye size={18} />
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={() => openEditModal(teacher)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher.id)}
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

      {teachers.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <GraduationCap className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">No teachers found. Add your first teacher to get started.</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
                  <select
                    value={formData.school_id}
                    onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Specialization</label>
                  <input
                    type="text"
                    value={formData.subject_specialization}
                    onChange={(e) => setFormData({ ...formData, subject_specialization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    placeholder="e.g., B.Ed, M.Ed, Ph.D"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                  <input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
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
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
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
                  {editingTeacher ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProfileModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <GraduationCap className="text-blue-600" size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedTeacher.first_name} {selectedTeacher.last_name}
                  </h3>
                  <p className="text-gray-600">{selectedTeacher.email}</p>
                  <p className="text-sm text-gray-500">
                    {selectedTeacher.school?.name || 'Unassigned'} • {selectedTeacher.subject_specialization}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusColor(selectedTeacher.status)}`}>
                  {selectedTeacher.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Login Information</h4>
              <p className="text-sm text-gray-700">
                Teachers can login to the Teacher Portal using their registered phone number.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                <span className="font-semibold">Phone Number:</span> {selectedTeacher.phone || 'Not provided'}
              </p>
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BookOpen size={20} />
                Assigned Training Programs
              </h4>
              {teacherAssignments.length === 0 ? (
                <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No training programs assigned yet</p>
              ) : (
                <div className="space-y-3">
                  {teacherAssignments.map((assignment) => (
                    <div key={assignment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-semibold text-gray-900">{assignment.training_program?.title}</h5>
                          <p className="text-sm text-gray-600">{assignment.training_program?.description}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                          assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            assignment.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                          {assignment.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3">
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <span className="ml-1 font-medium">{assignment.training_program?.duration_hours || 0} hours</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Progress:</span>
                          <span className="ml-1 font-medium">{assignment.progress_percentage}%</span>
                        </div>
                        {assignment.due_date && (
                          <div>
                            <span className="text-gray-500">Due:</span>
                            <span className="ml-1 font-medium">{new Date(assignment.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {assignment.score !== null && (
                          <div>
                            <span className="text-gray-500">Score:</span>
                            <span className="ml-1 font-medium">{assignment.score}%</span>
                          </div>
                        )}
                      </div>
                      {assignment.training_program?.start_date && assignment.training_program?.end_date && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Training Dates:</span> {new Date(assignment.training_program.start_date).toLocaleDateString()} - {new Date(assignment.training_program.end_date).toLocaleDateString()}
                        </div>
                      )}
                      {assignment.training_program?.meeting_link && (
                        <div className="mt-2">
                          <a
                            href={assignment.training_program.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            Join Training Session
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Attendance Summary</h4>
              {teacherAttendance.length === 0 ? (
                <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No attendance records yet</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {teacherAttendance.filter(a => a.status === 'present').length}
                    </div>
                    <div className="text-sm text-gray-600">Present</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {teacherAttendance.filter(a => a.status === 'absent').length}
                    </div>
                    <div className="text-sm text-gray-600">Absent</div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">
                      {teacherAttendance.filter(a => a.status === 'late').length}
                    </div>
                    <div className="text-sm text-gray-600">Late</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {teacherAttendance.filter(a => a.status === 'excused').length}
                    </div>
                    <div className="text-sm text-gray-600">Excused</div>
                  </div>
                </div>
              )}

              {teacherAttendance.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Attendance Details</h5>
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Training Program</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {teacherAttendance.slice(0, 10).map((attendance: any) => {
                        const program = Array.isArray(attendance.training_program) ? attendance.training_program[0] : attendance.training_program;
                        return (
                          <tr key={attendance.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-900">
                              {new Date(attendance.attendance_date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-gray-600">
                              {program?.title || 'N/A'}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                                ${attendance.status === 'present' ? 'bg-green-100 text-green-800' :
                                  attendance.status === 'absent' ? 'bg-red-100 text-red-800' :
                                    attendance.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-blue-100 text-blue-800'}`}>
                                {attendance.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-gray-600 text-xs">
                              {attendance.notes || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {teacherAttendance.length > 10 && (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Showing 10 most recent records out of {teacherAttendance.length} total
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="Confirm"
          cancelText="Cancel"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          type="warning"
        />
      )}
    </div>
  );
}
