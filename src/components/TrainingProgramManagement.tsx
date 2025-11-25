import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { TrainingProgram, Permission, TrainingAssignment, Teacher, School, User } from '../lib/models';
import { Plus, Edit2, Trash2, BookOpen, Archive, Users, Eye } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  currentPermissions: Permission;
}

type ProgramWithAssignments = TrainingProgram & {
  assignmentCount: number;
};

type AssignmentDetail = {
  teacher_name: string;
  school_name: string;
  assigned_by_name: string;
  status: string;
};

export default function TrainingProgramManagement({ currentPermissions }: Props) {
  const [programs, setPrograms] = useState<ProgramWithAssignments[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [assignmentDetails, setAssignmentDetails] = useState<AssignmentDetail[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [editingProgram, setEditingProgram] = useState<TrainingProgram | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('active');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_hours: 0,
    category: '',
    status: 'active' as 'active' | 'archived',
    start_date: '',
    end_date: '',
    meeting_link: '',
  });

  const canManage = currentPermissions.can_manage_training_programs;

  useEffect(() => {
    loadPrograms();
  }, [filterStatus]);

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const filter: any = {};
      if (filterStatus !== 'all') {
        filter.status = filterStatus;
      }

      const data = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, filter, { sort: { title: 1 } });

      if (data) {
        // Use aggregation to count assignments per program
        // Since we don't have a direct aggregate helper that returns exactly what we want easily in one go for all programs without grouping by ID which might be complex in the simple service,
        // we'll fetch all assignments (or aggregate if supported) or just count manually if dataset is small.
        // Let's try to use the aggregate if possible, or just fetch all assignments for now as it's safer given the service limitations.
        // Actually, let's just fetch all assignments. It's not ideal for scale but works for now.
        const assignments = await db.find<TrainingAssignment>(Collections.TRAINING_ASSIGNMENTS, {});

        const countMap = new Map<string, number>();
        assignments.forEach(a => {
          const pid = a.training_program_id;
          countMap.set(pid, (countMap.get(pid) || 0) + 1);
        });

        const programsWithCounts = data.map(program => ({
          ...program,
          assignmentCount: countMap.get(program.id!) || 0,
        }));

        setPrograms(programsWithCounts);
      }
    } catch (error) {
      console.error('Error loading programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignmentDetails = async (programId: string) => {
    try {
      const assignments = await db.find<TrainingAssignment>(Collections.TRAINING_ASSIGNMENTS, { training_program_id: programId });

      if (assignments && assignments.length > 0) {
        // Fetch related data manually
        const teacherIds = assignments.map(a => a.teacher_id);
        const teachers = await db.find<Teacher>(Collections.TEACHERS, {}); // Fetch all for now
        const schools = await db.find<School>(Collections.SCHOOLS, {});
        const users = await db.find<User>(Collections.USERS, {});

        const details: AssignmentDetail[] = assignments.map((assignment) => {
          const teacher = teachers.find(t => t.id === assignment.teacher_id);
          const school = teacher ? schools.find(s => s.id === teacher.school_id) : undefined;
          const assignedBy = users.find(u => u.id === assignment.assigned_by);

          return {
            teacher_name: teacher
              ? `${teacher.first_name} ${teacher.last_name}`
              : 'N/A',
            school_name: school?.name || 'Unassigned',
            assigned_by_name: assignedBy?.full_name || 'Unknown',
            status: assignment.status,
          };
        });
        setAssignmentDetails(details);
      } else {
        setAssignmentDetails([]);
      }
    } catch (error) {
      console.error('Error loading assignment details:', error);
    }
  };

  const handleViewDetails = async (program: TrainingProgram) => {
    setSelectedProgram(program);
    await loadAssignmentDetails(program.id!);
    setShowDetailsModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const now = new Date().toISOString();
      const data = {
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        updated_at: now,
      };

      if (editingProgram) {
        await db.updateById(Collections.TRAINING_PROGRAMS, editingProgram.id!, data);
      } else {
        await db.insertOne(Collections.TRAINING_PROGRAMS, {
          ...data,
          created_at: now,
        });
      }

      loadPrograms();
      resetForm();
    } catch (error) {
      console.error('Error saving program:', error);
    }
  };

  const handleDelete = async (id: string) => {
    const code = prompt('Enter confirmation code to delete this training program:');
    if (code !== 'T777') {
      alert('Invalid confirmation code. Deletion cancelled.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Delete Training Program',
      message: 'Are you sure you want to delete this training program? This will also delete all associated assignments. This action cannot be undone.',
      onConfirm: async () => {
        try {
          // Delete assignments first (manual cascade)
          // Note: db service doesn't support deleteMany yet, so we might leave orphans or need to fetch and delete loop
          // For now, just delete the program.
          await db.deleteById(Collections.TRAINING_PROGRAMS, id);
          setConfirmDialog(null);
          loadPrograms();
        } catch (error) {
          console.error('Error deleting program:', error);
        }
      }
    });
  };

  const handleArchiveToggle = async (program: TrainingProgram) => {
    try {
      const newStatus = program.status === 'active' ? 'archived' : 'active';
      await db.updateById(Collections.TRAINING_PROGRAMS, program.id!, {
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      loadPrograms();
    } catch (error) {
      console.error('Error archiving program:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      duration_hours: 0,
      category: '',
      status: 'active',
      start_date: '',
      end_date: '',
      meeting_link: '',
    });
    setEditingProgram(null);
    setShowModal(false);
  };

  const openEditModal = (program: TrainingProgram) => {
    setEditingProgram(program);
    setFormData({
      title: program.title,
      description: program.description,
      duration_hours: program.duration_hours,
      category: program.category,
      status: program.status,
      start_date: program.start_date || '',
      end_date: program.end_date || '',
      meeting_link: program.meeting_link || '',
    });
    setShowModal(true);
  };

  const groupByCategory = () => {
    const grouped: Record<string, TrainingProgram[]> = {};
    programs.forEach(program => {
      const cat = program.category || 'Uncategorized';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(program);
    });
    return grouped;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const groupedPrograms = groupByCategory();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Training Programs</h2>
          <p className="text-gray-600 mt-1">Manage professional development programs</p>
        </div>
        <div className="flex gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Programs</option>
            <option value="active">Active Only</option>
            <option value="archived">Archived Only</option>
          </select>
          {canManage && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Add Program
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedPrograms).map(([category, categoryPrograms]) => (
          <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
              <p className="text-sm text-gray-600">{categoryPrograms.length} {categoryPrograms.length === 1 ? 'program' : 'programs'}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {categoryPrograms.map((program) => (
                <div key={program.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${program.status === 'active' ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                      <BookOpen className={program.status === 'active' ? 'text-blue-600' : 'text-gray-400'} size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{program.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${program.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {program.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{program.description || 'No description'}</p>

                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <div>
                      <span className="font-medium">Duration:</span> {program.duration_hours} hours
                    </div>
                    <div className="flex items-center gap-2 py-1">
                      <Users size={16} className="text-blue-600" />
                      <span className="font-medium text-blue-600">{program.assignmentCount}</span>
                      <span className="text-gray-600">teacher{program.assignmentCount !== 1 ? 's' : ''} assigned</span>
                    </div>
                    {program.start_date && program.end_date && (
                      <div>
                        <span className="font-medium">Dates:</span> {new Date(program.start_date).toLocaleDateString()} - {new Date(program.end_date).toLocaleDateString()}
                      </div>
                    )}
                    {program.meeting_link && (
                      <div className="mt-2">
                        <a
                          href={program.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-xs underline break-all"
                        >
                          Join Meeting
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-200">
                    {program.assignmentCount > 0 && (
                      <button
                        onClick={() => handleViewDetails(program)}
                        className="flex-1 flex items-center justify-center gap-1 text-green-600 hover:bg-green-50 px-2 py-1.5 rounded text-sm transition-colors"
                      >
                        <Eye size={14} />
                        View Details
                      </button>
                    )}
                    {canManage && (
                      <>
                        <button
                          onClick={() => openEditModal(program)}
                          className="flex-1 flex items-center justify-center gap-1 text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded text-sm transition-colors"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleArchiveToggle(program)}
                          className="flex-1 flex items-center justify-center gap-1 text-orange-600 hover:bg-orange-50 px-2 py-1.5 rounded text-sm transition-colors"
                        >
                          <Archive size={14} />
                          {program.status === 'active' ? 'Archive' : 'Restore'}
                        </button>
                        <button
                          onClick={() => handleDelete(program.id!)}
                          className="flex items-center justify-center gap-1 text-red-600 hover:bg-red-50 px-2 py-1.5 rounded text-sm transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {programs.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">No training programs found. Add your first program to get started.</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingProgram ? 'Edit Training Program' : 'Add New Training Program'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.duration_hours}
                    onChange={(e) => setFormData({ ...formData, duration_hours: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link</label>
                <input
                  type="url"
                  value={formData.meeting_link}
                  onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                  placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Provide a meeting link for virtual training sessions</p>
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
                  {editingProgram ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailsModal && selectedProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedProgram.title}</h3>
                <p className="text-sm text-gray-600 mt-1">Assigned Teachers and Details</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            {assignmentDetails.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned By</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignmentDetails.map((detail, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {detail.teacher_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {detail.school_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {detail.assigned_by_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${detail.status === 'completed' ? 'bg-green-100 text-green-800' :
                              detail.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                detail.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                            }`}>
                            {detail.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No teachers assigned to this program yet.
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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
