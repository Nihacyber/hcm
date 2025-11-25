import { useState, useEffect } from 'react';
import { Mentor, School, MentorSchool, Permission, User } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Plus, Edit2, Trash2, Users, Building2 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  currentUser: User;
  currentPermissions: Permission;
}

type MentorWithSchools = Mentor & { assigned_schools?: School[] };

export default function MentorManagement({ currentUser, currentPermissions }: Props) {
  const [mentors, setMentors] = useState<MentorWithSchools[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [editingMentor, setEditingMentor] = useState<Mentor | null>(null);
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    specialization: '',
    years_of_experience: 0,
    status: 'active' as 'active' | 'inactive',
  });

  const canManage = currentPermissions.can_manage_mentors;

  useEffect(() => {
    loadData();
  }, []);

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

      // Load mentor-school relationships
      let mentorSchoolsData: any[] = [];
      if (currentUser.role !== 'admin' && assignedSchoolIds.length > 0) {
        const allMS = await db.find(Collections.MENTOR_SCHOOLS, {});
        mentorSchoolsData = allMS.filter((ms: any) => ms.school_id && assignedSchoolIds.includes(ms.school_id));
      } else if (currentUser.role === 'admin') {
        mentorSchoolsData = await db.find(Collections.MENTOR_SCHOOLS, {});
      }

      // Load mentors and build mentor map with schools
      const allMentors = await db.find<Mentor>(Collections.MENTORS, {});
      const mentorMap = new Map();

      mentorSchoolsData.forEach((ms: any) => {
        const mentor = allMentors.find(m => m.id === ms.mentor_id);
        const school = schoolsData.find(s => s.id === ms.school_id);

        if (mentor) {
          if (!mentorMap.has(mentor.id)) {
            mentorMap.set(mentor.id, {
              ...mentor,
              assigned_schools: []
            });
          }
          if (school) {
            mentorMap.get(mentor.id).assigned_schools.push(school);
          }
        }
      });

      setMentors(Array.from(mentorMap.values()));
    } catch (error) {
      console.error('Error loading mentor data:', error);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingMentor && editingMentor.id) {
      await db.updateById<Mentor>(Collections.MENTORS, editingMentor.id, formData);
    } else {
      await db.insertOne<Mentor>(Collections.MENTORS, {
        ...formData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
    }

    loadData();
    resetForm();
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Mentor',
      message: 'Are you sure you want to delete this mentor? This action cannot be undone.',
      onConfirm: async () => {
        await db.deleteById(Collections.MENTORS, id);
        setConfirmDialog(null);
        loadData();
      }
    });
  };

  const openSchoolAssignment = async (mentorId: string) => {
    setSelectedMentorId(mentorId);

    const assignments = await db.find(Collections.MENTOR_SCHOOLS, { mentor_id: mentorId });

    setSelectedSchoolIds(assignments?.map((a: any) => a.school_id) || []);
    setShowSchoolModal(true);
  };

  const handleSchoolAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentorId) return;

    // Delete existing assignments
    await db.deleteMany(Collections.MENTOR_SCHOOLS, { mentor_id: selectedMentorId });

    // Insert new assignments
    if (selectedSchoolIds.length > 0) {
      await db.insertMany(Collections.MENTOR_SCHOOLS, selectedSchoolIds.map(schoolId => ({
        mentor_id: selectedMentorId,
        school_id: schoolId,
        created_at: new Date().toISOString(),
      } as any)));
    }

    loadData();
    setShowSchoolModal(false);
    setSelectedMentorId(null);
    setSelectedSchoolIds([]);
  };

  const toggleSchoolSelection = (schoolId: string) => {
    setSelectedSchoolIds(prev =>
      prev.includes(schoolId)
        ? prev.filter(id => id !== schoolId)
        : [...prev, schoolId]
    );
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      specialization: '',
      years_of_experience: 0,
      status: 'active',
    });
    setEditingMentor(null);
    setShowModal(false);
  };

  const openEditModal = (mentor: Mentor) => {
    setEditingMentor(mentor);
    setFormData({
      first_name: mentor.first_name,
      last_name: mentor.last_name,
      email: mentor.email,
      phone: mentor.phone,
      specialization: mentor.specialization,
      years_of_experience: mentor.years_of_experience,
      status: mentor.status,
    });
    setShowModal(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mentor Management</h2>
          <p className="text-gray-600 mt-1">Manage mentors and school assignments</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Add Mentor
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mentors.map((mentor) => (
          <div key={mentor.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Users className="text-green-600" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{mentor.first_name} {mentor.last_name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${mentor.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {mentor.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div>
                <span className="font-medium">Specialization:</span> {mentor.specialization || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Experience:</span> {mentor.years_of_experience} years
              </div>
              <div>
                <span className="font-medium">Email:</span> {mentor.email || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Phone:</span> {mentor.phone || 'N/A'}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Assigned Schools ({mentor.assigned_schools?.length || 0})</span>
              </div>
              {mentor.assigned_schools && mentor.assigned_schools.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {mentor.assigned_schools.map((school) => (
                    <span key={school.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                      {school.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No schools assigned</p>
              )}
            </div>

            {canManage && (
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(mentor)}
                  className="flex-1 flex items-center justify-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors text-sm"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
                <button
                  onClick={() => openSchoolAssignment(mentor.id)}
                  className="flex-1 flex items-center justify-center gap-2 text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg transition-colors text-sm"
                >
                  <Building2 size={16} />
                  Schools
                </button>
                <button
                  onClick={() => handleDelete(mentor.id)}
                  className="flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {mentors.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">No mentors found. Add your first mentor to get started.</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingMentor ? 'Edit Mentor' : 'Add New Mentor'}</h3>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.years_of_experience}
                    onChange={(e) => setFormData({ ...formData, years_of_experience: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
                  {editingMentor ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSchoolModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Assign Schools</h3>
            <form onSubmit={handleSchoolAssignment} className="space-y-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {schools.map((school) => (
                  <label key={school.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSchoolIds.includes(school.id)}
                      onChange={() => toggleSchoolSelection(school.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{school.name}</div>
                      <div className="text-xs text-gray-500">{school.code}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowSchoolModal(false);
                    setSelectedMentorId(null);
                    setSelectedSchoolIds([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Assignments
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
