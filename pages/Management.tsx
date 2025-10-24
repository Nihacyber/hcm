import React, { useState, useEffect, useMemo } from 'react';
import { Management as ManagementType, School } from '../types';
import api from '../services/firebaseService';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { PlusIcon, SearchIcon } from '../components/ui/Icons';
import { useDebounce } from '../hooks/useDebounce';
import AddManagementModal from '../components/modals/AddManagementModal';

const Management: React.FC = () => {
    const [management, setManagement] = useState<ManagementType[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [managementData, schoolsData] = await Promise.all([
                    api.getManagement(),
                    api.getSchools()
                ]);
                setManagement(managementData);
                setSchools(schoolsData);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleAddManagement = async (newManagementData: Omit<ManagementType, 'id'>) => {
        try {
            setLoading(true);
            const newStaff = await api.createManagement(newManagementData);
            setManagement(prevManagement => [newStaff, ...prevManagement]);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Failed to add management staff:", error);
            throw error; // Re-throw to let modal handle the error
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteManagement = async (id: string) => {
        try {
            await api.removeManagement(id);
            setManagement(prevManagement => prevManagement.filter(staff => staff.id !== id));
        } catch (error) {
            console.error("Failed to delete management staff:", error);
        }
    };

    const getSchoolName = (schoolId: string) => {
        const school = schools.find(s => s.id === schoolId);
        return school ? school.name : 'Unknown School';
    };

    const filteredManagement = useMemo(() => {
        return management.filter(staff =>
            staff.firstName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            staff.lastName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            staff.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            staff.role.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            staff.department.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
            getSchoolName(staff.schoolId).toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        );
    }, [management, debouncedSearchTerm, schools]);

    return (
        <>
            <Card>
                <div className="flex flex-col md:flex-row items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">Management Staff</h2>
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
                                placeholder="Search management staff..."
                            />
                        </div>
                        <Button onClick={() => setIsModalOpen(true)}>
                            <PlusIcon className="w-5 h-5 mr-2 -ml-1"/>
                            Add Staff
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
                                    <th scope="col" className="px-6 py-3">Role</th>
                                    <th scope="col" className="px-6 py-3">Department</th>
                                    <th scope="col" className="px-6 py-3">Experience</th>
                                    <th scope="col" className="px-6 py-3">Qualifications</th>
                                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredManagement.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                            No management staff found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredManagement.map((staff) => (
                                        <tr key={staff.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                            <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                                                {staff.firstName} {staff.lastName}
                                            </th>
                                            <td className="px-6 py-4">{staff.email}</td>
                                            <td className="px-6 py-4">{staff.phone}</td>
                                            <td className="px-6 py-4">{getSchoolName(staff.schoolId)}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded dark:bg-blue-900 dark:text-blue-300">
                                                    {staff.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{staff.department}</td>
                                            <td className="px-6 py-4">{staff.experience} years</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {Array.isArray(staff.qualifications) && staff.qualifications.length > 0 ? (
                                                        staff.qualifications.map((qual, index) => (
                                                            <span key={index} className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded dark:bg-indigo-900 dark:text-indigo-300">
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
                                                <a href="#" onClick={(e) => { e.preventDefault(); handleDeleteManagement(staff.id); }} className="font-medium text-red-600 dark:text-red-500 hover:underline">Delete</a>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
            <AddManagementModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAddManagement={handleAddManagement}
            />
        </>
    );
};

export default Management;