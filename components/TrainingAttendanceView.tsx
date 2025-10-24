import React, { useState, useEffect } from 'react';
import { TrainingProgram, TrainingAttendance, AttendanceStatus, Teacher } from '../types';
import api from '../services/firebaseService';
import Card from './ui/Card';
import Spinner from './ui/Spinner';

interface TrainingAttendanceViewProps {
  training: TrainingProgram;
  teachers: Teacher[];
}

const TrainingAttendanceView: React.FC<TrainingAttendanceViewProps> = ({
  training,
  teachers
}) => {
  const [attendanceRecords, setAttendanceRecords] = useState<TrainingAttendance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const records = await api.getTrainingAttendance(training.id);
        setAttendanceRecords(records);
        console.log('Fetched attendance records:', records); // Debug log
      } catch (error) {
        console.error('Error fetching attendance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [training.id]);

  // Generate array of dates for the training period
  const generateTrainingDates = (): string[] => {
    const dates: string[] = [];
    const startDate = new Date(training.startDate);
    const endDate = new Date(training.endDate);

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  };

  const trainingDates = generateTrainingDates();

  // Get attendance for a specific teacher and date
  const getAttendance = (teacherId: string, date: string): TrainingAttendance | undefined => {
    return attendanceRecords.find(
      r => r.teacherId === teacherId && r.date === date
    );
  };

  // Get teacher name by ID
  const getTeacherName = (teacherId: string): string => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown';
  };

  // Calculate attendance statistics for a date
  const getDateStats = (date: string) => {
    const dayRecords = attendanceRecords.filter(r => r.date === date);
    const present = dayRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
    const absent = dayRecords.filter(r => r.status === AttendanceStatus.ABSENT).length;
    const notMarked = (training.assignedTeachers?.length || 0) - dayRecords.length;

    return { present, absent, notMarked };
  };

  // Get assigned teachers
  const assignedTeachers = training.assignedTeachers || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Attendance Summary */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Attendance Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-300">Total Teachers</p>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {assignedTeachers.length}
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-300">Total Days</p>
            <p className="text-3xl font-bold text-green-900 dark:text-green-100">
              {trainingDates.length}
            </p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
            <p className="text-sm text-purple-600 dark:text-purple-300">Records Marked</p>
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {attendanceRecords.length}
            </p>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-orange-900 rounded-lg">
            <p className="text-sm text-orange-600 dark:text-orange-300">Completion</p>
            <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
              {assignedTeachers.length > 0
                ? Math.round((attendanceRecords.length / (assignedTeachers.length * trainingDates.length)) * 100)
                : 0}%
            </p>
          </div>
        </div>
      </Card>

      {/* Daily Statistics */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Daily Statistics
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Present
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Absent
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Not Marked
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Attendance Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {trainingDates.map((date) => {
                const stats = getDateStats(date);
                const total = assignedTeachers.length;
                const rate = total > 0 ? Math.round((stats.present / total) * 100) : 0;

                return (
                  <tr
                    key={date}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                      {date}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs font-medium">
                        {stats.present}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-xs font-medium">
                        {stats.absent}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full text-xs font-medium">
                        {stats.notMarked}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {rate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Teacher Attendance Details */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Teacher Attendance Details
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                  Teacher Name
                </th>
                {trainingDates.map((date) => (
                  <th
                    key={date}
                    className="px-2 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 text-xs"
                  >
                    {date}
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {assignedTeachers.map((teacherId) => {
                const teacherAttendance = attendanceRecords.filter(r => r.teacherId === teacherId);
                const presentCount = teacherAttendance.filter(
                  r => r.status === AttendanceStatus.PRESENT
                ).length;

                return (
                  <tr
                    key={teacherId}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {getTeacherName(teacherId)}
                    </td>
                    {trainingDates.map((date) => {
                      const attendance = getAttendance(teacherId, date);
                      let bgColor = 'bg-gray-100 dark:bg-gray-700';
                      let textColor = 'text-gray-800 dark:text-gray-200';

                      if (attendance?.status === AttendanceStatus.PRESENT) {
                        bgColor = 'bg-green-100 dark:bg-green-900';
                        textColor = 'text-green-800 dark:text-green-200';
                      } else if (attendance?.status === AttendanceStatus.ABSENT) {
                        bgColor = 'bg-red-100 dark:bg-red-900';
                        textColor = 'text-red-800 dark:text-red-200';
                      }

                      return (
                        <td
                          key={`${teacherId}-${date}`}
                          className={`px-2 py-3 text-center font-medium text-xs ${bgColor} ${textColor} rounded`}
                        >
                          {attendance?.status === AttendanceStatus.PRESENT
                            ? '✓'
                            : attendance?.status === AttendanceStatus.ABSENT
                            ? '✗'
                            : '-'}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">
                      {presentCount}/{trainingDates.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default TrainingAttendanceView;

