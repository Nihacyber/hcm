import React, { useState, useEffect, useMemo } from 'react';
import { School, Teacher, Mentor, Management } from '../types';
import api from '../services/firebaseService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { PlusIcon, SearchIcon, ChevronDownIcon, ChevronRightIcon } from '../components/ui/Icons';
import { useDebounce } from '../hooks/useDebounce';
import AddSchoolModal from '../components/modals/AddSchoolModal';
import EditSchoolModal from '../components/modals/EditSchoolModal';

const Schools: React.FC = () => {
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
    const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    useEffect(() => {
        const fetchSchools = async () => {
            setLoading(true);
            const schoolsData = await api.getSchools();
            setSchools(schoolsData);
            setLoading(false);
        };
        fetchSchools();
    }, []);
    
    const handleAddSchool = async (newSchoolData: Omit<School, 'id' | 'contacts' | 'teachers' | 'mentors' | 'management'> & {
        teachers?: Omit<Teacher, 'id' | 'schoolId' | 'trainingHistory'>[];
        mentors?: Omit<Mentor, 'id' | 'schoolId' | 'assignedTeachers'>[];
        management?: Omit<Management, 'id' | 'schoolId'>[];
    }) => {
        try {
            setLoading(true);
            const newSchool = await api.createSchool(newSchoolData);
            setSchools(prevSchools => [newSchool, ...prevSchools]);
            // Auto-expand the newly added school to show its details
            setExpandedSchools(prev => new Set(prev).add(newSchool.id));
            setIsModalOpen(false);
        } catch (error) {
            console.error("Failed to create school:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditSchool = (school: School) => {
        setSelectedSchool(school);
        setIsEditModalOpen(true);
    };

    const handleUpdateSchool = async (updatedSchool: School) => {
        try {
            setLoading(true);
            const school = await api.updateSchool(updatedSchool);
            setSchools(prevSchools =>
                prevSchools.map(s => s.id === school.id ? school : s)
            );
            setIsEditModalOpen(false);
        } catch (error) {
            console.error("Failed to update school:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSchoolExpansion = (schoolId: string, e?: React.MouseEvent) => {
        // Prevent expansion toggle when clicking on interactive elements
        if (e?.target instanceof Element) {
            const target = e.target as HTMLElement;
            if (target.closest('a, button')) {
                return;
            }
        }
        
        setExpandedSchools(prev => {
            const newSet = new Set(prev);
            if (newSet.has(schoolId)) {
                newSet.delete(schoolId);
            } else {
                newSet.add(schoolId);
            }
            return newSet;
        });
    };

    const filteredSchools = useMemo(() => {
        return schools.filter(school =>
            school.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            school.city.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
    }, [schools, debouncedSearchTerm]);

    return (
        <>
            <Card>
                <div className="flex flex-col md:flex-row items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">School Management</h2>
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
                                placeholder="Search schools..."
                            />
                        </div>
                        <Button onClick={() => setIsModalOpen(true)}>
                            <PlusIcon className="w-5 h-5 mr-2 -ml-1"/>
                            Add School
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
                                    <th scope="col" className="px-6 py-3">School Name</th>
                                    <th scope="col" className="px-6 py-3">City</th>
                                    <th scope="col" className="px-6 py-3">State</th>
                                    <th scope="col" className="px-6 py-3 text-center">Students</th>
                                    <th scope="col" className="px-6 py-3 text-center">Teachers</th>
                                    <th scope="col" className="px-6 py-3 text-center">Mentors</th>
                                    <th scope="col" className="px-6 py-3 text-center">Management</th>
                                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSchools.map((school) => (
                                    <React.Fragment key={school.id}>
                                        <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer" onClick={(e) => toggleSchoolExpansion(school.id, e)}>
                                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                <div className="flex items-center">
                                                    {expandedSchools.has(school.id) ? (
                                                        <ChevronDownIcon className="w-4 h-4 mr-2 text-gray-500" />
                                                    ) : (
                                                        <ChevronRightIcon className="w-4 h-4 mr-2 text-gray-500" />
                                                    )}
                                                    {school.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{school.city}</td>
                                            <td className="px-6 py-4">{school.state}</td>
                                            <td className="px-6 py-4 text-center">{school.studentCount}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {school.teachers?.length || 0}
                                                </span>
                                                <span className="text-gray-500 dark:text-gray-400">
                                                    /{school.teacherCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {school.mentors?.length || 0}
                                                </span>
                                                <span className="text-gray-500 dark:text-gray-400">
                                                    /{school.mentorCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {school.management?.length || 0}
                                                </span>
                                                <span className="text-gray-500 dark:text-gray-400">
                                                    /{school.managementCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditSchool(school); }} className="font-medium text-primary-600 dark:text-primary-500 hover:underline mr-4">Edit</a>
                                                <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="font-medium text-red-600 dark:text-red-500 hover:underline">Delete</a>
                                            </td>
                                        </tr>

                                        {/* Expanded School Details */}
                                        {expandedSchools.has(school.id) && (
                                            <>
                                                {/* Teachers Row */}
                                                {school.teachers && school.teachers.length > 0 && (
                                                    <tr className="bg-gray-50 dark:bg-gray-700">
                                                        <td colSpan={8} className="px-6 py-4">
                                                            <div className="ml-6">
                                                                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                                                                    <span className="mr-2">👨‍🏫</span>
                                                                    Teachers ({school.teachers.length})
                                                                </h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                    {school.teachers.map((teacher) => (
                                                                        <div key={teacher.id} className="p-2 bg-white dark:bg-gray-800 rounded border text-sm">
                                                                            <div className="font-medium text-gray-900 dark:text-white">
                                                                                {teacher.firstName} {teacher.lastName}
                                                                            </div>
                                                                            <div className="text-gray-500 dark:text-gray-400">
                                                                                {teacher.subject} • {teacher.email}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}

                                                {/* Mentors Row */}
                                                {school.mentors && school.mentors.length > 0 && (
                                                    <tr className="bg-gray-50 dark:bg-gray-700">
                                                        <td colSpan={8} className="px-6 py-4">
                                                            <div className="ml-6">
                                                                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                                                                    <span className="mr-2">👨‍💼</span>
                                                                    Mentors ({school.mentors.length})
                                                                </h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                    {school.mentors.map((mentor) => (
                                                                        <div key={mentor.id} className="p-2 bg-white dark:bg-gray-800 rounded border text-sm">
                                                                            <div className="font-medium text-gray-900 dark:text-white">
                                                                                {mentor.firstName} {mentor.lastName}
                                                                            </div>
                                                                            <div className="text-gray-500 dark:text-gray-400">
                                                                                {mentor.specialization} • {mentor.experience} years exp
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}

                                                {/* Management Row */}
                                                {school.management && school.management.length > 0 && (
                                                    <tr className="bg-gray-50 dark:bg-gray-700">
                                                        <td colSpan={8} className="px-6 py-4">
                                                            <div className="ml-6">
                                                                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                                                                    <span className="mr-2">👔</span>
                                                                    Management ({school.management.length})
                                                                </h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                                    {school.management.map((staff) => (
                                                                        <div key={staff.id} className="p-2 bg-white dark:bg-gray-800 rounded border text-sm">
                                                                            <div className="font-medium text-gray-900 dark:text-white">
                                                                                {staff.firstName} {staff.lastName}
                                                                            </div>
                                                                            <div className="text-gray-500 dark:text-gray-400">
                                                                                {staff.role} • {staff.department}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <AddSchoolModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAddSchool={handleAddSchool}
            />
            {selectedSchool && (
                <EditSchoolModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    school={selectedSchool}
                    onUpdateSchool={handleUpdateSchool}
                />
            )}
        </>
    );
};

export default Schools;