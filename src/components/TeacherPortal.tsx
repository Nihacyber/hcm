import { useState, useEffect } from 'react';
import { Teacher, TrainingAssignment, TrainingProgram, TrainingAttendance, School } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { LogOut, GraduationCap, BookOpen, Calendar, Award } from 'lucide-react';

interface Props {
  teacher: Teacher;
  onLogout: () => void;
}

type AssignmentWithDetails = TrainingAssignment & {
  training_program?: TrainingProgram;
};

export default function TeacherPortal({ teacher, onLogout }: Props) {
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [attendance, setAttendance] = useState<TrainingAttendance[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignmentsData, attendanceData, schoolData] = await Promise.all([
        db.find(Collections.TRAINING_ASSIGNMENTS, { teacher_id: teacher.id }, { sort: { assigned_date: -1 } }),
        db.find<TrainingAttendance>(Collections.TRAINING_ATTENDANCE, { teacher_id: teacher.id }, { sort: { attendance_date: -1 } }),
        teacher.school_id
          ? db.findById<School>(Collections.SCHOOLS, teacher.school_id)
          : Promise.resolve(null)
      ]);

      // Load training programs for assignments
      const allPrograms = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {});

      const mapped = assignmentsData.map((a: any) => ({
        ...a,
        training_program: allPrograms.find(p => p.id === a.training_program_id)
      }));

      setAssignments(mapped);
      setAttendance(attendanceData);
      setSchool(schoolData);
    } catch (error) {
      console.error('Error loading teacher portal data:', error);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const lateCount = attendance.filter(a => a.status === 'late').length;
  const excusedCount = attendance.filter(a => a.status === 'excused').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <GraduationCap className="text-blue-600" size={32} />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Teacher Portal</h1>
                <p className="text-xs text-gray-500">HCMS</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition-colors"
            >
              <LogOut size={20} />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              <GraduationCap className="text-blue-600" size={32} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {teacher.first_name} {teacher.last_name}
              </h2>
              <p className="text-gray-600">{teacher.email}</p>
            </div>
            <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${teacher.status === 'active' ? 'bg-green-100 text-green-800' :
              teacher.status === 'on_leave' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
              {teacher.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-500 mb-1">Phone Number</p>
              <p className="font-medium text-gray-900">{teacher.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">School</p>
              <p className="font-medium text-gray-900">{school?.name || 'No school assigned'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Subject Specialization</p>
              <p className="font-medium text-gray-900">{teacher.subject_specialization || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Years of Experience</p>
              <p className="font-medium text-gray-900">{teacher.years_of_experience || 0} years</p>
            </div>
            {teacher.qualification && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 mb-1">Qualification</p>
                <p className="font-medium text-gray-900">{teacher.qualification}</p>
              </div>
            )}
            {teacher.date_of_birth && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Date of Birth</p>
                <p className="font-medium text-gray-900">{new Date(teacher.date_of_birth).toLocaleDateString()}</p>
              </div>
            )}
            {teacher.hire_date && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Hire Date</p>
                <p className="font-medium text-gray-900">{new Date(teacher.hire_date).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="text-3xl font-bold text-green-600">{presentCount}</div>
            <div className="text-sm text-gray-600">Present</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="text-3xl font-bold text-red-600">{absentCount}</div>
            <div className="text-sm text-gray-600">Absent</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <div className="text-3xl font-bold text-yellow-600">{lateCount}</div>
            <div className="text-sm text-gray-600">Late</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="text-3xl font-bold text-blue-600">{excusedCount}</div>
            <div className="text-sm text-gray-600">Excused</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen size={24} />
            My Training Programs
          </h3>
          {assignments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No training programs assigned yet</p>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{assignment.training_program?.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{assignment.training_program?.description}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(assignment.status)}`}>
                      {assignment.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar size={16} className="text-gray-400" />
                      <div>
                        <div className="text-gray-500 text-xs">Duration</div>
                        <div className="font-medium">{assignment.training_program?.duration_hours || 0} hours</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Award size={16} className="text-gray-400" />
                      <div>
                        <div className="text-gray-500 text-xs">Progress</div>
                        <div className="font-medium">{assignment.progress_percentage}%</div>
                      </div>
                    </div>
                    {assignment.due_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={16} className="text-gray-400" />
                        <div>
                          <div className="text-gray-500 text-xs">Due Date</div>
                          <div className="font-medium">{new Date(assignment.due_date).toLocaleDateString()}</div>
                        </div>
                      </div>
                    )}
                    {assignment.score !== null && (
                      <div className="flex items-center gap-2 text-sm">
                        <Award size={16} className="text-gray-400" />
                        <div>
                          <div className="text-gray-500 text-xs">Score</div>
                          <div className="font-medium">{assignment.score}%</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {assignment.training_program?.start_date && assignment.training_program?.end_date && (
                    <div className="mb-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <span className="font-medium">Training Dates:</span>{' '}
                      {new Date(assignment.training_program.start_date).toLocaleDateString()} -{' '}
                      {new Date(assignment.training_program.end_date).toLocaleDateString()}
                    </div>
                  )}

                  {assignment.training_program?.meeting_link && (
                    <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-blue-900">Online Training Session</div>
                          <div className="text-xs text-blue-700 mt-0.5">Click to join the virtual meeting</div>
                        </div>
                        <a
                          href={assignment.training_program.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                        >
                          <BookOpen size={16} />
                          Join Session
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${assignment.progress_percentage === 100 ? 'bg-green-600' :
                          assignment.progress_percentage >= 50 ? 'bg-blue-600' :
                            'bg-yellow-600'
                          }`}
                        style={{ width: `${assignment.progress_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
