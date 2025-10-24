import React, { useState } from 'react';
import { School, Teacher, Mentor, Management } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { CloseIcon, PlusIcon } from '../ui/Icons';

interface AddSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSchool: (school: Omit<School, 'id' | 'contacts' | 'teachers' | 'mentors' | 'management'> & {
    teachers?: Teacher[];
    mentors?: Mentor[];
    management?: Management[];
  }) => void;
}

const AddSchoolModal: React.FC<AddSchoolModalProps> = ({ isOpen, onClose, onAddSchool }) => {
  const [activeTab, setActiveTab] = useState<'school' | 'teachers' | 'mentors' | 'management'>('school');

  const schoolInitialState = {
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    studentCount: 0,
    teacherCount: 0,
    mentorCount: 0,
    managementCount: 0,
  };

  const teacherInitialState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    subject: '',
    qualifications: '',
  };

  const mentorInitialState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
    experience: 0,
    qualifications: '',
  };

  const managementInitialState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'Administrator' as const,
    department: '',
    experience: 0,
    qualifications: '',
  };

  const [schoolData, setSchoolData] = useState(schoolInitialState);
  const [teachers, setTeachers] = useState<Omit<Teacher, 'id' | 'schoolId' | 'trainingHistory'>[]>([]);
  const [mentors, setMentors] = useState<Omit<Mentor, 'id' | 'schoolId' | 'assignedTeachers'>[]>([]);
  const [management, setManagement] = useState<Omit<Management, 'id' | 'schoolId'>[]>([]);

  const [teacherForm, setTeacherForm] = useState(teacherInitialState);
  const [mentorForm, setMentorForm] = useState(mentorInitialState);
  const [managementForm, setManagementForm] = useState(managementInitialState);

  // Error states for form validation
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [mentorError, setMentorError] = useState<string | null>(null);
  const [managementError, setManagementError] = useState<string | null>(null);

  const handleSchoolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSchoolData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleTeacherFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setTeacherForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
    // Clear error when user starts typing
    if (teacherError) setTeacherError(null);
  };

  const handleMentorFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setMentorForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
    // Clear error when user starts typing
    if (mentorError) setMentorError(null);
  };

  const handleManagementFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setManagementForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value, 10) || 0 : value,
    }));
    // Clear error when user starts typing
    if (managementError) setManagementError(null);
  };

  const addTeacher = () => {
    // Validate required fields
    if (!teacherForm.firstName || !teacherForm.lastName || !teacherForm.email || !teacherForm.subject) {
      setTeacherError('Please fill in all required fields (First Name, Last Name, Email, and Subject)');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(teacherForm.email)) {
      setTeacherError('Please enter a valid email address');
      return;
    }

    setTeachers(prev => [...prev, {
      ...teacherForm,
      qualifications: teacherForm.qualifications.split(',').map(q => q.trim()).filter(q => q),
    }]);
    setTeacherForm(teacherInitialState);
    setTeacherError(null);
  };

  const addMentor = () => {
    // Validate required fields
    if (!mentorForm.firstName || !mentorForm.lastName || !mentorForm.email || !mentorForm.specialization) {
      setMentorError('Please fill in all required fields (First Name, Last Name, Email, and Specialization)');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mentorForm.email)) {
      setMentorError('Please enter a valid email address');
      return;
    }

    setMentors(prev => [...prev, {
      ...mentorForm,
      qualifications: mentorForm.qualifications.split(',').map(q => q.trim()).filter(q => q),
    }]);
    setMentorForm(mentorInitialState);
    setMentorError(null);
  };

  const addManagement = () => {
    // Validate required fields
    if (!managementForm.firstName || !managementForm.lastName || !managementForm.email || !managementForm.role || !managementForm.department) {
      setManagementError('Please fill in all required fields (First Name, Last Name, Email, Role, and Department)');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(managementForm.email)) {
      setManagementError('Please enter a valid email address');
      return;
    }

    setManagement(prev => [...prev, {
      ...managementForm,
      qualifications: managementForm.qualifications.split(',').map(q => q.trim()).filter(q => q),
    }]);
    setManagementForm(managementInitialState);
    setManagementError(null);
  };

  const removeTeacher = (index: number) => {
    setTeachers(prev => prev.filter((_, i) => i !== index));
  };

  const removeMentor = (index: number) => {
    setMentors(prev => prev.filter((_, i) => i !== index));
  };

  const removeManagement = (index: number) => {
    setManagement(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddSchool({
      ...schoolData,
      teachers: teachers.map((teacher) => ({
        ...teacher,
        qualifications: Array.isArray(teacher.qualifications)
          ? teacher.qualifications
          : (typeof teacher.qualifications === 'string' && teacher.qualifications
            ? teacher.qualifications.split(',').map(q => q.trim()).filter(q => q)
            : []),
      })),
      mentors: mentors.map((mentor) => ({
        ...mentor,
        qualifications: Array.isArray(mentor.qualifications)
          ? mentor.qualifications
          : (typeof mentor.qualifications === 'string' && mentor.qualifications
            ? mentor.qualifications.split(',').map(q => q.trim()).filter(q => q)
            : []),
      })),
      management: management.map((staff) => ({
        ...staff,
        qualifications: Array.isArray(staff.qualifications)
          ? staff.qualifications
          : (typeof staff.qualifications === 'string' && staff.qualifications
            ? staff.qualifications.split(',').map(q => q.trim()).filter(q => q)
            : []),
      })),
    });

    // Reset all forms
    setSchoolData(schoolInitialState);
    setTeachers([]);
    setMentors([]);
    setManagement([]);
    setTeacherForm(teacherInitialState);
    setMentorForm(mentorInitialState);
    setManagementForm(managementInitialState);
    setActiveTab('school');
    // Clear errors
    setTeacherError(null);
    setMentorError(null);
    setManagementError(null);
    onClose();
  };

  const canSubmit = schoolData.name && schoolData.address && schoolData.city && schoolData.state && schoolData.zip;

  if (!isOpen) return null;

  const tabs = [
    { id: 'school', label: 'School Info', icon: '🏫' },
    { id: 'teachers', label: `Teachers (${teachers.length})`, icon: '👨‍🏫' },
    { id: 'mentors', label: `Mentors (${mentors.length})`, icon: '👨‍💼' },
    { id: 'management', label: `Management (${management.length})`, icon: '👔' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden relative flex flex-col">
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 id="modal-title" className="text-2xl font-semibold text-gray-800 dark:text-white">
            Add New School
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 transition-colors duration-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Close modal"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'school' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm text-gray-700 dark:text-gray-200">
                  School Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={schoolData.name}
                  onChange={handleSchoolChange}
                  required
                  className="form-input"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm text-gray-700 dark:text-gray-200">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  id="address"
                  value={schoolData.address}
                  onChange={handleSchoolChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="city" className="block text-sm text-gray-700 dark:text-gray-200">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    id="city"
                    value={schoolData.city}
                    onChange={handleSchoolChange}
                    required
                    className="form-input"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm text-gray-700 dark:text-gray-200">
                    State <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    id="state"
                    value={schoolData.state}
                    onChange={handleSchoolChange}
                    required
                    className="form-input"
                  />
                </div>
                <div>
                  <label htmlFor="zip" className="block text-sm text-gray-700 dark:text-gray-200">
                    ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="zip"
                    id="zip"
                    value={schoolData.zip}
                    onChange={handleSchoolChange}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="studentCount" className="block text-sm text-gray-700 dark:text-gray-200">
                    Student Count
                  </label>
                  <input
                    type="number"
                    name="studentCount"
                    id="studentCount"
                    value={schoolData.studentCount}
                    onChange={handleSchoolChange}
                    className="form-input"
                  />
                </div>
                <div>
                  <label htmlFor="teacherCount" className="block text-sm text-gray-700 dark:text-gray-200">
                    Teacher Count
                  </label>
                  <input
                    type="number"
                    name="teacherCount"
                    id="teacherCount"
                    value={schoolData.teacherCount}
                    onChange={handleSchoolChange}
                    className="form-input"
                  />
                </div>
                <div>
                  <label htmlFor="mentorCount" className="block text-sm text-gray-700 dark:text-gray-200">
                    Mentor Count
                  </label>
                  <input
                    type="number"
                    name="mentorCount"
                    id="mentorCount"
                    value={schoolData.mentorCount}
                    onChange={handleSchoolChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="managementCount" className="block text-sm text-gray-700 dark:text-gray-200">
                  Management Count
                </label>
                <input
                  type="number"
                  name="managementCount"
                  id="managementCount"
                  value={schoolData.managementCount}
                  onChange={handleSchoolChange}
                  className="form-input"
                />
              </div>
            </form>
          )}

          {activeTab === 'teachers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add Teachers</h3>
                <Button type="button" onClick={addTeacher} size="sm">
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Teacher
                </Button>
              </div>

              {/* Add Teacher Form */}
              <div className="grid grid-cols-1 gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-200">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={teacherForm.firstName}
                      onChange={handleTeacherFormChange}
                      required
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-200">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={teacherForm.lastName}
                      onChange={handleTeacherFormChange}
                      required
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-200">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={teacherForm.email}
                    onChange={handleTeacherFormChange}
                    required
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-200">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={teacherForm.phone}
                    onChange={handleTeacherFormChange}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-200">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={teacherForm.subject}
                    onChange={handleTeacherFormChange}
                    required
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-200">
                    Qualifications (comma separated)
                  </label>
                  <input
                    type="text"
                    name="qualifications"
                    value={teacherForm.qualifications}
                    onChange={handleTeacherFormChange}
                    placeholder="B.Ed, M.Sc, Ph.D"
                    className="form-input"
                  />
                </div>
                
                {teacherError && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">
                      {teacherError}
                    </div>
                  </div>
                )}
              </div>

              {/* Teachers List */}
              {teachers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">Added Teachers:</h4>
                  {teachers.map((teacher, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <span className="font-medium">{teacher.firstName} {teacher.lastName}</span>
                        <span className="text-sm text-gray-500 ml-2">({teacher.subject})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTeacher(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'mentors' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add Mentors</h3>
                <Button type="button" onClick={addMentor} size="sm">
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Mentor
                </Button>
              </div>

              {/* Add Mentor Form */}
              <div className="grid grid-cols-1 gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-200">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={mentorForm.firstName}
                      onChange={handleMentorFormChange}
                      required
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-200">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={mentorForm.lastName}
                      onChange={handleMentorFormChange}
                      required
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-200">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={mentorForm.email}
                    onChange={handleMentorFormChange}
                    required
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-200">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={mentorForm.phone}
                    onChange={handleMentorFormChange}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-200">
                    Specialization <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="specialization"
                    value={mentorForm.specialization}
                    onChange={handleMentorFormChange}
                    required
                    className="form-input"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-200">
                      Experience (years)
                    </label>
                    <input
                      type="number"
                      name="experience"
                      value={mentorForm.experience}
                      onChange={handleMentorFormChange}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-200">
                      Qualifications (comma separated)
                    </label>
                    <input
                      type="text"
                      name="qualifications"
                      value={mentorForm.qualifications}
                      onChange={handleMentorFormChange}
                      placeholder="M.Ed, Mentoring Certification"
                      className="form-input"
                    />
                  </div>
                </div>
                
                {mentorError && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">
                      {mentorError}
                    </div>
                  </div>
                )}
              </div>

              {/* Mentors List */}
              {mentors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">Added Mentors:</h4>
                  {mentors.map((mentor, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <span className="font-medium">{mentor.firstName} {mentor.lastName}</span>
                        <span className="text-sm text-gray-500 ml-2">({mentor.specialization})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMentor(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'management' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Add Management Staff</h3>
                <Button type="button" onClick={addManagement} size="sm">
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add Staff
                </Button>
              </div>

              {/* Add Management Form */}
              <div className="grid grid-cols-1 gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-200">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={managementForm.firstName}
                      onChange={handleManagementFormChange}
                      required
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-200">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={managementForm.lastName}
                      onChange={handleManagementFormChange}
                      required
                      className="form-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-200">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={managementForm.email}
                    onChange={handleManagementFormChange}
                    required
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-200">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={managementForm.phone}
                    onChange={handleManagementFormChange}
                    className="form-input"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-200">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="role"
                      value={managementForm.role}
                      onChange={handleManagementFormChange}
                      required
                      className="form-input"
                    >
                      <option value="">Select Role</option>
                      <option value="Principal">Principal</option>
                      <option value="Vice Principal">Vice Principal</option>
                      <option value="Administrator">Administrator</option>
                      <option value="Coordinator">Coordinator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-200">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={managementForm.department}
                      onChange={handleManagementFormChange}
                      required
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-200">
                      Experience (years)
                    </label>
                    <input
                      type="number"
                      name="experience"
                      value={managementForm.experience}
                      onChange={handleManagementFormChange}
                      className="form-input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-200">
                      Qualifications (comma separated)
                    </label>
                    <input
                      type="text"
                      name="qualifications"
                      value={managementForm.qualifications}
                      onChange={handleManagementFormChange}
                      placeholder="MBA, Educational Administration"
                      className="form-input"
                    />
                  </div>
                </div>
                
                {managementError && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">
                      {managementError}
                    </div>
                  </div>
                )}
              </div>

              {/* Management List */}
              {management.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">Added Management Staff:</h4>
                  {management.map((staff, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <span className="font-medium">{staff.firstName} {staff.lastName}</span>
                        <span className="text-sm text-gray-500 ml-2">({staff.role} - {staff.department})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeManagement(index)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              Create School & Staff
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AddSchoolModal;