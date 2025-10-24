import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Teacher, TrainingProgram, TeacherTraining, AttendanceStatus } from '../types';
import api from '../services/firebaseService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { LogOutIcon } from '../components/ui/Icons';
import TrainingAttendanceModal from '../components/modals/TrainingAttendanceModal';

const TeacherDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [trainings, setTrainings] = useState<TrainingProgram[]>([]);
  const [teacherTrainings, setTeacherTrainings] = useState<TeacherTraining[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<{ [trainingId: string]: { present: number; total: number; rate: number } }>({});
  const [loading, setLoading] = useState(true);
  const [selectedTraining, setSelectedTraining] = useState<TrainingProgram | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

  const teacherId = localStorage.getItem('teacherId');
  const teacherName = localStorage.getItem('teacherName');
  const teacherEmail = localStorage.getItem('teacherEmail');

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!teacherId) {
          navigate('/teacher-login', { replace: true });
          return;
        }

        setLoading(true);

        // Fetch teacher data
        const teachers = await api.getTeachers();
        const currentTeacher = teachers.find(t => t.id === teacherId);

        if (currentTeacher) {
          setTeacher(currentTeacher);
        }

        // Fetch all trainings
        const allTrainings = await api.getTrainingPrograms();
        setTrainings(allTrainings);

        // Fetch teacher training records
        const trainingRecords = await api.getTeacherTrainingRecords(teacherId);
        setTeacherTrainings(trainingRecords);

        // Calculate attendance summary for each training
        const summary: { [trainingId: string]: { present: number; total: number; rate: number } } = {};
        for (const record of trainingRecords) {
          try {
            const attendanceRecords = await api.getTeacherAttendanceForTraining(teacherId, record.trainingProgramId);
            const present = attendanceRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
            const total = attendanceRecords.length;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;
            summary[record.trainingProgramId] = { present, total, rate };
          } catch (error) {
            console.error('Error calculating attendance for training:', record.trainingProgramId, error);
            summary[record.trainingProgramId] = { present: 0, total: 0, rate: 0 };
          }
        }
        setAttendanceSummary(summary);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teacherId, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('isTeacherLoggedIn');
    localStorage.removeItem('teacherId');
    localStorage.removeItem('teacherName');
    localStorage.removeItem('teacherEmail');
    navigate('/teacher-login', { replace: true });
  };

  const getTrainingDetails = (trainingId: string) => {
    return trainings.find(t => t.id === trainingId);
  };

  const getTrainingStatus = (trainingId: string) => {
    return teacherTrainings.find(t => t.trainingProgramId === trainingId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Scheduled':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const handleMarkAttendance = (training: TrainingProgram) => {
    setSelectedTraining(training);
    setIsAttendanceModalOpen(true);
  };

  const handleAttendanceMarked = async () => {
    // Refresh teacher training records and recalculate attendance summary
    try {
      const trainingRecords = await api.getTeacherTrainingRecords(teacherId || '');
      setTeacherTrainings(trainingRecords);

      // Recalculate attendance summary for each training
      const summary: { [trainingId: string]: { present: number; total: number; rate: number } } = {};
      for (const record of trainingRecords) {
        try {
          const attendanceRecords = await api.getTeacherAttendanceForTraining(teacherId || '', record.trainingProgramId);
          const present = attendanceRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
          const total = attendanceRecords.length;
          const rate = total > 0 ? Math.round((present / total) * 100) : 0;
          summary[record.trainingProgramId] = { present, total, rate };
        } catch (error) {
          console.error('Error calculating attendance for training:', record.trainingProgramId, error);
          summary[record.trainingProgramId] = { present: 0, total: 0, rate: 0 };
        }
      }
      setAttendanceSummary(summary);
      console.log('Attendance marked successfully - data refreshed');
    } catch (error) {
      console.error('Error refreshing training records:', error);
    }
  };

  if (!teacherId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Redirecting to login...</p>
          <Spinner className="w-12 h-12 mx-auto" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome, {teacherName || 'Teacher'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{teacherEmail || ''}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="secondary"
            className="flex items-center"
          >
            <LogOutIcon className="w-5 h-5 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Teacher Info Card */}
        {teacher && (
          <Card className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              Your Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Subject</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {teacher.subject || 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {teacher.phone || 'Not specified'}
                </p>
              </div>
              {teacher.qualifications && teacher.qualifications.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Qualifications</p>
                  <div className="flex flex-wrap gap-2">
                    {teacher.qualifications.map((qual, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200"
                      >
                        {qual}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Assigned Training Programs - Attendance Marking */}
        <Card className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
            Assigned Training Programs
          </h2>

          {teacherTrainings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No training programs assigned yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teacherTrainings.map((record) => {
                const training = getTrainingDetails(record.trainingProgramId);
                if (!training) return null;

                return (
                  <div
                    key={record.trainingProgramId}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {training.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {training.description}
                    </p>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Start:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {training.startDate}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-600 dark:text-gray-400">End:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">
                          {training.endDate}
                        </span>
                      </p>
                      <p className="text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Status:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </p>
                    </div>
                    <Button
                      onClick={() => handleMarkAttendance(training)}
                      variant="primary"
                      className="w-full text-sm"
                    >
                      Mark Attendance
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Training Results */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
            Training Results
          </h2>

          {teacherTrainings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No training records found. You haven't been assigned to any trainings yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Training Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Attendance
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Performance Rating
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Feedback
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teacherTrainings.map((record) => {
                    const training = getTrainingDetails(record.trainingProgramId);
                    return (
                      <tr
                        key={record.trainingProgramId}
                        className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {training?.name || 'Unknown Training'}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {(() => {
                            const summary = attendanceSummary[record.trainingProgramId];
                            if (summary && summary.total > 0) {
                              return (
                                <div className="flex flex-col">
                                  <span className={`font-medium ${summary.rate >= 80 ? 'text-green-600 dark:text-green-400' : summary.rate >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {summary.present}/{summary.total} ({summary.rate}%)
                                  </span>
                                </div>
                              );
                            }
                            return <span className="text-gray-500">-</span>;
                          })()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                          {record.performanceRating ? (
                            <div className="flex items-center">
                              <span className="text-lg font-semibold text-yellow-500">★</span>
                              <span className="ml-1">{record.performanceRating}/5</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {record.feedback || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

      </div>

      {/* Training Attendance Modal - Rendered outside main content */}
      <TrainingAttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        training={selectedTraining}
        teacherId={teacherId || ''}
        onAttendanceMarked={handleAttendanceMarked}
      />
    </div>
  );
};

export default TeacherDashboard;

