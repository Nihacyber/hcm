import { useEffect, useState } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { TrainingProgram, TrainingAttendance, TrainingAssignment } from '../lib/models';
import { BarChart3, Users, UserCheck, UserX, Calendar } from 'lucide-react';

interface DayData {
  date: string;
  assigned: number;
  present: number;
  absent: number;
  totalAttendance: number;
}

export default function AttendanceAnalytics() {
  const [attendanceData, setAttendanceData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalAssigned: 0,
    attendanceRate: 0,
  });

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    if (programs.length > 0) {
      loadAttendanceData();
    }
  }, [selectedProgram, programs]);

  const loadPrograms = async () => {
    try {
      const data = await db.find<TrainingProgram>(
        Collections.TRAINING_PROGRAMS,
        { status: 'active' },
        { sort: { created_at: -1 } }
      );

      setPrograms(data || []);
      if (data && data.length > 0) {
        setSelectedProgram(data[0].id!);
      }
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  const loadAttendanceData = async () => {
    setLoading(true);

    try {
      const attendanceFilter: any = {};
      if (selectedProgram !== 'all') {
        attendanceFilter.training_program_id = selectedProgram;
      }

      const attendanceRecords = await db.find<TrainingAttendance>(
        Collections.TRAINING_ATTENDANCE,
        attendanceFilter
      );

      const assignmentsFilter: any = {};
      if (selectedProgram !== 'all') {
        assignmentsFilter.training_program_id = selectedProgram;
      }

      const assignments = await db.find<TrainingAssignment>(
        Collections.TRAINING_ASSIGNMENTS,
        assignmentsFilter
      );

      const dateMap = new Map<string, DayData>();

      attendanceRecords?.forEach((record) => {
        const dateStr = record.attendance_date;
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, {
            date: dateStr,
            assigned: assignments?.length || 0,
            present: 0,
            absent: 0,
            totalAttendance: 0,
          });
        }

        const dayData = dateMap.get(dateStr)!;
        dayData.totalAttendance++;

        if (record.status === 'present' || record.status === 'late') {
          dayData.present++;
        } else if (record.status === 'absent') {
          dayData.absent++;
        }
      });

      const sortedData = Array.from(dateMap.values()).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setAttendanceData(sortedData);

      const totalPresent = sortedData.reduce((sum, day) => sum + day.present, 0);
      const totalPossible = sortedData.reduce((sum, day) => sum + day.assigned, 0);
      const attendanceRate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;

      setTotalStats({
        totalAssigned: assignments?.length || 0,
        attendanceRate,
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const maxValue = Math.max(...attendanceData.map(d => Math.max(d.assigned, d.present, d.absent)), 1);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading attendance analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <BarChart3 className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Training Attendance Analytics</h3>
              <p className="text-sm text-gray-600">Day-wise attendance breakdown</p>
            </div>
          </div>

          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.title}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Users className="text-white" size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Teachers Assigned</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.totalAssigned}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-600 p-2 rounded-lg">
                <Calendar className="text-white" size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Attendance Rate</p>
                <p className="text-2xl font-bold text-gray-900">{totalStats.attendanceRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {attendanceData.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-gray-700">Assigned</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-gray-700">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-gray-700">Absent</span>
              </div>
            </div>

            <div className="overflow-x-auto pb-4">
              <div className="inline-flex gap-4 px-4" style={{ minWidth: '100%' }}>
                {attendanceData.map((day, index) => {
                  const assignedHeight = Math.max((day.assigned / maxValue) * 240, day.assigned > 0 ? 20 : 0);
                  const presentHeight = Math.max((day.present / maxValue) * 240, day.present > 0 ? 20 : 0);
                  const absentHeight = Math.max((day.absent / maxValue) * 240, day.absent > 0 ? 20 : 0);

                  return (
                    <div key={index} className="flex flex-col items-center gap-3" style={{ minWidth: '100px' }}>
                      <div className="flex items-end gap-2 h-64">
                        <div className="flex flex-col items-center gap-2">
                          <div className="relative group flex flex-col justify-end" style={{ height: '240px' }}>
                            <div
                              className="bg-blue-500 hover:bg-blue-600 transition-colors rounded-t cursor-pointer"
                              style={{
                                height: `${assignedHeight}px`,
                                width: '24px'
                              }}
                            >
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                Assigned: {day.assigned}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-blue-600">{day.assigned}</span>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                          <div className="relative group flex flex-col justify-end" style={{ height: '240px' }}>
                            <div
                              className="bg-green-500 hover:bg-green-600 transition-colors rounded-t cursor-pointer"
                              style={{
                                height: `${presentHeight}px`,
                                width: '24px'
                              }}
                            >
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                Present: {day.present}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-green-600">{day.present}</span>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                          <div className="relative group flex flex-col justify-end" style={{ height: '240px' }}>
                            <div
                              className="bg-red-500 hover:bg-red-600 transition-colors rounded-t cursor-pointer"
                              style={{
                                height: `${absentHeight}px`,
                                width: '24px'
                              }}
                            >
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                Absent: {day.absent}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-red-600">{day.absent}</span>
                        </div>
                      </div>

                      <div className="text-xs font-medium text-gray-700 text-center">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
            <p>No attendance data available for this training program</p>
          </div>
        )}
      </div>
    </div>
  );
}
