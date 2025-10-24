import React, { useState, useEffect, useMemo } from 'react';
import { TrainingProgram, AttendanceStatus, TrainingAttendance } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { CloseIcon } from '../ui/Icons';
import api from '../../services/firebaseService';

interface TrainingAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  training: TrainingProgram | null;
  teacherId: string;
  onAttendanceMarked?: () => void;
}

const TrainingAttendanceModal: React.FC<TrainingAttendanceModalProps> = ({
  isOpen,
  onClose,
  training,
  teacherId,
  onAttendanceMarked
}) => {
  // All hooks must be called before any early returns
  const [attendanceRecords, setAttendanceRecords] = useState<TrainingAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Generate array of dates for the training period using useMemo to avoid hook violations
  const trainingDates = useMemo(() => {
    if (!training) return [];

    try {
      const dates: string[] = [];

      // Handle both string and Date formats
      let startDate: Date;
      let endDate: Date;

      if (typeof training.startDate === 'string') {
        startDate = new Date(training.startDate);
      } else {
        startDate = training.startDate as Date;
      }

      if (typeof training.endDate === 'string') {
        endDate = new Date(training.endDate);
      } else {
        endDate = training.endDate as Date;
      }

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('Invalid training dates:', { startDate: training.startDate, endDate: training.endDate });
        return [];
      }

      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return dates;
    } catch (error) {
      console.error('Error generating training dates:', error);
      return [];
    }
  }, [training]);

  // Fetch existing attendance records
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!training) return;
      setLoading(true);
      try {
        const records = await api.getTeacherAttendanceForTraining(teacherId, training.id);
        setAttendanceRecords(records);
      } catch (err) {
        console.error('Error fetching attendance:', err);
        setError('Failed to load attendance records');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && training) {
      fetchAttendance();
    }
  }, [isOpen, training, teacherId]);

  // Get attendance status for a specific date
  const getAttendanceForDate = (date: string): TrainingAttendance | undefined => {
    return attendanceRecords.find(record => record.date === date);
  };

  // Check if a date is in the past or today
  const isDateMarkable = (date: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate <= today;
  };

  // Handle marking attendance
  const handleMarkAttendance = async (date: string, status: AttendanceStatus) => {
    if (!training) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const attendance: Omit<TrainingAttendance, 'id'> = {
        teacherId,
        trainingProgramId: training.id,
        date,
        status,
        markedBy: teacherId
      };

      console.log('Saving attendance:', attendance); // Debug log
      const savedAttendance = await api.saveTrainingAttendance(attendance);
      console.log('Attendance saved successfully:', savedAttendance); // Debug log

      // Update local state
      const existingIndex = attendanceRecords.findIndex(r => r.date === date);
      if (existingIndex >= 0) {
        const updated = [...attendanceRecords];
        updated[existingIndex] = { ...updated[existingIndex], status };
        setAttendanceRecords(updated);
      } else {
        setAttendanceRecords([...attendanceRecords, { ...savedAttendance, markedAt: new Date().toISOString() }]);
      }

      setSuccess(`Attendance marked as ${status} for ${date}`);
      setTimeout(() => setSuccess(null), 3000);

      if (onAttendanceMarked) {
        onAttendanceMarked();
      }
    } catch (err) {
      console.error('Error marking attendance:', err);
      setError('Failed to mark attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: AttendanceStatus | undefined): string => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case AttendanceStatus.ABSENT:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case AttendanceStatus.NOT_MARKED:
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: AttendanceStatus | undefined): string => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return '✓';
      case AttendanceStatus.ABSENT:
        return '✗';
      default:
        return '-';
    }
  };

  // Early returns must happen after all hooks are declared
  if (!isOpen || !training) {
    return null;
  }

  // Validate training object has required properties
  if (!training.id || !training.name || !training.startDate || !training.endDate) {
    console.error('Invalid training object:', training);
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Mark Attendance
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{training.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Training Info */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Training Period:</strong> {training.startDate} to {training.endDate}
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
            <strong>Total Days:</strong> {trainingDates.length}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Loading attendance records...</p>
          </div>
        ) : (
          <>
            {/* Attendance Days */}
            <div className="space-y-3 mb-6">
              {trainingDates.map((date) => {
                const attendance = getAttendanceForDate(date);
                const isMarkable = isDateMarkable(date);
                const dateObj = new Date(date);
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

                return (
                  <div
                    key={date}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {dayName}, {date}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {isMarkable ? (
                            attendance ? (
                              <>
                                Status: <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(attendance.status)}`}>
                                  {getStatusIcon(attendance.status)} {attendance.status}
                                </span>
                              </>
                            ) : (
                              'Not marked yet'
                            )
                          ) : (
                            'Future date - cannot mark attendance'
                          )}
                        </p>
                      </div>

                      {isMarkable && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleMarkAttendance(date, AttendanceStatus.PRESENT)}
                            variant={attendance?.status === AttendanceStatus.PRESENT ? 'primary' : 'secondary'}
                            disabled={saving}
                            className="text-sm"
                          >
                            ✓ Present
                          </Button>
                          <Button
                            onClick={() => handleMarkAttendance(date, AttendanceStatus.ABSENT)}
                            variant={attendance?.status === AttendanceStatus.ABSENT ? 'primary' : 'secondary'}
                            disabled={saving}
                            className="text-sm"
                          >
                            ✗ Absent
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Attendance Summary */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Attendance Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Present</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {attendanceRecords.filter(r => r.status === AttendanceStatus.PRESENT).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Absent</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {attendanceRecords.filter(r => r.status === AttendanceStatus.ABSENT).length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Not Marked</p>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {trainingDates.length - attendanceRecords.length}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default TrainingAttendanceModal;

