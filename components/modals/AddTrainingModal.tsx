import React, { useState, useEffect } from 'react';
import { TrainingProgram, TrainingLevel } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { CloseIcon } from '../ui/Icons';
import Spinner from '../ui/Spinner';

interface AddTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTraining: ((training: Omit<TrainingProgram, 'id' | 'objectives'>) => Promise<void>) | ((training: TrainingProgram) => Promise<void>);
  editingTraining?: TrainingProgram | null;
}

const AddTrainingModal: React.FC<AddTrainingModalProps> = ({ isOpen, onClose, onAddTraining, editingTraining }) => {
  const initialState = {
    name: '',
    description: '',
    level: TrainingLevel.BEGINNER,
    category: '',
    startDate: '',
    endDate: '',
    meetingLink: '',
  };
  const [formData, setFormData] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  // Reset form state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => { // allow for closing animation
          setFormData(initialState);
          setDateError(null);
          setIsSubmitting(false);
      }, 300);
      return;
    }

    // If editingTraining is provided, populate the form
    if ((isOpen as boolean) && editingTraining) {
      const et: TrainingProgram = editingTraining;
      setFormData({
        name: et.name || '',
        description: et.description || '',
        level: et.level || TrainingLevel.BEGINNER,
        category: et.category || '',
        startDate: et.startDate || '',
        endDate: et.endDate || '',
        meetingLink: et.meetingLink || '',
      });
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
    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
        setDateError("End Date must be on or after the Start Date.");
        return;
    }
    setDateError(null);
    setIsSubmitting(true);
    try {
        // If editingTraining exists, call with full TrainingProgram shape
        if (editingTraining) {
          const updated: TrainingProgram = { ...editingTraining, ...formData } as TrainingProgram;
          await (onAddTraining as (t: TrainingProgram) => Promise<void>)(updated);
        } else {
          await (onAddTraining as (t: Omit<TrainingProgram, 'id' | 'objectives'>) => Promise<void>)(formData as any);
        }
    } catch (error) {
        console.error("Failed to add training program:", error);
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
            <h2 id="modal-title" className="text-2xl font-semibold text-gray-800 dark:text-white">Add New Training</h2>
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
                <div>
                    <label htmlFor="name" className="block text-sm text-gray-700 dark:text-gray-200">Program Name</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="form-input"/>
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm text-gray-700 dark:text-gray-200">Description</label>
                    <textarea name="description" id="description" value={formData.description} onChange={handleChange} required rows={3} className="form-input"></textarea>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label htmlFor="level" className="block text-sm text-gray-700 dark:text-gray-200">Level</label>
                        <select name="level" id="level" value={formData.level} onChange={handleChange} required className="form-input">
                            {Object.values(TrainingLevel).map(level => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-sm text-gray-700 dark:text-gray-200">Category</label>
                        <input type="text" name="category" id="category" value={formData.category} onChange={handleChange} required className="form-input"/>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label htmlFor="startDate" className="block text-sm text-gray-700 dark:text-gray-200">Start Date</label>
                        <input type="date" name="startDate" id="startDate" value={formData.startDate} onChange={handleChange} required className="form-input"/>
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm text-gray-700 dark:text-gray-200">End Date</label>
                        <input type="date" name="endDate" id="endDate" value={formData.endDate} onChange={handleChange} required className="form-input"/>
                    </div>
                </div>
                {dateError && <p className="text-sm text-red-500 -mt-2 text-center md:col-span-2">{dateError}</p>}
                <div>
                    <label htmlFor="meetingLink" className="block text-sm text-gray-700 dark:text-gray-200">Meeting Link</label>
                    <input type="url" name="meetingLink" id="meetingLink" value={formData.meetingLink} onChange={handleChange} required className="form-input" placeholder="https://..."/>
                </div>
            </fieldset>

            <div className="flex justify-end pt-4 space-x-4">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="flex items-center justify-center w-36">
                    {isSubmitting ? <Spinner className="w-5 h-5 border-white" /> : (editingTraining ? 'Save Changes' : 'Add Training')}
                </Button>
            </div>
        </form>
      </Card>
    </div>
  );
};

export default AddTrainingModal;