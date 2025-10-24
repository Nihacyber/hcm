import React, { useState, useEffect } from 'react';
import { Teacher, TrainingProgram, TeacherTraining } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import api from '../../services/firebaseService';

interface TrainingAssignmentDebugProps {
  teacherId?: string;
}

const TrainingAssignmentDebug: React.FC<TrainingAssignmentDebugProps> = ({ teacherId }) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [trainings, setTrainings] = useState<TrainingProgram[]>([]);
  const [teacherTrainings, setTeacherTrainings] = useState<TeacherTraining[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teacherId || '');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [teachersData, trainingsData] = await Promise.all([
          api.getTeachers(),
          api.getTrainingPrograms()
        ]);
        setTeachers(teachersData);
        setTrainings(trainingsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDebugTeacher = async () => {
    if (!selectedTeacherId) return;

    setLoading(true);
    try {
      // Get teacher training records
      const trainingRecords = await api.getTeacherTrainingRecords(selectedTeacherId);
      setTeacherTrainings(trainingRecords);

      // Get teacher data
      const teacher = teachers.find(t => t.id === selectedTeacherId);

      // Find trainings where this teacher is assigned
      const assignedTrainings = trainings.filter(training => 
        training.assignedTeachers?.includes(selectedTeacherId)
      );

      // Find trainings in teacher's training history
      const historyTrainings = trainings.filter(training => 
        teacher?.trainingHistory?.includes(training.id)
      );

      const debug = {
        teacherId: selectedTeacherId,
        teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown',
        teacherTrainingHistory: teacher?.trainingHistory || [],
        teacherTrainingRecords: trainingRecords,
        assignedTrainingsFromPrograms: assignedTrainings,
        historyTrainings: historyTrainings,
        discrepancies: {
          recordsButNotInPrograms: trainingRecords.filter(record => 
            !assignedTrainings.some(training => training.id === record.trainingProgramId)
          ),
          programsButNotInRecords: assignedTrainings.filter(training => 
            !trainingRecords.some(record => record.trainingProgramId === training.id)
          ),
          historyButNotInRecords: historyTrainings.filter(training => 
            !trainingRecords.some(record => record.trainingProgramId === training.id)
          ),
          recordsButNotInHistory: trainingRecords.filter(record => 
            !teacher?.trainingHistory?.includes(record.trainingProgramId)
          )
        }
      };

      setDebugInfo(debug);
      console.log('Training Assignment Debug Info:', debug);
    } catch (error) {
      console.error('Error debugging teacher assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestAssignment = async () => {
    if (!selectedTeacherId || trainings.length === 0) return;

    const firstTraining = trainings[0];
    try {
      console.log(`Testing assignment of teacher ${selectedTeacherId} to training ${firstTraining.id}`);
      await api.assignTeacherToTraining(selectedTeacherId, firstTraining.id);
      console.log('Assignment successful');
      
      // Refresh debug info
      await handleDebugTeacher();
    } catch (error) {
      console.error('Assignment failed:', error);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
        Training Assignment Debug Tool
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Teacher
          </label>
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Select a teacher...</option>
            {teachers.map(teacher => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.firstName} {teacher.lastName} ({teacher.email})
              </option>
            ))}
          </select>
        </div>

        <div className="flex space-x-4">
          <Button
            onClick={handleDebugTeacher}
            disabled={!selectedTeacherId || loading}
            variant="primary"
          >
            Debug Teacher Assignments
          </Button>
          <Button
            onClick={handleTestAssignment}
            disabled={!selectedTeacherId || loading || trainings.length === 0}
            variant="secondary"
          >
            Test Assignment (First Training)
          </Button>
        </div>

        {debugInfo && (
          <div className="mt-6 space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Debug Results</h3>
              <div className="text-sm space-y-2">
                <p><strong>Teacher:</strong> {debugInfo.teacherName} ({debugInfo.teacherId})</p>
                <p><strong>Training History IDs:</strong> {JSON.stringify(debugInfo.teacherTrainingHistory)}</p>
                <p><strong>Teacher Training Records:</strong> {debugInfo.teacherTrainingRecords.length} records</p>
                <p><strong>Assigned in Training Programs:</strong> {debugInfo.assignedTrainingsFromPrograms.length} trainings</p>
              </div>
            </div>

            {Object.keys(debugInfo.discrepancies).some(key => debugInfo.discrepancies[key].length > 0) && (
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">Discrepancies Found</h3>
                <div className="text-sm space-y-2">
                  {debugInfo.discrepancies.recordsButNotInPrograms.length > 0 && (
                    <p className="text-red-700 dark:text-red-300">
                      <strong>Records but not in programs:</strong> {debugInfo.discrepancies.recordsButNotInPrograms.length}
                    </p>
                  )}
                  {debugInfo.discrepancies.programsButNotInRecords.length > 0 && (
                    <p className="text-red-700 dark:text-red-300">
                      <strong>Programs but not in records:</strong> {debugInfo.discrepancies.programsButNotInRecords.length}
                    </p>
                  )}
                  {debugInfo.discrepancies.historyButNotInRecords.length > 0 && (
                    <p className="text-red-700 dark:text-red-300">
                      <strong>History but not in records:</strong> {debugInfo.discrepancies.historyButNotInRecords.length}
                    </p>
                  )}
                  {debugInfo.discrepancies.recordsButNotInHistory.length > 0 && (
                    <p className="text-red-700 dark:text-red-300">
                      <strong>Records but not in history:</strong> {debugInfo.discrepancies.recordsButNotInHistory.length}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">Raw Data</h3>
              <pre className="text-xs overflow-auto max-h-64 text-blue-700 dark:text-blue-300">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TrainingAssignmentDebug;
