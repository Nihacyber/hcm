import React, { useState, useEffect } from 'react';
import { TrainingProgram } from '../types';
import api from '../services/firebaseService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

const AttendanceAnalytics: React.FC = () => {
  const [trainings, setTrainings] = useState<TrainingProgram[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'full-period' | 'session' | 'daily' | 'no-attendance'>('full-period');

  // Analytics data states
  const [fullPeriodData, setFullPeriodData] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [dailyData, setDailyData] = useState<any>(null);
  const [noAttendanceData, setNoAttendanceData] = useState<any>(null);

  useEffect(() => {
    const fetchTrainings = async () => {
      try {
        const trainingsData = await api.getTrainingPrograms();
        setTrainings(trainingsData);
      } catch (error) {
        console.error('Error fetching trainings:', error);
      }
    };
    fetchTrainings();
  }, []);

  const handleFullPeriodAnalysis = async () => {
    if (!selectedTraining || !startDate || !endDate) return;

    setLoading(true);
    try {
      const data = await api.getFullPeriodAttendance(selectedTraining, startDate, endDate);
      setFullPeriodData(data);
    } catch (error) {
      console.error('Error getting full period attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionAnalysis = async () => {
    if (!selectedTraining || !sessionDate) return;

    setLoading(true);
    try {
      const data = await api.getSessionAttendance(selectedTraining, sessionDate);
      setSessionData(data);
    } catch (error) {
      console.error('Error getting session attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDailyAnalysis = async () => {
    if (!selectedTraining || !startDate || !endDate) return;

    setLoading(true);
    try {
      const data = await api.getDailyHeadcountAndAttendanceRate(selectedTraining, startDate, endDate);
      setDailyData(data);
    } catch (error) {
      console.error('Error getting daily headcount:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNoAttendanceAnalysis = async () => {
    if (!selectedTraining || !startDate || !endDate) return;

    setLoading(true);
    try {
      const data = await api.getTeachersWithNoAttendance(selectedTraining, startDate, endDate);
      setNoAttendanceData(data);
    } catch (error) {
      console.error('Error getting teachers with no attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTrainingData = trainings.find(t => t.id === selectedTraining);

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-6">
          Attendance Analytics
        </h2>

        {/* Training Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Training Program
          </label>
          <select
            value={selectedTraining}
            onChange={(e) => setSelectedTraining(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="">Choose a training program...</option>
            {trainings.map((training) => (
              <option key={training.id} value={training.id}>
                {training.name} ({training.startDate} to {training.endDate})
              </option>
            ))}
          </select>
        </div>

        {selectedTrainingData && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
            <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Selected Training</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Name:</strong> {selectedTrainingData.name}<br />
              <strong>Period:</strong> {selectedTrainingData.startDate} to {selectedTrainingData.endDate}<br />
              <strong>Assigned Teachers:</strong> {selectedTrainingData.assignedTeachers?.length || 0}
            </p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6">
          {[
            { key: 'full-period', label: 'Full Period Attendance' },
            { key: 'session', label: 'Session Attendance' },
            { key: 'daily', label: 'Daily Headcount' },
            { key: 'no-attendance', label: 'No Attendance' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                activeTab === tab.key
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Analysis Controls */}
        <div className="mb-6">
          {activeTab === 'full-period' || activeTab === 'daily' || activeTab === 'no-attendance' ? (
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={
                    activeTab === 'full-period' ? handleFullPeriodAnalysis :
                    activeTab === 'daily' ? handleDailyAnalysis :
                    handleNoAttendanceAnalysis
                  }
                  disabled={!selectedTraining || !startDate || !endDate || loading}
                >
                  {loading ? 'Analyzing...' : 'Analyze'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Session Date
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSessionAnalysis}
                  disabled={!selectedTraining || !sessionDate || loading}
                >
                  {loading ? 'Analyzing...' : 'Analyze'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Results */}
      {loading && (
        <Card>
          <div className="flex justify-center items-center h-32">
            <Spinner />
          </div>
        </Card>
      )}

      {/* Full Period Results */}
      {activeTab === 'full-period' && fullPeriodData && (
        <Card>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Full Period Attendance Analysis
          </h3>

          {/* Summary */}
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900 rounded-lg border border-green-200 dark:border-green-700">
            <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Summary</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">Total Teachers</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {fullPeriodData.summary.totalTeachers}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">Average Attendance Rate</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {fullPeriodData.summary.averageAttendanceRate}%
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700 dark:text-green-300">Fully Attended</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {fullPeriodData.summary.fullyAttended}
                </p>
              </div>
            </div>
          </div>

          {/* Teacher Details */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Teacher Name</th>
                  <th className="px-6 py-3">Attendance Rate</th>
                  <th className="px-6 py-3">Present Days</th>
                  <th className="px-6 py-3">Total Days</th>
                </tr>
              </thead>
              <tbody>
                {fullPeriodData.teachers.map((teacher: any, index: number) => (
                  <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {teacher.teacherName}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        teacher.attendanceRate >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        teacher.attendanceRate >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {teacher.attendanceRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4">{teacher.presentDays}</td>
                    <td className="px-6 py-4">{teacher.totalDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Session Results */}
      {activeTab === 'session' && sessionData && (
        <Card>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Session Attendance - {sessionDate}
          </h3>

          {/* Summary */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Summary</h4>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">Total Assigned</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {sessionData.summary.totalAssigned}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">Present</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {sessionData.summary.presentCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">Absent</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {sessionData.summary.absentCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-300">Not Marked</p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {sessionData.summary.notMarkedCount}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Present */}
            <div>
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Present ({sessionData.present.length})</h4>
              <div className="space-y-1">
                {sessionData.present.map((teacher: any, index: number) => (
                  <div key={index} className="text-sm text-gray-700 dark:text-gray-300">
                    {teacher.teacherName}
                  </div>
                ))}
                {sessionData.present.length === 0 && (
                  <div className="text-sm text-gray-500 italic">No teachers present</div>
                )}
              </div>
            </div>

            {/* Absent */}
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Absent ({sessionData.absent.length})</h4>
              <div className="space-y-1">
                {sessionData.absent.map((teacher: any, index: number) => (
                  <div key={index} className="text-sm text-gray-700 dark:text-gray-300">
                    {teacher.teacherName}
                  </div>
                ))}
                {sessionData.absent.length === 0 && (
                  <div className="text-sm text-gray-500 italic">No teachers absent</div>
                )}
              </div>
            </div>

            {/* Not Marked */}
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Not Marked ({sessionData.notMarked.length})</h4>
              <div className="space-y-1">
                {sessionData.notMarked.map((teacher: any, index: number) => (
                  <div key={index} className="text-sm text-gray-700 dark:text-gray-300">
                    {teacher.teacherName}
                  </div>
                ))}
                {sessionData.notMarked.length === 0 && (
                  <div className="text-sm text-gray-500 italic">All attendance marked</div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Daily Headcount Results */}
      {activeTab === 'daily' && dailyData && (
        <Card>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Daily Headcount & Attendance Rate
          </h3>

          {/* Overall Summary */}
          <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900 rounded-lg border border-purple-200 dark:border-purple-700">
            <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Overall Summary</h4>
            <div className="grid grid-cols-5 gap-4">
              <div>
                <p className="text-sm text-purple-700 dark:text-purple-300">Total Days</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {dailyData.overallSummary.totalDays}
                </p>
              </div>
              <div>
                <p className="text-sm text-purple-700 dark:text-purple-300">Avg Attendance Rate</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {dailyData.overallSummary.averageAttendanceRate}%
                </p>
              </div>
              <div>
                <p className="text-sm text-purple-700 dark:text-purple-300">Total Present</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {dailyData.overallSummary.totalPresent}
                </p>
              </div>
              <div>
                <p className="text-sm text-purple-700 dark:text-purple-300">Total Absent</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {dailyData.overallSummary.totalAbsent}
                </p>
              </div>
              <div>
                <p className="text-sm text-purple-700 dark:text-purple-300">Total Not Marked</p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                  {dailyData.overallSummary.totalNotMarked}
                </p>
              </div>
            </div>
          </div>

          {/* Daily Stats Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Present</th>
                  <th className="px-6 py-3">Absent</th>
                  <th className="px-6 py-3">Not Marked</th>
                  <th className="px-6 py-3">Attendance Rate</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.dailyStats.map((day: any, index: number) => (
                  <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {new Date(day.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-green-600 dark:text-green-400 font-medium">
                      {day.presentCount}
                    </td>
                    <td className="px-6 py-4 text-red-600 dark:text-red-400 font-medium">
                      {day.absentCount}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-medium">
                      {day.notMarkedCount}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        day.attendanceRate >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        day.attendanceRate >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {day.attendanceRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* No Attendance Results */}
      {activeTab === 'no-attendance' && noAttendanceData && (
        <Card>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Teachers with No Attendance
          </h3>

          {/* Summary */}
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900 rounded-lg border border-red-200 dark:border-red-700">
            <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-red-700 dark:text-red-300">Total Teachers Assigned</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {noAttendanceData.summary.totalTeachers}
                </p>
              </div>
              <div>
                <p className="text-sm text-red-700 dark:text-red-300">No Attendance</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {noAttendanceData.summary.noAttendanceCount}
                </p>
              </div>
            </div>
          </div>

          {/* Teachers List */}
          {noAttendanceData.teachers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Teacher Name</th>
                    <th className="px-6 py-3">Sessions Available</th>
                    <th className="px-6 py-3">Sessions Attended</th>
                  </tr>
                </thead>
                <tbody>
                  {noAttendanceData.teachers.map((teacher: any, index: number) => (
                    <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {teacher.teacherName}
                      </td>
                      <td className="px-6 py-4">{teacher.totalSessions}</td>
                      <td className="px-6 py-4 text-red-600 dark:text-red-400 font-medium">
                        {teacher.attendedSessions}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                All assigned teachers have attended at least one session in the selected period.
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default AttendanceAnalytics;