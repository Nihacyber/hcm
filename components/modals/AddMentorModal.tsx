import React, { useState, useEffect } from 'react';
import { Mentor, School } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { CloseIcon } from '../ui/Icons';
import Spinner from '../ui/Spinner';
import api from '../../services/firebaseService';

interface AddMentorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMentor: (mentor: Omit<Mentor, 'id' | 'assignedTeachers'>) => Promise<void>;
}

const AddMentorModal: React.FC<AddMentorModalProps> = ({ isOpen, onClose, onAddMentor }) => {
  const initialState = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    schoolId: '',
    specialization: '',
    experience: 0,
    qualifications: '',
  };
  
  const [formData, setFormData] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);

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
      }, 300);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'experience' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.schoolId || !formData.specialization) {
        throw new Error('Please fill in all required fields');
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }
      
      await onAddMentor({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        schoolId: formData.schoolId,
        specialization: formData.specialization,
        experience: formData.experience,
        qualifications: formData.qualifications.split(',').map(q => q.trim()).filter(q => q),
      });
      
      // Reset form on success
      setFormData(initialState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add mentor');
    } finally {
      setIsSubmitting(false);
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
          <h2 id="modal-title" className="text-2xl font-semibold text-gray-800 dark:text-white">Add New Mentor</h2>
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
          <fieldset disabled={isSubmitting} className="space-y-4">
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
                <label htmlFor="specialization" className="block text-sm text-gray-700 dark:text-gray-200">
                  Specialization <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="specialization" 
                  id="specialization" 
                  value={formData.specialization} 
                  onChange={handleChange} 
                  required 
                  className="form-input"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="experience" className="block text-sm text-gray-700 dark:text-gray-200">
                  Years of Experience
                </label>
                <input 
                  type="number" 
                  name="experience" 
                  id="experience" 
                  value={formData.experience} 
                  onChange={handleChange} 
                  min="0"
                  className="form-input"
                />
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
                  placeholder="M.Ed, Mentoring Certification"
                  className="form-input"
                />
              </div>
            </div>
          </fieldset>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">
                {error}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 space-x-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex items-center justify-center w-36">
              {isSubmitting ? <Spinner className="w-5 h-5 border-white" /> : 'Add Mentor'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddMentorModal;