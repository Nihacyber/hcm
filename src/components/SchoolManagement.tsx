import { useState, useEffect } from 'react';
import { School, Permission, User, Teacher, Mentor, SchoolFollowup } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Plus, Edit2, Trash2, Building2, GraduationCap, Users, X, Eye, MessageSquare } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  currentUser: User;
  currentPermissions: Permission;
}

type SchoolWithCounts = School & {
  teacherCount: number;
  mentorCount: number;
};

export default function SchoolManagement({ currentUser, currentPermissions }: Props) {
  const [schools, setSchools] = useState<SchoolWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolWithCounts | null>(null);
  const [schoolTeachers, setSchoolTeachers] = useState<Teacher[]>([]);
  const [schoolMentors, setSchoolMentors] = useState<Mentor[]>([]);
  const [schoolFollowups, setSchoolFollowups] = useState<(SchoolFollowup & { employee: User })[]>([]);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showTeacherEditModal, setShowTeacherEditModal] = useState(false);
  const [teacherFormData, setTeacherFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    subject_specialization: '',
    qualification: '',
    status: 'active' as 'active' | 'on_leave' | 'inactive'
  });
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    enrollment_count: 0,
    principal_name: '',
  });

  const canManage = currentPermissions.can_manage_schools;
  const canDelete = currentPermissions.can_delete_schools;

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    setLoading(true);
    try {
      let schoolsData: School[] = [];

      if (currentUser.role !== 'admin' && currentUser.id) {
        const userAssignments = await db.find(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });

        if (userAssignments && userAssignments.length > 0) {
          const assignedSchoolIds = userAssignments.map(a => a.school_id);
          // Get schools matching assigned IDs
          const allSchools = await db.find<School>(Collections.SCHOOLS, {}, { sort: { name: 1 } });
          schoolsData = allSchools.filter(s => s.id && assignedSchoolIds.includes(s.id));
        }
      } else {
        schoolsData = await db.find<School>(Collections.SCHOOLS, {}, { sort: { name: 1 } });
      }

      const schoolsWithCounts = await Promise.all(
        schoolsData.map(async (school) => {
          const [teacherCount, mentorCount] = await Promise.all([
            db.count(Collections.TEACHERS, { school_id: school.id }),
            db.count(Collections.MENTOR_SCHOOLS, { school_id: school.id }),
          ]);

          return {
            ...school,
            teacherCount,
            mentorCount,
          };
        })
      );

      setSchools(schoolsWithCounts);
    } catch (error) {
      console.error('Error loading schools:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingSchool && editingSchool.id) {
        await db.updateById<School>(Collections.SCHOOLS, editingSchool.id, formData);
      } else {
        await db.insertOne<School>(Collections.SCHOOLS, {
          ...formData,
          created_by: currentUser.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
      }

      loadSchools();
      resetForm();
    } catch (error: any) {
      console.error('Error saving school:', error);
      alert('Failed to save school: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete School',
      message: 'Are you sure you want to delete this school? This will also delete all associated teachers, mentors, and training data. This action cannot be undone.',
      onConfirm: async () => {
        await db.deleteById(Collections.SCHOOLS, id);
        setConfirmDialog(null);
        loadSchools();
      }
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      enrollment_count: 0,
      principal_name: '',
    });
    setEditingSchool(null);
    setShowModal(false);
  };

  const openEditModal = (school: School) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      code: school.code,
      address: school.address,
      phone: school.phone,
      email: school.email,
      enrollment_count: school.enrollment_count,
      principal_name: school.principal_name,
    });
    setShowModal(true);
  };

  const openDetailModal = async (school: SchoolWithCounts) => {
    setSelectedSchool(school);
    setShowDetailModal(true);
    await loadSchoolDetails(school.id);
  };

  const loadSchoolDetails = async (schoolId: string) => {
    try {
      const [teachers, mentorSchools, followups] = await Promise.all([
        db.find<Teacher>(Collections.TEACHERS, { school_id: schoolId }, { sort: { last_name: 1 } }),
        db.find(Collections.MENTOR_SCHOOLS, { school_id: schoolId }),
        db.find<SchoolFollowup>(Collections.SCHOOL_FOLLOWUPS, { school_id: schoolId }, { sort: { followup_date: -1 }, limit: 10 })
      ]);

      setSchoolTeachers(teachers);

      // Load mentors for mentor_schools
      if (mentorSchools && mentorSchools.length > 0) {
        const mentorIds = mentorSchools.map((ms: any) => ms.mentor_id).filter(Boolean);
        const allMentors = await db.find<Mentor>(Collections.MENTORS, {});
        const mentors = allMentors.filter(m => m.id && mentorIds.includes(m.id));
        setSchoolMentors(mentors);
      } else {
        setSchoolMentors([]);
      }

      // Load employee data for followups
      if (followups && followups.length > 0) {
        const employeeIds = followups.map((f: any) => f.employee_id).filter(Boolean);
        const users = await db.find<User>(Collections.USERS, {});
        const followupsWithEmployees = followups.map((f: any) => ({
          ...f,
          employee: users.find(u => u.id === f.employee_id) || {} as User
        }));
        setSchoolFollowups(followupsWithEmployees as any);
      } else {
        setSchoolFollowups([]);
      }
    } catch (error) {
      console.error('Error loading school details:', error);
    }
  };

  const openTeacherEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setTeacherFormData({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email,
      phone: teacher.phone || '',
      subject_specialization: teacher.subject_specialization || '',
      qualification: teacher.qualification || '',
      status: teacher.status
    });
    setShowTeacherEditModal(true);
  };

  const handleTeacherUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher || !editingTeacher.id) return;

    try {
      await db.updateById<Teacher>(Collections.TEACHERS, editingTeacher.id, teacherFormData);

      setShowTeacherEditModal(false);
      setEditingTeacher(null);
      if (selectedSchool && selectedSchool.id) {
        await loadSchoolDetails(selectedSchool.id);
      }
    } catch (error: any) {
      console.error('Error updating teacher:', error);
      alert('Failed to update teacher: ' + error.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">School Management</h2>
          <p className="text-gray-600 mt-1">Manage school profiles and information</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add School
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {schools.map((school) => (
          <div key={school.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Building2 className="text-blue-600" size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-gray-900 truncate">{school.name}</h3>
                  <p className="text-xs text-gray-500">Code: {school.code}</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="truncate">
                <span className="font-medium">Principal:</span> {school.principal_name || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Enrollment:</span> {school.enrollment_count}
              </div>
              <div className="flex items-center gap-3 py-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="bg-green-100 p-1 rounded">
                    <GraduationCap className="text-green-600" size={12} />
                  </div>
                  <span className="text-xs font-semibold text-gray-900">{school.teacherCount}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="bg-yellow-100 p-1 rounded">
                    <Users className="text-yellow-600" size={12} />
                  </div>
                  <span className="text-xs font-semibold text-gray-900">{school.mentorCount}</span>
                </div>
              </div>
              <div className="truncate">
                <span className="font-medium">Phone:</span> {school.phone || 'N/A'}
              </div>
              <div className="truncate">
                <span className="font-medium">Email:</span> {school.email || 'N/A'}
              </div>
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => openDetailModal(school)}
                className="flex-1 flex items-center justify-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded text-xs transition-colors"
              >
                <Eye size={14} />
                View
              </button>
              {canManage && (
                <>
                  <button
                    onClick={() => openEditModal(school)}
                    className="flex-1 flex items-center justify-center gap-1 text-green-600 hover:bg-green-50 px-2 py-1.5 rounded text-xs transition-colors"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(school.id)}
                      className="flex-1 flex items-center justify-center gap-1 text-red-600 hover:bg-red-50 px-2 py-1.5 rounded text-xs transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {schools.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Building2 className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">No schools found. Add your first school to get started.</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingSchool ? 'Edit School' : 'Add New School'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Principal Name</label>
                <input
                  type="text"
                  value={formData.principal_name}
                  onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Count</label>
                <input
                  type="number"
                  min="0"
                  value={formData.enrollment_count}
                  onChange={(e) => setFormData({ ...formData, enrollment_count: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
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
                  {editingSchool ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Building2 className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedSchool.name}</h3>
                  <p className="text-sm text-gray-500">Code: {selectedSchool.code}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Principal</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedSchool.principal_name || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Enrollment</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedSchool.enrollment_count}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Contact</p>
                  <p className="text-sm font-medium text-gray-900">{selectedSchool.phone || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-green-100 p-2 rounded">
                      <GraduationCap className="text-green-600" size={20} />
                    </div>
                    <h4 className="font-semibold text-gray-900">Teachers ({schoolTeachers.length})</h4>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {schoolTeachers.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No teachers assigned</p>
                    ) : (
                      <div className="space-y-2">
                        {schoolTeachers.map((teacher) => (
                          <div key={teacher.id} className="bg-white p-3 rounded border border-gray-200">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900">
                                  {teacher.first_name} {teacher.last_name}
                                </p>
                                <p className="text-xs text-gray-500">{teacher.subject_specialization || 'N/A'}</p>
                                <p className="text-xs text-gray-600">{teacher.phone}</p>
                              </div>
                              {canManage && (
                                <button
                                  onClick={() => openTeacherEditModal(teacher)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title="Edit teacher"
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-yellow-100 p-2 rounded">
                      <Users className="text-yellow-600" size={20} />
                    </div>
                    <h4 className="font-semibold text-gray-900">Mentors ({schoolMentors.length})</h4>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {schoolMentors.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No mentors assigned</p>
                    ) : (
                      <div className="space-y-2">
                        {schoolMentors.map((mentor) => (
                          <div key={mentor.id} className="bg-white p-3 rounded border border-gray-200">
                            <p className="font-medium text-sm text-gray-900">
                              {mentor.first_name} {mentor.last_name}
                            </p>
                            <p className="text-xs text-gray-500">{mentor.specialization || 'N/A'}</p>
                            <p className="text-xs text-gray-600">{mentor.phone}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-purple-100 p-2 rounded">
                    <MessageSquare className="text-purple-600" size={20} />
                  </div>
                  <h4 className="font-semibold text-gray-900">Recent Followups ({schoolFollowups.length})</h4>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  {schoolFollowups.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No followup records</p>
                  ) : (
                    <div className="space-y-3">
                      {schoolFollowups.map((followup) => (
                        <div key={followup.id} className="bg-white p-3 rounded border border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-medium text-sm text-gray-900">
                              {followup.employee.full_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(followup.followup_date).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{followup.comments}</p>
                          {followup.next_followup_date && (
                            <p className="text-xs text-blue-600">
                              Next followup: {new Date(followup.next_followup_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTeacherEditModal && editingTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Edit Teacher</h3>
            <form onSubmit={handleTeacherUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={teacherFormData.first_name}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={teacherFormData.last_name}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={teacherFormData.email}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={teacherFormData.phone}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Specialization</label>
                  <input
                    type="text"
                    value={teacherFormData.subject_specialization}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, subject_specialization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
                  <input
                    type="text"
                    value={teacherFormData.qualification}
                    onChange={(e) => setTeacherFormData({ ...teacherFormData, qualification: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                <select
                  required
                  value={teacherFormData.status}
                  onChange={(e) => setTeacherFormData({ ...teacherFormData, status: e.target.value as 'active' | 'on_leave' | 'inactive' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTeacherEditModal(false);
                    setEditingTeacher(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Teacher
                </button>
              </div>
            </form>
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
    </div>
  );
}
