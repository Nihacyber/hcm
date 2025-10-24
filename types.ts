
export enum TrainingLevel {
    BEGINNER = 'Beginner',
    INTERMEDIATE = 'Intermediate',
    ADVANCED = 'Advanced',
}

export enum TrainingStatus {
    SCHEDULED = 'Scheduled',
    IN_PROGRESS = 'In Progress',
    COMPLETED = 'Completed',
}

export enum AuditStatus {
    PENDING = 'Pending',
    IN_PROGRESS = 'In Progress',
    COMPLETED = 'Completed',
    FAILED = 'Failed',
    NOT_REQUIRED = 'Not Required',
}

export enum TaskPriority {
    LOW = 'Low',
    MEDIUM = 'Medium',
    HIGH = 'High',
}

export enum TaskStatus {
    TODO = 'To Do',
    IN_PROGRESS = 'In Progress',
    DONE = 'Done',
}

export enum AttendanceStatus {
    PRESENT = 'Present',
    ABSENT = 'Absent',
    NOT_MARKED = 'Not Marked',
}

export interface Contact {
    name: string;
    role: string;
    email: string;
    phone: string;
}

export interface School {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    studentCount: number;
    teacherCount: number;
    mentorCount: number;
    managementCount: number;
    contacts: Contact[];
    teachers?: Teacher[]; // Embedded for easy access
    mentors?: Mentor[]; // Embedded for easy access
    management?: Management[]; // Embedded for easy access
}

export interface Teacher {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    schoolId: string;
    subject: string;
    qualifications: string[];
    trainingHistory: string[]; // Array of TrainingProgram IDs
    username?: string; // Generated username for teacher login
    password?: string; // Generated password for teacher login
}

export interface Mentor {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    schoolId: string;
    specialization: string;
    experience: number; // years
    qualifications: string[];
    assignedTeachers: string[]; // Array of Teacher IDs
}

export interface Management {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    schoolId: string;
    role: 'Principal' | 'Vice Principal' | 'Administrator' | 'Coordinator';
    department: string;
    experience: number; // years
    qualifications: string[];
}

export interface TrainingProgram {
    id: string;
    name: string;
    description: string;
    level: TrainingLevel;
    category: string;
    startDate: string;
    endDate: string;
    meetingLink: string;
    objectives: string[];
    assignedTeachers?: string[]; // Array of Teacher IDs
    maxParticipants?: number;
}

export interface TeacherTraining {
    id?: string;
    teacherId: string;
    trainingProgramId: string;
    status: TrainingStatus;
    performanceRating?: number; // 1-5
    feedback?: string;
    attendance: boolean;
}

export interface Audit {
    id: string;
    type: 'Teacher Performance' | 'Mentor Evaluation' | 'School Infrastructure';
    targetId: string; // School ID or Teacher ID
    auditorId: string; // Employee ID
    date: string;
    status: AuditStatus;
    criteria: { [key: string]: string | number };
}

export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    role: 'Admin' | 'Employee';
    email: string;
}

export interface EmployeeTask {
    id: string;
    title: string;
    description: string;
    assigneeId: string; // Employee ID
    priority: TaskPriority;
    status: TaskStatus;
    deadline: string;
    estimatedHours: number;
    actualHours?: number;
}

export interface TrainingAttendance {
    id?: string;
    teacherId: string;
    trainingProgramId: string;
    date: string; // ISO date string (YYYY-MM-DD)
    status: AttendanceStatus;
    markedAt?: string; // ISO timestamp when attendance was marked
    markedBy?: string; // Teacher ID or Admin ID who marked it
}
