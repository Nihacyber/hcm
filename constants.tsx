
import React from 'react';
import { DashboardIcon, SchoolIcon, TeacherIcon, TrainingIcon, AuditIcon, TaskIcon, MentorIcon, ManagementIcon, AnalyticsIcon } from './components/ui/Icons';

export const NAV_LINKS = [
    { name: 'Dashboard', path: '/', icon: <DashboardIcon className="w-5 h-5" /> },
    { name: 'Schools', path: '/schools', icon: <SchoolIcon className="w-5 h-5" /> },
    { name: 'Teachers', path: '/teachers', icon: <TeacherIcon className="w-5 h-5" /> },
    { name: 'Mentors', path: '/mentors', icon: <MentorIcon className="w-5 h-5" /> },
    { name: 'Management', path: '/management', icon: <ManagementIcon className="w-5 h-5" /> },
    { name: 'Trainings', path: '/trainings', icon: <TrainingIcon className="w-5 h-5" /> },
    { name: 'Attendance Analytics', path: '/attendance-analytics', icon: <AnalyticsIcon className="w-5 h-5" /> },
    { name: 'Audits', path: '/audits', icon: <AuditIcon className="w-5 h-5" /> },
    { name: 'Tasks', path: '/tasks', icon: <TaskIcon className="w-5 h-5" /> },
];
