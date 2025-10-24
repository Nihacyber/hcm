import React, { useState, useEffect, useMemo } from 'react';
import { Teacher, School, TrainingProgram } from '../types';
import api from '../services/firebaseService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { PlusIcon, SearchIcon } from '../components/ui/Icons';
import { useDebounce } from '../hooks/useDebounce';
import AddTeacherModal from '../components/modals/AddTeacherModal';
import TeacherProfileModal from '../components/modals/TeacherProfileModal';

const Teachers: React.FC = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [trainings, setTrainings] = useState<TrainingProgram[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [teachersData, schoolsData, trainingsData] = await Promise.all([
                    api.getTeachers(),
                    api.getSchools(),
                    api.getTrainingPrograms()
                ]);
                setTeachers(teachersData);
                setSchools(schoolsData);
                setTrainings(trainingsData);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    
    const handleAddTeacher = async (newTeacherData: Omit<Teacher, 'id' | 'trainingHistory'>) => {
        try {
            setLoading(true);
            const newTeacher = await api.createTeacher(newTeacherData);
            setTeachers(prevTeachers => [newTeacher, ...prevTeachers]);
            // Don't close modal immediately - let user see credentials and click "Done"
            // setIsModalOpen(false);
        } catch (error) {
            console.error("Failed to add teacher:", error);
            throw error; // Re-throw to let modal handle the error
        } finally {
            setLoading(false);
        }
    };
    
    const getSchoolName = (schoolId: string) => {
        const school = schools.find(s => s.id === schoolId);
        return school ? school.name : 'Unknown School';
    };

    const getTrainingNames = (trainingIds: string[]) => {
        return trainingIds.map(id => {
            const training = trainings.find(t => t.id === id);
            return training ? training.name : 'Unknown Training';
        });
    };

    const handleViewTeacherProfile = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setIsProfileModalOpen(true);
    };

    const handleDeleteTeacher = async (teacherId: string) => {
        if (window.confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) {
            try {
                setLoading(true);
                await api.deleteTeacher(teacherId);
                setTeachers(prevTeachers => prevTeachers.filter(t => t.id !== teacherId));
            } catch (error) {
                console.error("Failed to delete teacher:", error);
                alert('Failed to delete teacher. Please try again.');
            } finally {
                setLoading(false);
            }
        }
    };

    const filteredTeachers = useMemo(() => {
        return teachers.filter(teacher =>
            teacher.firstName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            teacher.lastName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            teacher.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            teacher.subject.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            getSchoolName(teacher.schoolId).toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            getTrainingNames(teacher.trainingHistory).some(name => name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
        );
    }, [teachers, debouncedSearchTerm, schools, trainings]);

    return (
        <>
            <Card>
                <div className="flex flex-col md:flex-row items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Teacher Management</h2>
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
                                placeholder="Search teachers..."
                            />
                        </div>
                        <Button onClick={() => setIsModalOpen(true)}>
                            <PlusIcon className="w-5 h-5 mr-2 -ml-1"/>
                            Add Teacher
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
                                    <th scope="col" className="px-6 py-3">Name</th>
                                    <th scope="col" className="px-6 py-3">Email</th>
                                    <th scope="col" className="px-6 py-3">Phone</th>
                                    <th scope="col" className="px-6 py-3">School</th>
                                    <th scope="col" className="px-6 py-3">Subject</th>
                                    <th scope="col" className="px-6 py-3">Training History</th>
                                    <th scope="col" className="px-6 py-3">Qualifications</th>
                                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTeachers.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                            No teachers found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTeachers.map((teacher) => (
                                        <tr key={teacher.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                <button
                                                    onClick={() => handleViewTeacherProfile(teacher)}
                                                    className="text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
                                                >
                                                    {teacher.firstName} {teacher.lastName}
                                                </button>
                                            </th>
                                            <td className="px-6 py-4">{teacher.email}</td>
                                            <td className="px-6 py-4">{teacher.phone}</td>
                                            <td className="px-6 py-4">{getSchoolName(teacher.schoolId)}</td>
                                            <td className="px-6 py-4">{teacher.subject}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {teacher.trainingHistory.length === 0 ? (
                                                        <span className="px-2 py-1 text-xs text-gray-500 italic">
                                                            No training history
                                                        </span>
                                                    ) : (
                                                        getTrainingNames(teacher.trainingHistory).map((trainingName, index) => (
                                                            <span key={index} className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded dark:bg-green-900 dark:text-green-300">
                                                                {trainingName}
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.isArray(teacher.qualifications) && teacher.qualifications.length > 0 ? (
                                                        teacher.qualifications.map((qual, index) => (
                                                            <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded dark:bg-blue-900 dark:text-blue-300">
                                                                {qual}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="px-2 py-1 text-xs text-gray-500 italic">
                                                            No qualifications
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <a href="#" className="font-medium text-primary-600 dark:text-primary-500 hover:underline mr-4">Edit</a>
                                                <button
                                                    onClick={() => handleDeleteTeacher(teacher.id)}
                                                    className="font-medium text-red-600 dark:text-red-500 hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <AddTeacherModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAddTeacher={handleAddTeacher}
            />
            <TeacherProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                teacher={selectedTeacher}
                school={selectedTeacher ? schools.find(s => s.id === selectedTeacher.schoolId) : undefined}
                trainings={trainings}
            />
        </>
    );
};

export default Teachers;