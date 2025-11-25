import { useState, useEffect } from 'react';
import { User, EmployeeTask } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Plus, Calendar, Clock, CheckCircle, Circle, PlayCircle, Edit2, Trash2, X, Users as UsersIcon } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import Notification from './Notification';

interface Props {
  currentUser: User;
}

interface Employee {
  id: string;
  full_name: string;
  username: string;
}

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function EmployeeTasks({ currentUser }: Props) {
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<EmployeeTask | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
  const [notification, setNotification] = useState<{ isOpen: boolean; type: 'success' | 'error' | 'info' | 'warning'; title: string; message?: string } | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    time_spent: 0,
    status: 'pending' as 'pending' | 'in_progress' | 'completed',
    notes: '',
  });

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadEmployees();
    }
    loadTasks();
  }, [selectedDate, selectedEmployee]);

  const loadEmployees = async () => {
    const data = await db.find<User>(Collections.USERS, { role: 'employee', is_active: true }, { sort: { full_name: 1 } });
    if (data) {
      setEmployees(data.map(u => ({ id: u.id!, full_name: u.full_name, username: u.username })));
    }
  };

  const loadTasks = async () => {
    setLoading(true);

    const filter: any = { date: selectedDate };

    if (isAdmin) {
      if (selectedEmployee) {
        filter.employee_id = selectedEmployee;
      }
    } else {
      filter.employee_id = currentUser.id;
    }

    const data = await db.find<EmployeeTask>(Collections.EMPLOYEE_TASKS, filter, { sort: { created_at: -1 } });

    if (data) {
      // Fetch employee details for each task manually since we don't have joins
      const tasksWithEmployees = await Promise.all(data.map(async (task) => {
        if (task.employee_id) {
          const employee = await db.findById<User>(Collections.USERS, task.employee_id);
          return { ...task, employee: employee ? { id: employee.id!, full_name: employee.full_name, username: employee.username } : undefined };
        }
        return task;
      }));
      setTasks(tasksWithEmployees);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      time_spent: 0,
      status: 'pending',
      notes: '',
    });
    setEditingTask(null);
    setShowModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const taskData = {
      ...formData,
      date: selectedDate,
      employee_id: currentUser.id!,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingTask) {
        await db.updateById(Collections.EMPLOYEE_TASKS, editingTask.id!, taskData);
        setNotification({
          isOpen: true,
          type: 'success',
          title: 'Task Updated',
          message: 'Task has been updated successfully'
        });
      } else {
        await db.insertOne(Collections.EMPLOYEE_TASKS, {
          ...taskData,
          created_at: new Date().toISOString(),
        });
        setNotification({
          isOpen: true,
          type: 'success',
          title: 'Task Created',
          message: 'Task has been added successfully'
        });
      }
      loadTasks();
      resetForm();
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: 'error',
        title: editingTask ? 'Update Failed' : 'Creation Failed',
        message: error.message || 'An error occurred'
      });
    }
  };

  const handleEdit = (task: EmployeeTask) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      time_spent: task.time_spent,
      status: task.status,
      notes: task.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      onConfirm: async () => {
        const success = await db.deleteById(Collections.EMPLOYEE_TASKS, id);
        setConfirmDialog(null);

        if (!success) {
          setNotification({
            isOpen: true,
            type: 'error',
            title: 'Deletion Failed',
            message: 'Failed to delete task'
          });
        } else {
          setNotification({
            isOpen: true,
            type: 'success',
            title: 'Task Deleted',
            message: 'Task has been deleted successfully'
          });
          loadTasks();
        }
      }
    });
  };

  const handleStatusChange = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    const success = await db.updateById(Collections.EMPLOYEE_TASKS, taskId, { status: newStatus });

    if (!success) {
      setNotification({
        isOpen: true,
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update status'
      });
    } else {
      loadTasks();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'in_progress':
        return <PlayCircle className="text-blue-600" size={20} />;
      default:
        return <Circle className="text-gray-400" size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const totalTimeSpent = tasks.reduce((sum, task) => sum + task.time_spent, 0);
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;

  const employeeSummary = isAdmin && !selectedEmployee
    ? tasks.reduce((acc, task) => {
      if (task.employee) {
        const empId = task.employee_id;
        if (!acc[empId]) {
          acc[empId] = {
            name: task.employee.full_name,
            totalTime: 0,
            taskCount: 0,
          };
        }
        acc[empId].totalTime += task.time_spent;
        acc[empId].taskCount += 1;
      }
      return acc;
    }, {} as Record<string, { name: string; totalTime: number; taskCount: number }>)
    : null;

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isAdmin ? 'Employee Tasks' : 'My Daily Tasks'}
          </h2>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'View and manage employee tasks and track hours' : 'Manage your tasks and track time spent'}
          </p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
            <Calendar size={18} className="text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-0 focus:ring-0 text-sm font-medium"
            />
          </div>
          {!isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Add Task
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-900">{tasks.length}</p>
            </div>
            <Calendar className="text-gray-400" size={32} />
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Completed</p>
              <p className="text-3xl font-bold text-green-600">{completedCount}</p>
            </div>
            <CheckCircle className="text-green-400" size={32} />
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">In Progress</p>
              <p className="text-3xl font-bold text-blue-600">{inProgressCount}</p>
            </div>
            <PlayCircle className="text-blue-400" size={32} />
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700">Time Spent</p>
              <p className="text-3xl font-bold text-orange-600">{totalTimeSpent}m</p>
            </div>
            <Clock className="text-orange-400" size={32} />
          </div>
        </div>
      </div>

      {employeeSummary && Object.keys(employeeSummary).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <UsersIcon size={20} className="text-blue-600" />
            Employee Hours Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(employeeSummary)
              .sort(([, a], [, b]) => b.totalTime - a.totalTime)
              .map(([empId, summary]) => (
                <div key={empId} className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{summary.name}</p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock size={14} className="text-blue-600" />
                          <span className="text-gray-700">
                            <span className="font-bold text-blue-600">{summary.totalTime}</span> minutes
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle size={14} className="text-green-600" />
                          <span className="text-gray-700">
                            <span className="font-bold text-green-600">{summary.taskCount}</span> tasks
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500">No tasks for this date</p>
            <p className="text-sm text-gray-400 mt-2">Click Add Task to create your first task</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(task.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                        {isAdmin && task.employee && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                            <UsersIcon size={12} />
                            {task.employee.full_name}
                          </span>
                        )}
                      </div>
                      {task.notes && (
                        <p className="text-sm text-gray-600 mt-1">{task.notes}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock size={14} />
                          <span>{task.time_spent} minutes</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isAdmin && (
                        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() => handleStatusChange(task.id!, 'pending')}
                            className={`p-1 rounded ${task.status === 'pending' ? 'bg-white shadow-sm' : 'hover:bg-white'}`}
                            title="Mark as Pending"
                          >
                            <Circle size={16} className="text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(task.id!, 'in_progress')}
                            className={`p-1 rounded ${task.status === 'in_progress' ? 'bg-white shadow-sm' : 'hover:bg-white'}`}
                            title="Mark as In Progress"
                          >
                            <PlayCircle size={16} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(task.id!, 'completed')}
                            className={`p-1 rounded ${task.status === 'completed' ? 'bg-white shadow-sm' : 'hover:bg-white'}`}
                            title="Mark as Completed"
                          >
                            <CheckCircle size={16} className="text-green-600" />
                          </button>
                        </div>
                      )}
                      {!isAdmin && (
                        <>
                          <button
                            onClick={() => handleEdit(task)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit Task"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(task.id!)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Delete Task"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter task description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Spent (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.time_spent}
                  onChange={(e) => setFormData({ ...formData, time_spent: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'in_progress' | 'completed' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes about this task"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notification && (
        <Notification
          isOpen={notification.isOpen}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
