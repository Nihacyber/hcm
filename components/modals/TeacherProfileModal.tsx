import React, { useState } from 'react';
import { Teacher, School, TrainingProgram } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { CloseIcon } from '../ui/Icons';
import { copyToClipboard } from '../../utils/credentialGenerator';

interface TeacherProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
  school?: School;
  trainings?: TrainingProgram[];
}

const TeacherProfileModal: React.FC<TeacherProfileModalProps> = ({
  isOpen,
  onClose,
  teacher,
  school,
  trainings = []
}) => {
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);

  if (!isOpen || !teacher) return null;

  const handleCopyCredential = async (field: 'username' | 'password') => {
    if (!teacher) return;

    const text = field === 'username' ? teacher.username : teacher.password;
    if (!text) return;

    const success = await copyToClipboard(text);

    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const getTrainingNames = () => {
    return teacher.trainingHistory.map(id => {
      const training = trainings.find(t => t.id === id);
      return training ? training.name : 'Unknown Training';
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">
            Teacher Profile
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Teacher Information Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                First Name
              </label>
              <p className="text-gray-900 dark:text-white">{teacher.firstName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Last Name
              </label>
              <p className="text-gray-900 dark:text-white">{teacher.lastName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Email
              </label>
              <p className="text-gray-900 dark:text-white">{teacher.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Phone
              </label>
              <p className="text-gray-900 dark:text-white">{teacher.phone}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                School
              </label>
              <p className="text-gray-900 dark:text-white">{school?.name || 'Unknown School'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Subject
              </label>
              <p className="text-gray-900 dark:text-white">{teacher.subject}</p>
            </div>
          </div>
        </div>

        {/* Qualifications Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Qualifications
          </h3>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(teacher.qualifications) && teacher.qualifications.length > 0 ? (
              teacher.qualifications.map((qual, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded dark:bg-blue-900 dark:text-blue-300"
                >
                  {qual}
                </span>
              ))
            ) : (
              <span className="text-gray-500 dark:text-gray-400 italic">No qualifications listed</span>
            )}
          </div>
        </div>

        {/* Training History Section */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Training History
          </h3>
          <div className="flex flex-wrap gap-2">
            {teacher.trainingHistory.length > 0 ? (
              getTrainingNames().map((trainingName, index) => (
                <span
                  key={index}
                  className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded dark:bg-green-900 dark:text-green-300"
                >
                  {trainingName}
                </span>
              ))
            ) : (
              <span className="text-gray-500 dark:text-gray-400 italic">No training history</span>
            )}
          </div>
        </div>

        {/* Login Credentials Section */}
        {teacher.username && teacher.password && (
          <div className="mb-6">
            <div className="rounded-md bg-blue-50 dark:bg-blue-900 p-4 border border-blue-200 dark:border-blue-700">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
                🔐 Login Credentials
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Username
                  </label>
                  <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border border-blue-200 dark:border-blue-700">
                    <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                      {teacher.username}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyCredential('username')}
                      className={`ml-2 px-2 py-1 text-xs rounded transition-colors ${
                        copiedField === 'username'
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700'
                      }`}
                    >
                      {copiedField === 'username' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                    Password
                  </label>
                  <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded border border-blue-200 dark:border-blue-700">
                    <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                      {teacher.password}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyCredential('password')}
                      className={`ml-2 px-2 py-1 text-xs rounded transition-colors ${
                        copiedField === 'password'
                          ? 'bg-blue-500 text-white'
                          : 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700'
                      }`}
                    >
                      {copiedField === 'password' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  ℹ️ These are the teacher's login credentials. Share them securely with the teacher.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            onClick={onClose}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default TeacherProfileModal;

