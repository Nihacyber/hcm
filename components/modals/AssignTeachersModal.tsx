import React, { useState, useEffect } from 'react';
import { Teacher, TrainingProgram, School } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { CloseIcon } from '../ui/Icons';
import Spinner from '../ui/Spinner';
import api from '../../services/firebaseService';

interface AssignTeachersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignTeachers: (teacherIds: string[], trainingId: string) => Promise<void>;
  training: TrainingProgram | null;
}

const AssignTeachersModal: React.FC<AssignTeachersModalProps> = ({
  isOpen,
  onClose,
  onAssignTeachers,
  training
}) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [teachersData, schoolsData] = await Promise.all([
            api.getTeachers(),
            api.getSchools()
          ]);
          setTeachers(teachersData);
          setSchools(schoolsData);

          // Pre-select teachers already assigned to this training
          if (training && training.assignedTeachers) {
            setSelectedTeachers(training.assignedTeachers);
          }
        } catch (err) {
          console.error("Failed to fetch data:", err);
          setError('Failed to load teachers and schools');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else {
      // Reset state when closing
      setTimeout(() => {
        setSearchTerm('');
        setSelectedTeachers([]);
        setError(null);
        setIsSubmitting(false);
      }, 300);
    }
  }, [isOpen, training]);

  const handleTeacherToggle = (teacherId: string) => {
    setSelectedTeachers(prev =>
      prev.includes(teacherId)
        ? prev.filter(id => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  const handleSelectAll = () => {
    const filteredTeacherIds = filteredTeachers.map(t => t.id);
    setSelectedTeachers(filteredTeacherIds);
  };

  const handleDeselectAll = () => {
    setSelectedTeachers([]);
  };

  const getSchoolName = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId);
    return school ? school.name : 'Unknown School';
  };

  const filteredTeachers = teachers.filter(teacher =>
    teacher.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getSchoolName(teacher.schoolId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!training) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Call API to assign/remove teachers based on current selection
      const currentAssignedIds = training.assignedTeachers || [];

      // Find teachers to assign (newly selected)
      const teachersToAssign = selectedTeachers.filter(id => !currentAssignedIds.includes(id));

      // Find teachers to remove (unselected but were previously assigned)
      const teachersToRemove = currentAssignedIds.filter(id => !selectedTeachers.includes(id));

      // Assign new teachers
      await Promise.all(teachersToAssign.map(teacherId =>
        api.assignTeacherToTraining(teacherId, training.id)
      ));

      // Remove unassigned teachers
      await Promise.all(teachersToRemove.map(teacherId =>
        api.removeTeacherFromTraining(teacherId, training.id)
      ));

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign teachers');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !training) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale flex flex-col">
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 id="modal-title" className="text-2xl font-semibold text-gray-800 dark:text-white">
              Manage Teacher Assignments
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {training.name} - Select teachers to assign or unassign from this training
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 text-gray-400 transition-colors duration-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            aria-label="Close modal"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search and Controls */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                  placeholder="Search teachers..."
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={handleSelectAll} size="sm">
                  Select All
                </Button>
                <Button type="button" variant="secondary" onClick={handleDeselectAll} size="sm">
                  Deselect All
                </Button>
              </div>
            </div>
          </div>

          {/* Teachers List */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Spinner />
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTeachers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No teachers found matching your search.
                  </div>
                ) : (
                  filteredTeachers.map((teacher) => {
                    const isSelected = selectedTeachers.includes(teacher.id);
                    const isAssigned = training.assignedTeachers?.includes(teacher.id);

                    return (
                      <div
                        key={teacher.id}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <input
                            type="checkbox"
                            id={`teacher-${teacher.id}`}
                            checked={isSelected}
                            onChange={() => handleTeacherToggle(teacher.id)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {teacher.firstName} {teacher.lastName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {teacher.email} • {teacher.subject} • {getSchoolName(teacher.schoolId)}
                            </div>
                            {teacher.qualifications.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {teacher.qualifications.slice(0, 2).map((qual, index) => (
                                  <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded dark:bg-gray-700 dark:text-gray-300">
                                    {qual}
                                  </span>
                                ))}
                                {teacher.qualifications.length > 2 && (
                                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded dark:bg-gray-700 dark:text-gray-300">
                                    +{teacher.qualifications.length - 2} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {isAssigned && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded dark:bg-green-900 dark:text-green-300">
                            Currently Assigned
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedTeachers.length} teacher{selectedTeachers.length !== 1 ? 's' : ''} selected
              </div>
              <div className="flex space-x-4">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || selectedTeachers.length === 0}
                  className="min-w-32"
                >
                  {isSubmitting ? <Spinner className="w-5 h-5 border-white" /> : `Update (${selectedTeachers.length})`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AssignTeachersModal;
