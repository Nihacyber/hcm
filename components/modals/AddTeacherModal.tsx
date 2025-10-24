import React, { useState, useEffect } from 'react';
import { Teacher, School } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { CloseIcon } from '../ui/Icons';
import Spinner from '../ui/Spinner';
import api from '../../services/firebaseService';
import { generateCredentials, copyToClipboard } from '../../utils/credentialGenerator';

interface AddTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTeacher: (teacher: Omit<Teacher, 'id' | 'trainingHistory'>) => Promise<void>;
}

const AddTeacherModal: React.FC<AddTeacherModalProps> = ({ isOpen, onClose, onAddTeacher }) => {
  const initialState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    schoolId: '',
    subject: '',
    qualifications: '',
  };

  const [formData, setFormData] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ username: string; password: string } | null>(null);
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Load schools when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchSchools = async () => {
        try {
          const schoolsData = await api.getSchools();
          setSchools(schoolsData);
          if (schoolsData.length > 0 && !formData.schoolId) {
            setFormData(prev => ({ ...prev, schoolId: schoolsData[0].id }));
          }
        } catch (err) {
          console.error("Failed to fetch schools:", err);
        }
      };
      fetchSchools();
    } else {
      // Reset form when closing
      setTimeout(() => {
        setFormData(initialState);
        setError(null);
        setIsSubmitting(false);
        setGeneratedCredentials(null);
        setCopiedField(null);
        setIsSuccess(false);
      }, 300);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.schoolId) {
        throw new Error('Please fill in all required fields');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Generate credentials for the teacher
      const credentials = generateCredentials(formData.firstName, formData.lastName);
      setGeneratedCredentials(credentials);

      await onAddTeacher({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        schoolId: formData.schoolId,
        subject: formData.subject,
        qualifications: formData.qualifications.split(',').map((q: string) => q.trim()).filter((q: string) => q),
        username: credentials.username,
        password: credentials.password
      });

      // Mark as success - keep credentials visible until user clicks "Done"
      setIsSuccess(true);
      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add teacher');
      setIsSubmitting(false);
      // Clear generated credentials on error
      setGeneratedCredentials(null);
    }
  };

  const handleCopyCredential = async (field: 'username' | 'password') => {
    if (!generatedCredentials) return;

    const text = field === 'username' ? generatedCredentials.username : generatedCredentials.password;
    const success = await copyToClipboard(text);

    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-lg relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
        <div className="flex items-start justify-between">
          <h2 id="modal-title" className="text-2xl font-semibold text-gray-800 dark:text-white">Add New Teacher</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 text-gray-400 transition-colors duration-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            aria-label="Close modal"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <fieldset disabled={isSubmitting || isSuccess} className={`space-y-4 ${isSuccess ? 'hidden' : ''}`}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm text-gray-700 dark:text-gray-200">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="firstName" 
                  id="firstName" 
                  value={formData.firstName} 
                  onChange={handleChange} 
                  required 
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm text-gray-700 dark:text-gray-200">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="lastName" 
                  id="lastName" 
                  value={formData.lastName} 
                  onChange={handleChange} 
                  required 
                  className="form-input"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm text-gray-700 dark:text-gray-200">
                Email <span className="text-red-500">*</span>
              </label>
              <input 
                type="email" 
                name="email" 
                id="email" 
                value={formData.email} 
                onChange={handleChange} 
                required 
                className="form-input"
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm text-gray-700 dark:text-gray-200">
                Phone
              </label>
              <input 
                type="tel" 
                name="phone" 
                id="phone" 
                value={formData.phone} 
                onChange={handleChange} 
                className="form-input"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="schoolId" className="block text-sm text-gray-700 dark:text-gray-200">
                  School <span className="text-red-500">*</span>
                </label>
                <select 
                  name="schoolId" 
                  id="schoolId" 
                  value={formData.schoolId} 
                  onChange={handleChange} 
                  required 
                  className="form-input"
                >
                  <option value="">Select a school</option>
                  {schools.map(school => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm text-gray-700 dark:text-gray-200">
                  Subject
                </label>
                <input 
                  type="text" 
                  name="subject" 
                  id="subject" 
                  value={formData.subject} 
                  onChange={handleChange} 
                  className="form-input"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="qualifications" className="block text-sm text-gray-700 dark:text-gray-200">
                Qualifications (comma separated)
              </label>
              <input 
                type="text" 
                name="qualifications" 
                id="qualifications" 
                value={formData.qualifications} 
                onChange={handleChange} 
                placeholder="B.Ed, M.Sc, Ph.D"
                className="form-input"
              />
            </div>
          </fieldset>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">
                {error}
              </div>
            </div>
          )}

          {generatedCredentials && (
            <div className="rounded-md bg-green-50 dark:bg-green-900 p-4 border border-green-200 dark:border-green-700">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200 mb-3">
                ✓ Teacher Credentials Generated
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                    Username
                  </label>
                  <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border border-green-200 dark:border-green-700">
                    <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                      {generatedCredentials.username}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyCredential('username')}
                      className={`ml-2 px-2 py-1 text-xs rounded transition-colors ${
                        copiedField === 'username'
                          ? 'bg-green-500 text-white'
                          : 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700'
                      }`}
                    >
                      {copiedField === 'username' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                    Password
                  </label>
                  <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border border-green-200 dark:border-green-700">
                    <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                      {generatedCredentials.password}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyCredential('password')}
                      className={`ml-2 px-2 py-1 text-xs rounded transition-colors ${
                        copiedField === 'password'
                          ? 'bg-green-500 text-white'
                          : 'bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-700'
                      }`}
                    >
                      {copiedField === 'password' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  ℹ️ Share these credentials with the teacher. They can use them to log in and view their training results.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 space-x-4">
            {isSuccess ? (
              <Button type="button" variant="primary" onClick={onClose} className="flex items-center justify-center w-36">
                Done
              </Button>
            ) : (
              <>
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex items-center justify-center w-36">
                  {isSubmitting ? <Spinner className="w-5 h-5 border-white" /> : 'Add Teacher'}
                </Button>
              </>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddTeacherModal;