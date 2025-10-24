import React, { useState, useEffect, useMemo } from 'react';
import { TrainingProgram, TrainingLevel, Teacher } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { PlusIcon, SearchIcon, UserGroupIcon } from '../components/ui/Icons';
import { useDebounce } from '../hooks/useDebounce';
import AddTrainingModal from '../components/modals/AddTrainingModal';
import AssignTeachersModal from '../components/modals/AssignTeachersModal';
import TrainingAttendanceView from '../components/TrainingAttendanceView';
import api from '../services/firebaseService';

const LevelBadge: React.FC<{ level: TrainingLevel }> = ({ level }) => {
  const colorClasses = {
    [TrainingLevel.BEGINNER]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    [TrainingLevel.INTERMEDIATE]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    [TrainingLevel.ADVANCED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClasses[level]}`}>
      {level}
    </span>
  );
};

const Trainings: React.FC = () => {
    const [trainings, setTrainings] = useState<TrainingProgram[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedTraining, setSelectedTraining] = useState<TrainingProgram | null>(null);
    const [editingTraining, setEditingTraining] = useState<TrainingProgram | null>(null);
    const [viewingAttendance, setViewingAttendance] = useState<TrainingProgram | null>(null);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [trainingsData, teachersData] = await Promise.all([
                    api.getTrainingPrograms(),
                    api.getTeachers()
                ]);
                setTrainings(trainingsData);
                setTeachers(teachersData);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAddTraining = async (newTrainingData: Omit<TrainingProgram, 'id' | 'objectives'>) => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const newTraining: TrainingProgram = {
            ...newTrainingData,
            id: `trn-${Date.now()}`,
            objectives: [] // Default empty objectives
        };
        setTrainings(prevTrainings => [newTraining, ...prevTrainings]);
        setIsModalOpen(false);
    };

    const handleCreateTraining = async (trainingData: Omit<TrainingProgram, 'id' | 'objectives'>) => {
        const created = await api.createTraining({ ...trainingData, objectives: [] });
        setTrainings(prev => [created, ...prev.filter(t => t.id !== created.id)]);
        setIsModalOpen(false);
        setEditingTraining(null);
    };

    const handleUpdateTraining = async (updated: TrainingProgram) => {
        const saved = await api.updateTraining(updated);
        setTrainings(prev => prev.map(t => t.id === saved.id ? saved : t));
        setIsModalOpen(false);
        setEditingTraining(null);
    };

    const handleDeleteTraining = async (id: string) => {
        if (!confirm('Delete this training program? This cannot be undone.')) return;
        await api.deleteTraining(id);
        setTrainings(prev => prev.filter(t => t.id !== id));
    };

    const handleAssignTeachers = (training: TrainingProgram) => {
        setSelectedTraining(training);
        setIsAssignModalOpen(true);
    };

    const handleAssignTeachersSubmit = async (teacherIds: string[], trainingId: string) => {
        // The API calls in the modal handle all the updates
        // Just refresh the trainings data to reflect changes
        const updatedTrainings = await api.getTrainingPrograms();
        setTrainings(updatedTrainings);
    };
    
    const filteredTrainings = useMemo(() => {
        return trainings.filter(training =>
            training.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            training.category.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
    }, [trainings, debouncedSearchTerm]);

    return (
        <>
            <Card>
                <div className="flex flex-col md:flex-row items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Training Program Management</h2>
                    <div className="flex items-center space-x-4 mt-4 md:mt-0">
                        <div className="relative">
                             <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                               <SearchIcon className="w-5 h-5 text-gray-400" />
                             </span>
                             <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="py-2 pl-10 pr-4 text-gray-700 bg-white border rounded-md dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none focus:ring focus:ring-opacity-40 focus:ring-blue-400"
                                placeholder="Search trainings..."
                            />
                        </div>
                        <Button onClick={() => setIsModalOpen(true)}>
                            <PlusIcon className="w-5 h-5 mr-2 -ml-1"/>
                            Add Training
                        </Button>
                    </div>
                </div>
                
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Spinner />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Program Name</th>
                                    <th scope="col" className="px-6 py-3">Level</th>
                                    <th scope="col" className="px-6 py-3">Category</th>
                                    <th scope="col" className="px-6 py-3">Participants</th>
                                    <th scope="col" className="px-6 py-3">Start Date</th>
                                    <th scope="col" className="px-6 py-3">End Date</th>
                                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTrainings.map((training) => (
                                    <tr key={training.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                            {training.name}
                                        </th>
                                        <td className="px-6 py-4">
                                            <LevelBadge level={training.level} />
                                        </td>
                                        <td className="px-6 py-4">{training.category}</td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {training.assignedTeachers?.length || 0}
                                            </span>
                                            <span className="text-gray-500 dark:text-gray-400">
                                                /{training.maxParticipants || '∞'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{training.startDate}</td>
                                        <td className="px-6 py-4">{training.endDate}</td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="secondary"
                                                onClick={() => setViewingAttendance(training)}
                                                className="mr-2 px-3 py-1 text-sm"
                                            >
                                                📊 Attendance
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={() => handleAssignTeachers(training)}
                                                className="mr-2 px-3 py-1 text-sm"
                                            >
                                                <UserGroupIcon className="w-4 h-4 mr-1"/>
                                                Manage Teachers
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={() => { setEditingTraining(training); setIsModalOpen(true); }}
                                                className="mr-2 px-3 py-1 text-sm"
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="danger"
                                                onClick={() => handleDeleteTraining(training.id)}
                                                className="px-3 py-1 text-sm"
                                            >
                                                Delete
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <AddTrainingModal 
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingTraining(null); }}
                onAddTraining={editingTraining ? handleUpdateTraining : handleCreateTraining}
                editingTraining={editingTraining}
            />
            <AssignTeachersModal
                isOpen={isAssignModalOpen}
                onClose={() => {
                    setIsAssignModalOpen(false);
                    setSelectedTraining(null);
                }}
                onAssignTeachers={handleAssignTeachersSubmit}
                training={selectedTraining}
            />

            {/* Attendance View Modal */}
            {viewingAttendance && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full my-8">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Attendance: {viewingAttendance.name}
                            </h2>
                            <button
                                onClick={() => setViewingAttendance(null)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
                            <TrainingAttendanceView
                                training={viewingAttendance}
                                teachers={teachers}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Trainings;