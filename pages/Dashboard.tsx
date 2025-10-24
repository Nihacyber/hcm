
import React, { useState, useEffect } from 'react';
import api from '../services/firebaseService';
import StatCard from '../components/dashboard/StatCard';
import PerformanceChart from '../components/dashboard/PerformanceChart';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { SchoolIcon, TeacherIcon, TrainingIcon, AuditIcon } from '../components/ui/Icons';
import { EmployeeTask, TaskPriority } from '../types';


const TaskPriorityBadge: React.FC<{ priority: TaskPriority }> = ({ priority }) => {
  const colorClasses = {
    [TaskPriority.HIGH]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    [TaskPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    [TaskPriority.LOW]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClasses[priority]}`}>
      {priority}
    </span>
  );
};


const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<{ [key: string]: number } | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsData, chartData, tasksData] = await Promise.all([
          api.getDashboardStats(),
          api.getTrainingCompletionData(),
          api.getTasks(),
        ]);
        setStats(statsData);
        setChartData(chartData);
        setTasks(tasksData.slice(0, 5)); // show recent 5 tasks
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-6 mb-8 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Schools" value={stats?.schoolCount || 0} icon={<SchoolIcon className="w-6 h-6 text-white" />} color="bg-blue-500" />
        <StatCard title="Active Teachers" value={stats?.teacherCount || 0} icon={<TeacherIcon className="w-6 h-6 text-white" />} color="bg-green-500" />
        <StatCard title="Training Programs" value={stats?.trainingCount || 0} icon={<TrainingIcon className="w-6 h-6 text-white" />} color="bg-yellow-500" />
        <StatCard title="Audits Pending" value={stats?.auditsPending || 0} icon={<AuditIcon className="w-6 h-6 text-white" />} color="bg-red-500" />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <PerformanceChart data={chartData} />
        </div>

        <div className="xl:col-span-2">
            <Card>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Recent Tasks</h3>
                <div className="space-y-4">
                    {tasks.map(task => (
                        <div key={task.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-800 dark:text-gray-200">{task.title}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Due: {task.deadline}</p>
                            </div>
                            <TaskPriorityBadge priority={task.priority} />
                        </div>
                    ))}
                </div>
            </Card>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
