
import { School, Teacher, TrainingProgram, Audit, EmployeeTask, TrainingLevel, TrainingStatus, AuditStatus, TaskPriority, TaskStatus, TeacherTraining, Mentor, Management } from '../types';

// Mock data generation
const createTeachers = (count: number, schools: School[]): Teacher[] => {
    return Array.from({ length: count }, (_, i) => ({
        id: `tch-${i + 1}`,
        firstName: `Teacher${i + 1}`,
        lastName: `Smith${i + 1}`,
        email: `teacher.smith${i + 1}@aoe.edu`,
        phone: `555-02${String(i).padStart(2, '0')}`,
        schoolId: schools[i % schools.length].id,
        subject: 'Mathematics',
        qualifications: ['B.Ed', 'M.Ed'],
        trainingHistory: [],
    }));
};

const createSchools = (count: number): School[] => {
    return Array.from({ length: count }, (_, i) => ({
        id: `sch-${i + 1}`,
        name: `Academy of Excellence #${i + 1}`,
        address: `${100 + i} Innovation Drive`,
        city: 'Metropolis',
        state: 'CA',
        zip: `${90210 + i}`,
        studentCount: 500 + i * 20,
        teacherCount: 30 + i * 2,
        mentorCount: 5 + i,
        managementCount: 8 + i,
        contacts: [
            { name: `Principal ${String.fromCharCode(65 + i)}`, role: 'Principal', email: `principal${i}@aoe.edu`, phone: '555-0101' },
        ],
    }));
};

const createMentors = (count: number, schools: School[]): Mentor[] => {
    const specializations = ['Educational Leadership', 'Curriculum Development', 'Student Counseling', 'Technology Integration', 'Special Education'];
    return Array.from({ length: count }, (_, i) => ({
        id: `mtr-${i + 1}`,
        firstName: `Mentor${i + 1}`,
        lastName: `Guide${i + 1}`,
        email: `mentor.guide${i + 1}@aoe.edu`,
        phone: `555-03${String(i).padStart(2, '0')}`,
        schoolId: schools[i % schools.length].id,
        specialization: specializations[i % specializations.length],
        experience: 5 + (i % 15),
        qualifications: ['M.Ed', 'Mentoring Certification'],
        assignedTeachers: [],
    }));
};

const createManagement = (count: number, schools: School[]): Management[] => {
    const roles: ('Principal' | 'Vice Principal' | 'Administrator' | 'Coordinator')[] = ['Principal', 'Vice Principal', 'Administrator', 'Coordinator'];
    const departments = ['Administration', 'Academics', 'Student Affairs', 'Operations', 'Finance'];
    return Array.from({ length: count }, (_, i) => ({
        id: `mgmt-${i + 1}`,
        firstName: `Management${i + 1}`,
        lastName: `Staff${i + 1}`,
        email: `mgmt.staff${i + 1}@aoe.edu`,
        phone: `555-04${String(i).padStart(2, '0')}`,
        schoolId: schools[i % schools.length].id,
        role: roles[i % roles.length],
        department: departments[i % departments.length],
        experience: 8 + (i % 12),
        qualifications: ['MBA', 'Educational Administration'],
    }));
};

const createTrainingPrograms = (count: number): TrainingProgram[] => {
    const levels = Object.values(TrainingLevel);
    return Array.from({ length: count }, (_, i) => ({
        id: `trn-${i + 1}`,
        name: `Effective Classroom Management ${i + 1}`,
        description: `A course on modern teaching methodologies.`,
        level: levels[i % levels.length],
        category: 'Pedagogy',
        startDate: new Date(2024, 6, 15 + i).toISOString().split('T')[0],
        endDate: new Date(2024, 6, 20 + i).toISOString().split('T')[0],
        meetingLink: 'https://meet.example.com/training',
        objectives: ['Improve student engagement', 'Implement new tech'],
        assignedTeachers: [], // Initially no teachers assigned
        maxParticipants: 25,
    }));
};

const createAudits = (count: number, schools: School[]): Audit[] => {
    const statuses = Object.values(AuditStatus);
    return Array.from({ length: count }, (_, i) => ({
        id: `aud-${i + 1}`,
        type: 'School Infrastructure',
        targetId: schools[i % schools.length].id,
        auditorId: 'emp-1',
        date: new Date(2024, 7, 1 + i).toISOString().split('T')[0],
        status: statuses[i % statuses.length],
        criteria: { 'Facility Condition': 'Good', 'Resource Availability': 'Excellent' },
    }));
};

const createTasks = (count: number): EmployeeTask[] => {
    const priorities = Object.values(TaskPriority);
    const statuses = Object.values(TaskStatus);
    return Array.from({ length: count }, (_, i) => ({
        id: `task-${i + 1}`,
        title: `Prepare Q3 Report ${i + 1}`,
        description: 'Compile data for the quarterly performance review.',
        assigneeId: 'emp-1',
        priority: priorities[i % priorities.length],
        status: statuses[i % statuses.length],
        deadline: new Date(2024, 8, 1 + i).toISOString().split('T')[0],
        estimatedHours: 8,
    }));
};

const createTeacherTrainingAssignments = (count: number, teachers: Teacher[], trainings: TrainingProgram[]): TeacherTraining[] => {
    const statuses = Object.values(TrainingStatus);
    return Array.from({ length: count }, (_, i) => ({
        teacherId: teachers[i % teachers.length].id,
        trainingProgramId: trainings[i % trainings.length].id,
        status: statuses[i % statuses.length],
        performanceRating: Math.floor(Math.random() * 5) + 1,
        feedback: i % 3 === 0 ? 'Excellent participation and engagement' : undefined,
        attendance: Math.random() > 0.1, // 90% attendance rate
    }));
};

const mockSchools = createSchools(15);
const mockTeachers = createTeachers(50, mockSchools);
const mockMentors = createMentors(25, mockSchools);
const mockManagement = createManagement(35, mockSchools);
const mockTrainings = createTrainingPrograms(10);
const mockAudits = createAudits(20, mockSchools);
const mockTasks = createTasks(25);
const mockTeacherTrainingAssignments = createTeacherTrainingAssignments(30, mockTeachers, mockTrainings);

// Helper function to update training programs with assigned teachers
mockTrainings.forEach(training => {
    training.assignedTeachers = mockTeacherTrainingAssignments
        .filter(assignment => assignment.trainingProgramId === training.id)
        .map(assignment => assignment.teacherId);
});

// Helper function to update teachers with training history
mockTeachers.forEach(teacher => {
    teacher.trainingHistory = mockTeacherTrainingAssignments
        .filter(assignment => assignment.teacherId === teacher.id)
        .map(assignment => assignment.trainingProgramId);
});

// Helper function to update schools with embedded staff
mockSchools.forEach(school => {
    school.teachers = mockTeachers.filter(teacher => teacher.schoolId === school.id);
    school.mentors = mockMentors.filter(mentor => mentor.schoolId === school.id);
    school.management = mockManagement.filter(mgmt => mgmt.schoolId === school.id);
});

const api = {
    getSchools: (): Promise<School[]> => new Promise(resolve => setTimeout(() => resolve(mockSchools), 500)),
    createSchool: (schoolData: Omit<School, 'id' | 'contacts' | 'teachers' | 'mentors' | 'management'> & {
        teachers?: Omit<Teacher, 'id' | 'schoolId' | 'trainingHistory'>[];
        mentors?: Omit<Mentor, 'id' | 'schoolId' | 'assignedTeachers'>[];
        management?: Omit<Management, 'id' | 'schoolId'>[];
    }): Promise<School> => new Promise((resolve) => {
        setTimeout(() => {
            const newSchool: School = {
                id: `sch-${Date.now()}`,
                ...schoolData,
                contacts: [],
                teachers: schoolData.teachers?.map((teacher, index) => ({
                    ...teacher,
                    id: `tch-${Date.now()}-${index}`,
                    schoolId: `sch-${Date.now()}`,
                    trainingHistory: []
                })) || [],
                mentors: schoolData.mentors?.map((mentor, index) => ({
                    ...mentor,
                    id: `mtr-${Date.now()}-${index}`,
                    schoolId: `sch-${Date.now()}`,
                    assignedTeachers: []
                })) || [],
                management: schoolData.management?.map((mgmt, index) => ({
                    ...mgmt,
                    id: `mgmt-${Date.now()}-${index}`,
                    schoolId: `sch-${Date.now()}`
                })) || []
            };

            mockSchools.unshift(newSchool);
            
            // Add teachers to mockTeachers array
            if (newSchool.teachers) {
                mockTeachers.push(...newSchool.teachers);
            }
            
            // Add mentors to mockMentors array
            if (newSchool.mentors) {
                mockMentors.push(...newSchool.mentors);
            }
            
            // Add management to mockManagement array
            if (newSchool.management) {
                mockManagement.push(...newSchool.management);
            }

            resolve(newSchool);
        }, 300);
    }),
    getTeachers: (): Promise<Teacher[]> => new Promise(resolve => setTimeout(() => resolve(mockTeachers), 500)),
    createTeacher: (teacherData: Omit<Teacher, 'id' | 'trainingHistory'>): Promise<Teacher> => new Promise((resolve) => {
        setTimeout(() => {
            const newTeacher: Teacher = {
                id: `tch-${Date.now()}`,
                ...teacherData,
                trainingHistory: []
            };

            mockTeachers.unshift(newTeacher);
            resolve(newTeacher);
        }, 300);
    }),
    getMentors: (): Promise<Mentor[]> => new Promise(resolve => setTimeout(() => resolve(mockMentors), 500)),
    getManagement: (): Promise<Management[]> => new Promise(resolve => setTimeout(() => resolve(mockManagement), 500)),
    getTrainingPrograms: (): Promise<TrainingProgram[]> => new Promise(resolve => setTimeout(() => resolve(mockTrainings), 500)),
    createTraining: (trainingData: Omit<TrainingProgram, 'id' | 'assignedTeachers' | 'objectives'> & { objectives?: string[]; assignedTeachers?: string[]; maxParticipants?: number }): Promise<TrainingProgram> => new Promise((resolve) => {
        setTimeout(() => {
            const newTraining: TrainingProgram = {
                id: `trn-${Date.now()}`,
                name: trainingData.name,
                description: trainingData.description,
                level: trainingData.level,
                category: trainingData.category,
                startDate: trainingData.startDate,
                endDate: trainingData.endDate,
                meetingLink: trainingData.meetingLink,
                objectives: trainingData.objectives || [],
                assignedTeachers: trainingData.assignedTeachers || [],
                maxParticipants: trainingData.maxParticipants,
            };

            mockTrainings.unshift(newTraining);

            // Update teachers' trainingHistory for any pre-assigned teachers
            if (newTraining.assignedTeachers && newTraining.assignedTeachers.length > 0) {
                newTraining.assignedTeachers.forEach(teacherId => {
                    const teacher = mockTeachers.find(t => t.id === teacherId);
                    if (teacher) {
                        teacher.trainingHistory = teacher.trainingHistory || [];
                        if (!teacher.trainingHistory.includes(newTraining.id)) {
                            teacher.trainingHistory.push(newTraining.id);
                        }
                    }
                });
            }

            resolve(newTraining);
        }, 300);
    }),
    updateTraining: (updatedTraining: TrainingProgram): Promise<TrainingProgram> => new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = mockTrainings.findIndex(t => t.id === updatedTraining.id);
            if (index === -1) {
                reject(new Error('Training program not found'));
                return;
            }

            // Replace the training
            mockTrainings[index] = { ...updatedTraining };

            // Ensure teacher assignments and teacher histories are synchronized
            const assigned = mockTrainings[index].assignedTeachers || [];

            // Remove training from teachers no longer assigned
            mockTeachers.forEach(teacher => {
                teacher.trainingHistory = teacher.trainingHistory || [];
                if (!assigned.includes(teacher.id) && teacher.trainingHistory.includes(updatedTraining.id)) {
                    teacher.trainingHistory = teacher.trainingHistory.filter(id => id !== updatedTraining.id);
                }
            });

            // Add training to newly assigned teachers
            assigned.forEach(teacherId => {
                const teacher = mockTeachers.find(t => t.id === teacherId);
                if (teacher) {
                    teacher.trainingHistory = teacher.trainingHistory || [];
                    if (!teacher.trainingHistory.includes(updatedTraining.id)) {
                        teacher.trainingHistory.push(updatedTraining.id);
                    }
                }
            });

            resolve(mockTrainings[index]);
        }, 300);
    }),
    deleteTraining: (id: string): Promise<void> => new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = mockTrainings.findIndex(t => t.id === id);
            if (index === -1) {
                reject(new Error('Training not found'));
                return;
            }

            // Remove associated assignments
            for (let i = mockTeacherTrainingAssignments.length - 1; i >= 0; i--) {
                if (mockTeacherTrainingAssignments[i].trainingProgramId === id) {
                    const assignment = mockTeacherTrainingAssignments.splice(i, 1)[0];
                    // Remove from teacher history
                    const teacher = mockTeachers.find(t => t.id === assignment.teacherId);
                    if (teacher) {
                        teacher.trainingHistory = teacher.trainingHistory.filter(tid => tid !== id);
                    }
                }
            }

            // Remove training
            mockTrainings.splice(index, 1);
            resolve();
        }, 300);
    }),
    assignTeacherToTraining: (teacherId: string, trainingId: string): Promise<void> => new Promise((resolve, reject) => {
        setTimeout(() => {
            const existingAssignment = mockTeacherTrainingAssignments.find(
                assignment => assignment.teacherId === teacherId && assignment.trainingProgramId === trainingId
            );

            if (existingAssignment) {
                reject(new Error('Teacher is already assigned to this training'));
                return;
            }

            const newAssignment: TeacherTraining = {
                teacherId,
                trainingProgramId: trainingId,
                status: TrainingStatus.SCHEDULED,
                attendance: false,
            };

            mockTeacherTrainingAssignments.push(newAssignment);

            // Update training program
            const training = mockTrainings.find(t => t.id === trainingId);
            if (training) {
                training.assignedTeachers = training.assignedTeachers || [];
                training.assignedTeachers.push(teacherId);
            }

            // Update teacher
            const teacher = mockTeachers.find(t => t.id === teacherId);
            if (teacher) {
                teacher.trainingHistory.push(trainingId);
            }

            resolve();
        }, 500);
    }),
    removeTeacherFromTraining: (teacherId: string, trainingId: string): Promise<void> => new Promise((resolve, reject) => {
        setTimeout(() => {
            const assignmentIndex = mockTeacherTrainingAssignments.findIndex(
                assignment => assignment.teacherId === teacherId && assignment.trainingProgramId === trainingId
            );

            if (assignmentIndex === -1) {
                reject(new Error('Assignment not found'));
                return;
            }

            mockTeacherTrainingAssignments.splice(assignmentIndex, 1);

            // Update training program
            const training = mockTrainings.find(t => t.id === trainingId);
            if (training && training.assignedTeachers) {
                training.assignedTeachers = training.assignedTeachers.filter(id => id !== teacherId);
            }

            // Update teacher
            const teacher = mockTeachers.find(t => t.id === teacherId);
            if (teacher) {
                teacher.trainingHistory = teacher.trainingHistory.filter(id => id !== trainingId);
            }

            resolve();
        }, 500);
    }),
    getDashboardStats: (): Promise<{ [key: string]: number }> => new Promise(resolve => setTimeout(() => resolve({
        schoolCount: mockSchools.length,
        teacherCount: mockTeachers.length,
        trainingCount: mockTrainings.length,
        auditsPending: mockAudits.filter(a => a.status === AuditStatus.PENDING).length,
    }), 300)),
    getTrainingCompletionData: (): Promise<any[]> => new Promise(resolve => setTimeout(() => resolve([
        { name: 'Jan', completed: 30, scheduled: 50 },
        { name: 'Feb', completed: 45, scheduled: 55 },
        { name: 'Mar', completed: 50, scheduled: 60 },
        { name: 'Apr', completed: 62, scheduled: 70 },
        { name: 'May', completed: 70, scheduled: 80 },
        { name: 'Jun', completed: 75, scheduled: 85 },
    ]), 400)),
    getTasks: (): Promise<EmployeeTask[]> => new Promise(resolve => setTimeout(() => resolve(mockTasks), 500)),
    getAudits: (): Promise<Audit[]> => new Promise(resolve => setTimeout(() => resolve(mockAudits), 500)),
    removeManagement: (id: string): Promise<void> => new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = mockManagement.findIndex(m => m.id === id);
            if (index === -1) {
                reject(new Error('Management staff not found'));
                return;
            }
            
            mockManagement.splice(index, 1);
            resolve();
        }, 300);
    }),
    updateSchool: (updatedSchool: School): Promise<School> => new Promise((resolve, reject) => {
        setTimeout(() => {
            const index = mockSchools.findIndex(s => s.id === updatedSchool.id);
            if (index === -1) {
                reject(new Error('School not found'));
                return;
            }
            
            // Update the school in the mock data
            mockSchools[index] = updatedSchool;
            
            // Also update related staff in their respective arrays
            // Update teachers
            if (updatedSchool.teachers) {
                // Remove old teachers for this school
                for (let i = mockTeachers.length - 1; i >= 0; i--) {
                    if (mockTeachers[i].schoolId === updatedSchool.id) {
                        mockTeachers.splice(i, 1);
                    }
                }
                // Add updated teachers
                mockTeachers.push(...updatedSchool.teachers);
            }
            
            // Update mentors
            if (updatedSchool.mentors) {
                // Remove old mentors for this school
                for (let i = mockMentors.length - 1; i >= 0; i--) {
                    if (mockMentors[i].schoolId === updatedSchool.id) {
                        mockMentors.splice(i, 1);
                    }
                }
                // Add updated mentors
                mockMentors.push(...updatedSchool.mentors);
            }
            
            // Update management
            if (updatedSchool.management) {
                // Remove old management for this school
                for (let i = mockManagement.length - 1; i >= 0; i--) {
                    if (mockManagement[i].schoolId === updatedSchool.id) {
                        mockManagement.splice(i, 1);
                    }
                }
                // Add updated management
                mockManagement.push(...updatedSchool.management);
            }
            
            resolve(updatedSchool);
        }, 300);
    }),
};

export default api;
