import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  School,
  Teacher,
  Mentor,
  Management,
  TrainingProgram,
  Audit,
  EmployeeTask,
  TeacherTraining,
  TrainingAttendance,
  TrainingStatus
} from '../types';
import mockApi from './mockDataService';
import { cacheService, CACHE_KEYS, CACHE_TTL } from './cacheService';

// Collection names
const COLLECTIONS = {
  SCHOOLS: 'schools',
  TEACHERS: 'teachers',
  MENTORS: 'mentors',
  MANAGEMENT: 'management',
  TRAINING_PROGRAMS: 'trainingPrograms',
  AUDITS: 'audits',
  TASKS: 'tasks',
  TEACHER_TRAINING: 'teacherTraining',
  TRAINING_ATTENDANCE: 'trainingAttendance'
};

// Helper function to handle Firebase errors and fall back to mock data
const handleFirebaseError = async (firebaseOperation: () => Promise<any>, mockOperation: () => Promise<any>, operationName: string) => {
  try {
    return await firebaseOperation();
  } catch (error: any) {
    console.warn(`Firebase ${operationName} failed, falling back to mock data:`, error);
    if (error?.code === 'permission-denied' || error?.code === 'unavailable') {
      return await mockOperation();
    }
    throw error;
  }
};

// Helper function to handle Firebase errors for attendance operations (no mock fallback)
const handleFirebaseErrorNoMock = async (firebaseOperation: () => Promise<any>, operationName: string) => {
  try {
    return await firebaseOperation();
  } catch (error: any) {
    console.error(`Firebase ${operationName} failed:`, error);
    throw error;
  }
};

// Helper function to convert Firestore timestamp to ISO string
const timestampToString = (timestamp: any): string => {
  if (timestamp?.toDate) {
    return timestamp.toDate().toISOString().split('T')[0];
  }
  return timestamp;
};

// Helper function to convert ISO string to Firestore timestamp
const stringToTimestamp = (dateString: string): Timestamp => {
  return Timestamp.fromDate(new Date(dateString));
};

// Schools CRUD operations
export const getSchools = async (): Promise<School[]> => {
  return cacheService.get(
    CACHE_KEYS.SCHOOLS,
    async () => {
      return handleFirebaseError(
        async () => {
          const schoolsRef = collection(db, COLLECTIONS.SCHOOLS);
          const q = query(schoolsRef, orderBy('name'));
          const querySnapshot = await getDocs(q);

          // FIX: Fetch all related data in parallel instead of sequential (N+1 problem)
          const schoolPromises = querySnapshot.docs.map(async (docSnap) => {
            const schoolData = docSnap.data();

            // Fetch all related data in parallel
            const [teachers, mentors, management] = await Promise.all([
              getTeachersBySchoolId(docSnap.id),
              getMentorsBySchoolId(docSnap.id),
              getManagementBySchoolId(docSnap.id)
            ]);

            return {
              id: docSnap.id,
              name: schoolData.name,
              address: schoolData.address,
              city: schoolData.city,
              state: schoolData.state,
              zip: schoolData.zip,
              studentCount: schoolData.studentCount,
              teacherCount: schoolData.teacherCount,
              mentorCount: schoolData.mentorCount,
              managementCount: schoolData.managementCount,
              contacts: schoolData.contacts || [],
              teachers: teachers,
              mentors: mentors,
              management: management
            };
          });

          return Promise.all(schoolPromises);
        },
        () => mockApi.getSchools(),
        'getSchools'
      );
    },
    CACHE_TTL.MEDIUM
  );
};

export const createSchool = async (schoolData: Omit<School, 'id' | 'contacts' | 'teachers' | 'mentors' | 'management'> & {
  teachers?: Omit<Teacher, 'id' | 'schoolId' | 'trainingHistory'>[];
  mentors?: Omit<Mentor, 'id' | 'schoolId' | 'assignedTeachers'>[];
  management?: Omit<Management, 'id' | 'schoolId'>[];
}): Promise<School> => {
  return handleFirebaseError(
    async () => {
      const { teachers, mentors, management, ...schoolBaseData } = schoolData;

      // Create school document
      const schoolRef = await addDoc(collection(db, COLLECTIONS.SCHOOLS), {
        ...schoolBaseData,
        contacts: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      const schoolId = schoolRef.id;
      const batch = writeBatch(db);

      // Add teachers if provided
      if (teachers && teachers.length > 0) {
        for (const teacher of teachers) {
          const teacherRef = doc(collection(db, COLLECTIONS.TEACHERS));
          batch.set(teacherRef, {
            ...teacher,
            schoolId,
            qualifications: Array.isArray(teacher.qualifications) ? teacher.qualifications : [],
            trainingHistory: [],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
      }

      // Add mentors if provided
      if (mentors && mentors.length > 0) {
        for (const mentor of mentors) {
          const mentorRef = doc(collection(db, COLLECTIONS.MENTORS));
          batch.set(mentorRef, {
            ...mentor,
            schoolId,
            qualifications: Array.isArray(mentor.qualifications) ? mentor.qualifications : [],
            assignedTeachers: [],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
      }

      // Add management if provided
      if (management && management.length > 0) {
        for (const staff of management) {
          const managementRef = doc(collection(db, COLLECTIONS.MANAGEMENT));
          batch.set(managementRef, {
            ...staff,
            schoolId,
            qualifications: Array.isArray(staff.qualifications) ? staff.qualifications : [],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        }
      }

      await batch.commit();

      // Return the created school with embedded data
      return {
        id: schoolId,
        ...schoolBaseData,
        contacts: [],
        teachers: teachers ? teachers.map((teacher, index) => ({
          ...teacher,
          id: `temp-${Date.now()}-${index}`,
          schoolId,
          trainingHistory: []
        })) : [],
        mentors: mentors ? mentors.map((mentor, index) => ({
          ...mentor,
          id: `temp-${Date.now()}-${index}`,
          schoolId,
          assignedTeachers: []
        })) : [],
        management: management ? management.map((staff, index) => ({
          ...staff,
          id: `temp-${Date.now()}-${index}`,
          schoolId
        })) : []
      };
    },
    () => mockApi.createSchool(schoolData),
    'createSchool'
  );
};

export const updateSchool = async (updatedSchool: School): Promise<School> => {
  try {
    const { teachers, mentors, management, ...schoolBaseData } = updatedSchool;

    const batch = writeBatch(db);

    // Update school document
    const schoolRef = doc(db, COLLECTIONS.SCHOOLS, updatedSchool.id);
    batch.update(schoolRef, {
      ...schoolBaseData,
      updatedAt: Timestamp.now()
    });

    // Delete existing embedded data
    await deleteTeachersBySchoolId(updatedSchool.id);
    await deleteMentorsBySchoolId(updatedSchool.id);
    await deleteManagementBySchoolId(updatedSchool.id);

    // Add updated teachers
    if (teachers && teachers.length > 0) {
      for (const teacher of teachers) {
        const teacherRef = doc(collection(db, COLLECTIONS.TEACHERS));
        batch.set(teacherRef, {
          ...teacher,
          schoolId: updatedSchool.id,
          qualifications: Array.isArray(teacher.qualifications) ? teacher.qualifications : [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
    }

    // Add updated mentors
    if (mentors && mentors.length > 0) {
      for (const mentor of mentors) {
        const mentorRef = doc(collection(db, COLLECTIONS.MENTORS));
        batch.set(mentorRef, {
          ...mentor,
          schoolId: updatedSchool.id,
          qualifications: Array.isArray(mentor.qualifications) ? mentor.qualifications : [],
          assignedTeachers: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
    }

    // Add updated management
    if (management && management.length > 0) {
      for (const staff of management) {
        const managementRef = doc(collection(db, COLLECTIONS.MANAGEMENT));
        batch.set(managementRef, {
          ...staff,
          schoolId: updatedSchool.id,
          qualifications: Array.isArray(staff.qualifications) ? staff.qualifications : [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
    }

    await batch.commit();

    return updatedSchool;
  } catch (error) {
    console.error('Error updating school:', error);
    throw error;
  }
};

export const deleteSchool = async (schoolId: string): Promise<void> => {
  try {
    const batch = writeBatch(db);

    // Delete all embedded data first
    await deleteTeachersBySchoolId(schoolId);
    await deleteMentorsBySchoolId(schoolId);
    await deleteManagementBySchoolId(schoolId);

    // Delete school document
    const schoolRef = doc(db, COLLECTIONS.SCHOOLS, schoolId);
    batch.delete(schoolRef);

    await batch.commit();
  } catch (error) {
    console.error('Error deleting school:', error);
    throw error;
  }
};

// Teachers CRUD operations
export const getTeachers = async (): Promise<Teacher[]> => {
  return cacheService.get(
    CACHE_KEYS.TEACHERS,
    async () => {
      try {
        const teachersRef = collection(db, COLLECTIONS.TEACHERS);
        const q = query(teachersRef, orderBy('firstName'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          trainingHistory: doc.data().trainingHistory || [],
          qualifications: Array.isArray(doc.data().qualifications) ? doc.data().qualifications : []
        })) as Teacher[];
      } catch (error: any) {
        console.error('Error getting teachers:', error);

        // If it's a permission error, return empty array for now
        if (error?.code === 'permission-denied') {
          console.warn('Firestore permissions denied for teachers. Please update Firestore security rules.');
          return [];
        }

        // For other errors, throw them
        throw error;
      }
    },
    CACHE_TTL.MEDIUM
  );
};

export const getTeachersBySchoolId = async (schoolId: string): Promise<Teacher[]> => {
  try {
    const teachersRef = collection(db, COLLECTIONS.TEACHERS);
    const q = query(teachersRef, where('schoolId', '==', schoolId), orderBy('firstName'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      trainingHistory: doc.data().trainingHistory || []
    })) as Teacher[];
  } catch (error) {
    console.error('Error getting teachers by school ID:', error);
    return [];
  }
};

export const createTeacher = async (teacherData: Omit<Teacher, 'id' | 'trainingHistory'>): Promise<Teacher> => {
  try {
    const teacherRef = await addDoc(collection(db, COLLECTIONS.TEACHERS), {
      ...teacherData,
      qualifications: Array.isArray(teacherData.qualifications) ? teacherData.qualifications : [],
      trainingHistory: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    const newTeacher = {
      id: teacherRef.id,
      ...teacherData,
      qualifications: Array.isArray(teacherData.qualifications) ? teacherData.qualifications : [],
      trainingHistory: []
    };

    // Invalidate teachers cache to ensure fresh data
    cacheService.invalidate(CACHE_KEYS.TEACHERS);
    console.log('✅ Teacher created successfully. Cache invalidated.');

    return newTeacher;
  } catch (error) {
    console.error('Error creating teacher:', error);
    throw error;
  }
};

export const updateTeacher = async (teacherId: string, teacherData: Partial<Teacher>): Promise<Teacher> => {
  try {
    const teacherRef = doc(db, COLLECTIONS.TEACHERS, teacherId);
    await updateDoc(teacherRef, {
      ...teacherData,
      qualifications: Array.isArray(teacherData.qualifications) ? teacherData.qualifications : [],
      updatedAt: Timestamp.now()
    });

    const updatedDoc = await getDoc(teacherRef);
    const updatedTeacher = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      trainingHistory: updatedDoc.data()?.trainingHistory || [],
      qualifications: Array.isArray(updatedDoc.data()?.qualifications) ? updatedDoc.data()?.qualifications : []
    } as Teacher;

    // Invalidate teachers cache to ensure fresh data
    cacheService.invalidate(CACHE_KEYS.TEACHERS);
    console.log('✅ Teacher updated successfully. Cache invalidated.');

    return updatedTeacher;
  } catch (error) {
    console.error('Error updating teacher:', error);
    throw error;
  }
};

export const deleteTeacher = async (teacherId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.TEACHERS, teacherId));

    // Invalidate teachers cache to ensure fresh data
    cacheService.invalidate(CACHE_KEYS.TEACHERS);
    console.log('✅ Teacher deleted successfully. Cache invalidated.');
  } catch (error) {
    console.error('Error deleting teacher:', error);
    throw error;
  }
};

const deleteTeachersBySchoolId = async (schoolId: string): Promise<void> => {
  try {
    const teachersRef = collection(db, COLLECTIONS.TEACHERS);
    const q = query(teachersRef, where('schoolId', '==', schoolId));
    const querySnapshot = await getDocs(q);

    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error('Error deleting teachers by school ID:', error);
  }
};

const deleteMentorsBySchoolId = async (schoolId: string): Promise<void> => {
  try {
    const mentorsRef = collection(db, COLLECTIONS.MENTORS);
    const q = query(mentorsRef, where('schoolId', '==', schoolId));
    const querySnapshot = await getDocs(q);

    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error('Error deleting mentors by school ID:', error);
  }
};

const deleteManagementBySchoolId = async (schoolId: string): Promise<void> => {
  try {
    const managementRef = collection(db, COLLECTIONS.MANAGEMENT);
    const q = query(managementRef, where('schoolId', '==', schoolId));
    const querySnapshot = await getDocs(q);

    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error('Error deleting management by school ID:', error);
  }
};

// Mentors CRUD operations
export const getMentors = async (): Promise<Mentor[]> => {
  return cacheService.get(
    CACHE_KEYS.MENTORS,
    async () => {
      try {
        const mentorsRef = collection(db, COLLECTIONS.MENTORS);
        const q = query(mentorsRef, orderBy('firstName'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          assignedTeachers: doc.data().assignedTeachers || [],
          qualifications: Array.isArray(doc.data().qualifications) ? doc.data().qualifications : []
        })) as Mentor[];
      } catch (error) {
        console.error('Error getting mentors:', error);
        throw error;
      }
    },
    CACHE_TTL.MEDIUM
  );
};

export const getMentorsBySchoolId = async (schoolId: string): Promise<Mentor[]> => {
  try {
    const mentorsRef = collection(db, COLLECTIONS.MENTORS);
    const q = query(mentorsRef, where('schoolId', '==', schoolId));
    const querySnapshot = await getDocs(q);

    const mentors = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      assignedTeachers: doc.data().assignedTeachers || [],
      qualifications: Array.isArray(doc.data().qualifications) ? doc.data().qualifications : []
    })) as Mentor[];

    return mentors.sort((a, b) => a.firstName.localeCompare(b.firstName));
  } catch (error) {
    console.error('Error getting mentors by school ID:', error);
    return [];
  }
};

// Management CRUD operations
export const getManagement = async (): Promise<Management[]> => {
  return cacheService.get(
    CACHE_KEYS.MANAGEMENT,
    async () => {
      try {
        const managementRef = collection(db, COLLECTIONS.MANAGEMENT);
        const q = query(managementRef, orderBy('firstName'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          qualifications: Array.isArray(doc.data().qualifications) ? doc.data().qualifications : []
        })) as Management[];
      } catch (error) {
        console.error('Error getting management:', error);
        throw error;
      }
    },
    CACHE_TTL.MEDIUM
  );
};

export const getManagementBySchoolId = async (schoolId: string): Promise<Management[]> => {
  try {
    const managementRef = collection(db, COLLECTIONS.MANAGEMENT);
    const q = query(managementRef, where('schoolId', '==', schoolId));
    const querySnapshot = await getDocs(q);

    const management = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      qualifications: Array.isArray(doc.data().qualifications) ? doc.data().qualifications : []
    })) as Management[];

    return management.sort((a, b) => a.firstName.localeCompare(b.firstName));
  } catch (error) {
    console.error('Error getting management by school ID:', error);
    return [];
  }
};

export const createManagement = async (managementData: Omit<Management, 'id'>): Promise<Management> => {
  try {
    const managementRef = await addDoc(collection(db, COLLECTIONS.MANAGEMENT), {
      ...managementData,
      qualifications: Array.isArray(managementData.qualifications) ? managementData.qualifications : [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    const newManagement = {
      id: managementRef.id,
      ...managementData,
      qualifications: Array.isArray(managementData.qualifications) ? managementData.qualifications : []
    };

    // Invalidate management cache to ensure fresh data
    cacheService.invalidate(CACHE_KEYS.MANAGEMENT);
    console.log('✅ Management staff created successfully. Cache invalidated.');

    return newManagement;
  } catch (error) {
    console.error('Error creating management:', error);
    throw error;
  }
};

export const removeManagement = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.MANAGEMENT, id));

    // Invalidate management cache to ensure fresh data
    cacheService.invalidate(CACHE_KEYS.MANAGEMENT);
    console.log('✅ Management staff deleted successfully. Cache invalidated.');
  } catch (error) {
    console.error('Error removing management:', error);
    throw error;
  }
};

// Teacher Training Assignment operations
export const assignTeacherToTraining = async (teacherId: string, trainingId: string): Promise<void> => {
  try {
    // Check if assignment already exists
    const assignmentsRef = collection(db, COLLECTIONS.TEACHER_TRAINING);
    const q = query(assignmentsRef, where('teacherId', '==', teacherId), where('trainingProgramId', '==', trainingId));
    const existingAssignments = await getDocs(q);

    if (!existingAssignments.empty) {
      throw new Error('Teacher is already assigned to this training');
    }

    // Create new assignment
    await addDoc(collection(db, COLLECTIONS.TEACHER_TRAINING), {
      teacherId,
      trainingProgramId: trainingId,
      status: TrainingStatus.SCHEDULED,
      attendance: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // Update teacher training history
    const teacherRef = doc(db, COLLECTIONS.TEACHERS, teacherId);
    const teacherDoc = await getDoc(teacherRef);
    if (teacherDoc.exists()) {
      const teacherData = teacherDoc.data();
      const trainingHistory = teacherData.trainingHistory || [];
      if (!trainingHistory.includes(trainingId)) {
        trainingHistory.push(trainingId);
        await updateDoc(teacherRef, {
          trainingHistory,
          updatedAt: Timestamp.now()
        });
      }
    }

    // Update training program assigned teachers
    const trainingRef = doc(db, COLLECTIONS.TRAINING_PROGRAMS, trainingId);
    const trainingDoc = await getDoc(trainingRef);
    if (trainingDoc.exists()) {
      const trainingData = trainingDoc.data();
      const assignedTeachers = trainingData.assignedTeachers || [];
      if (!assignedTeachers.includes(teacherId)) {
        assignedTeachers.push(teacherId);
        await updateDoc(trainingRef, {
          assignedTeachers,
          updatedAt: Timestamp.now()
        });
      }
    }

    // Invalidate relevant caches to ensure fresh data
    cacheService.invalidate(CACHE_KEYS.TEACHERS);
    cacheService.invalidate(CACHE_KEYS.TRAININGS);
    console.log('✅ Teacher assigned to training successfully. Cache invalidated.');
  } catch (error) {
    console.error('Error assigning teacher to training:', error);
    throw error;
  }
};

export const removeTeacherFromTraining = async (teacherId: string, trainingId: string): Promise<void> => {
  try {
    // Find and delete the assignment
    const assignmentsRef = collection(db, COLLECTIONS.TEACHER_TRAINING);
    const q = query(assignmentsRef, where('teacherId', '==', teacherId), where('trainingProgramId', '==', trainingId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error('Assignment not found');
    }

    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Remove from teacher training history
    const teacherRef = doc(db, COLLECTIONS.TEACHERS, teacherId);
    const teacherDoc = await getDoc(teacherRef);
    if (teacherDoc.exists()) {
      const teacherData = teacherDoc.data();
      const trainingHistory = teacherData.trainingHistory || [];
      const updatedHistory = trainingHistory.filter((id: string) => id !== trainingId);
      batch.update(teacherRef, {
        trainingHistory: updatedHistory,
        updatedAt: Timestamp.now()
      });
    }

    // Remove from training program assigned teachers
    const trainingRef = doc(db, COLLECTIONS.TRAINING_PROGRAMS, trainingId);
    const trainingDoc = await getDoc(trainingRef);
    if (trainingDoc.exists()) {
      const trainingData = trainingDoc.data();
      const assignedTeachers = trainingData.assignedTeachers || [];
      const updatedTeachers = assignedTeachers.filter((id: string) => id !== teacherId);
      batch.update(trainingRef, {
        assignedTeachers: updatedTeachers,
        updatedAt: Timestamp.now()
      });
    }

    await batch.commit();

    // Invalidate relevant caches to ensure fresh data
    cacheService.invalidate(CACHE_KEYS.TEACHERS);
    cacheService.invalidate(CACHE_KEYS.TRAININGS);
    console.log('✅ Teacher removed from training successfully. Cache invalidated.');
  } catch (error) {
    console.error('Error removing teacher from training:', error);
    throw error;
  }
};

// Training Programs CRUD operations
export const getTrainingPrograms = async (): Promise<TrainingProgram[]> => {
  return cacheService.get(
    CACHE_KEYS.TRAININGS,
    async () => {
      try {
        const trainingsRef = collection(db, COLLECTIONS.TRAINING_PROGRAMS);
        const q = query(trainingsRef, orderBy('name'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            startDate: timestampToString(data.startDate),
            endDate: timestampToString(data.endDate),
            assignedTeachers: data.assignedTeachers || [],
            objectives: data.objectives || []
          };
        }) as TrainingProgram[];
      } catch (error: any) {
        console.error('Error getting training programs:', error);

        // If it's a permission error, return empty array for now
        if (error?.code === 'permission-denied') {
          console.warn('Firestore permissions denied for training programs. Please update Firestore security rules.');
          return [];
        }

        // For other errors, throw them
        throw error;
      }
    },
    CACHE_TTL.MEDIUM
  );
};

export const createTraining = async (trainingData: Omit<TrainingProgram, 'id' | 'assignedTeachers' | 'objectives'> & {
  objectives?: string[];
  assignedTeachers?: string[];
  maxParticipants?: number;
}): Promise<TrainingProgram> => {
  try {
    const { objectives, assignedTeachers, maxParticipants, ...baseData } = trainingData;

    const trainingRef = await addDoc(collection(db, COLLECTIONS.TRAINING_PROGRAMS), {
      ...baseData,
      startDate: stringToTimestamp(trainingData.startDate),
      endDate: stringToTimestamp(trainingData.endDate),
      objectives: objectives || [],
      assignedTeachers: assignedTeachers || [],
      maxParticipants: maxParticipants || 25,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    return {
      id: trainingRef.id,
      ...trainingData,
      objectives: objectives || [],
      assignedTeachers: assignedTeachers || []
    };
  } catch (error) {
    console.error('Error creating training program:', error);
    throw error;
  }
};

export const updateTraining = async (updatedTraining: TrainingProgram): Promise<TrainingProgram> => {
  try {
    const trainingRef = doc(db, COLLECTIONS.TRAINING_PROGRAMS, updatedTraining.id);
    await updateDoc(trainingRef, {
      ...updatedTraining,
      startDate: stringToTimestamp(updatedTraining.startDate),
      endDate: stringToTimestamp(updatedTraining.endDate),
      updatedAt: Timestamp.now()
    });

    return updatedTraining;
  } catch (error) {
    console.error('Error updating training program:', error);
    throw error;
  }
};

export const deleteTraining = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.TRAINING_PROGRAMS, id));
  } catch (error) {
    console.error('Error deleting training program:', error);
    throw error;
  }
};

// Dashboard stats
export const getDashboardStats = async (): Promise<{ [key: string]: number }> => {
  return cacheService.get(
    CACHE_KEYS.DASHBOARD_STATS,
    async () => {
      try {
        const [schools, teachers, trainings] = await Promise.all([
          getSchools(),
          getTeachers(),
          getTrainingPrograms()
        ]);

        return {
          schoolCount: schools.length,
          teacherCount: teachers.length,
          trainingCount: trainings.length,
          // Note: Audit stats would need additional implementation
          auditsPending: 0
        };
      } catch (error) {
        console.error('Error getting dashboard stats:', error);
        throw error;
      }
    },
    CACHE_TTL.MEDIUM
  );
};

// Training completion data for charts
export const getTrainingCompletionData = async (): Promise<any[]> => {
  try {
    // Return mock data for now - in a real app, this would come from Firebase
    return [
      { name: 'Jan', completed: 30, scheduled: 50 },
      { name: 'Feb', completed: 45, scheduled: 55 },
      { name: 'Mar', completed: 50, scheduled: 60 },
      { name: 'Apr', completed: 62, scheduled: 70 },
      { name: 'May', completed: 70, scheduled: 80 },
      { name: 'Jun', completed: 75, scheduled: 85 },
    ];
  } catch (error) {
    console.error('Error getting training completion data:', error);
    throw error;
  }
};

// Tasks CRUD operations
export const getTasks = async (): Promise<EmployeeTask[]> => {
  return cacheService.get(
    CACHE_KEYS.TASKS,
    async () => {
      try {
        const tasksRef = collection(db, COLLECTIONS.TASKS);
        const q = query(tasksRef, orderBy('deadline'));
        const querySnapshot = await getDocs(q);

        return querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            deadline: timestampToString(data.deadline)
          };
        }) as EmployeeTask[];
      } catch (error: any) {
        console.error('Error getting tasks:', error);

        // If it's a permission error, return empty array for now
        if (error?.code === 'permission-denied') {
          console.warn('Firestore permissions denied for tasks. Please update Firestore security rules.');
          return [];
        }

        // For other errors, throw them
        throw error;
      }
    },
    CACHE_TTL.MEDIUM
  );
};

// Get teacher training records
export const getTeacherTrainingRecords = async (teacherId: string): Promise<TeacherTraining[]> => {
  try {
    const teacherTrainingRef = collection(db, COLLECTIONS.TEACHER_TRAINING);
    const q = query(teacherTrainingRef, where('teacherId', '==', teacherId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TeacherTraining[];
  } catch (error) {
    console.error('Error getting teacher training records:', error);
    return [];
  }
};

// Training Attendance operations
export const saveTrainingAttendance = async (attendance: Omit<TrainingAttendance, 'id'>): Promise<TrainingAttendance> => {
  return handleFirebaseErrorNoMock(async () => {
    // Check if attendance record already exists for this date
    const attendanceRef = collection(db, COLLECTIONS.TRAINING_ATTENDANCE);
    const q = query(
      attendanceRef,
      where('teacherId', '==', attendance.teacherId),
      where('trainingProgramId', '==', attendance.trainingProgramId),
      where('date', '==', attendance.date)
    );
    const existingRecords = await getDocs(q);

    if (!existingRecords.empty) {
      // Update existing record
      const docId = existingRecords.docs[0].id;
      const docRef = doc(db, COLLECTIONS.TRAINING_ATTENDANCE, docId);
      await updateDoc(docRef, {
        status: attendance.status,
        markedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return {
        id: docId,
        ...attendance,
        markedAt: new Date().toISOString()
      };
    } else {
      // Create new record
      const docRef = await addDoc(collection(db, COLLECTIONS.TRAINING_ATTENDANCE), {
        ...attendance,
        markedAt: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return {
        id: docRef.id,
        ...attendance,
        markedAt: new Date().toISOString()
      };
    }
  }, 'saveTrainingAttendance');
};

export const getTrainingAttendance = async (trainingProgramId: string, teacherId?: string): Promise<TrainingAttendance[]> => {
  return handleFirebaseErrorNoMock(async () => {
    const attendanceRef = collection(db, COLLECTIONS.TRAINING_ATTENDANCE);

    if (teacherId) {
      // Get attendance for specific teacher and training - simplified query
      const q = query(
        attendanceRef,
        where('trainingProgramId', '==', trainingProgramId),
        where('teacherId', '==', teacherId)
      );
      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          teacherId: data.teacherId,
          trainingProgramId: data.trainingProgramId,
          date: data.date,
          status: data.status,
          markedAt: data.markedAt?.toDate?.()?.toISOString() || data.markedAt
        } as TrainingAttendance;
      });
      // Sort in memory
      return records.sort((a, b) => a.date.localeCompare(b.date));
    } else {
      // Get all attendance for a training - simplified query
      const q = query(
        attendanceRef,
        where('trainingProgramId', '==', trainingProgramId)
      );
      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          teacherId: data.teacherId,
          trainingProgramId: data.trainingProgramId,
          date: data.date,
          status: data.status,
          markedAt: data.markedAt?.toDate?.()?.toISOString() || data.markedAt
        } as TrainingAttendance;
      });
      // Sort in memory
      return records.sort((a, b) => a.date.localeCompare(b.date));
    }
  }, 'getTrainingAttendance');
};

export const getTeacherAttendanceForTraining = async (teacherId: string, trainingProgramId: string): Promise<TrainingAttendance[]> => {
  return handleFirebaseErrorNoMock(async () => {
    const attendanceRef = collection(db, COLLECTIONS.TRAINING_ATTENDANCE);
    // Simplified query to avoid composite index requirements
    const q = query(
      attendanceRef,
      where('teacherId', '==', teacherId),
      where('trainingProgramId', '==', trainingProgramId)
    );
    const querySnapshot = await getDocs(q);

    // Sort in memory instead of using orderBy
    const records = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      markedAt: doc.data().markedAt?.toDate?.()?.toISOString() || doc.data().markedAt
    })) as TrainingAttendance[];

    // Sort by date
    return records.sort((a, b) => a.date.localeCompare(b.date));
  }, 'getTeacherAttendanceForTraining');
};

// Attendance Analytics Functions
export const getFullPeriodAttendance = async (trainingProgramId: string, startDate: string, endDate: string): Promise<{
  teachers: { teacherId: string; teacherName: string; attendanceRate: number; totalDays: number; presentDays: number }[];
  summary: { totalTeachers: number; averageAttendanceRate: number; fullyAttended: number };
}> => {
  try {
    // Get all attendance records for the training program within date range
    const attendanceRef = collection(db, COLLECTIONS.TRAINING_ATTENDANCE);
    const q = query(
      attendanceRef,
      where('trainingProgramId', '==', trainingProgramId),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const attendanceSnapshot = await getDocs(q);

    // Get all teachers assigned to this training
    const training = await getDoc(doc(db, COLLECTIONS.TRAINING_PROGRAMS, trainingProgramId));
    const assignedTeachers = training.data()?.assignedTeachers || [];

    // Get teacher details
    const teachers = await Promise.all(
      assignedTeachers.map(async (teacherId: string) => {
        const teacherDoc = await getDoc(doc(db, COLLECTIONS.TEACHERS, teacherId));
        return {
          id: teacherId,
          name: teacherDoc.exists() ? `${teacherDoc.data()?.firstName} ${teacherDoc.data()?.lastName}` : 'Unknown Teacher'
        };
      })
    );

    // Calculate attendance for each teacher
    const teacherAttendance = teachers.map(teacher => {
      const teacherRecords = attendanceSnapshot.docs.filter(doc =>
        doc.data().teacherId === teacher.id
      );

      const presentDays = teacherRecords.filter(doc =>
        doc.data().status === 'PRESENT'
      ).length;

      const totalDays = teacherRecords.length;
      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      return {
        teacherId: teacher.id,
        teacherName: teacher.name,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        totalDays,
        presentDays
      };
    });

    const totalTeachers = teacherAttendance.length;
    const averageAttendanceRate = totalTeachers > 0 ?
      teacherAttendance.reduce((sum, t) => sum + t.attendanceRate, 0) / totalTeachers : 0;
    const fullyAttended = teacherAttendance.filter(t => t.attendanceRate === 100).length;

    return {
      teachers: teacherAttendance,
      summary: {
        totalTeachers,
        averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100,
        fullyAttended
      }
    };
  } catch (error) {
    console.error('Error getting full period attendance:', error);
    // Try fallback to mock data if Firebase fails
    try {
      const mockApi = await import('./mockDataService');
      // Mock doesn't have analytics functions, so return empty data
      console.warn('Falling back to empty analytics data - mock service does not support analytics');
      return { teachers: [], summary: { totalTeachers: 0, averageAttendanceRate: 0, fullyAttended: 0 } };
    } catch (mockError) {
      console.error('Mock fallback also failed:', mockError);
      return { teachers: [], summary: { totalTeachers: 0, averageAttendanceRate: 0, fullyAttended: 0 } };
    }
  }
};

export const getSessionAttendance = async (trainingProgramId: string, sessionDate: string): Promise<{
  present: { teacherId: string; teacherName: string }[];
  absent: { teacherId: string; teacherName: string }[];
  notMarked: { teacherId: string; teacherName: string }[];
  summary: { totalAssigned: number; presentCount: number; absentCount: number; notMarkedCount: number };
}> => {
  try {
    // Get training program to find assigned teachers
    const training = await getDoc(doc(db, COLLECTIONS.TRAINING_PROGRAMS, trainingProgramId));
    const assignedTeachers = training.data()?.assignedTeachers || [];

    // Get attendance records for this session
    const attendanceRef = collection(db, COLLECTIONS.TRAINING_ATTENDANCE);
    const q = query(
      attendanceRef,
      where('trainingProgramId', '==', trainingProgramId),
      where('date', '==', sessionDate)
    );
    const attendanceSnapshot = await getDocs(q);

    // Get teacher details
    const teachers = await Promise.all(
      assignedTeachers.map(async (teacherId: string) => {
        const teacherDoc = await getDoc(doc(db, COLLECTIONS.TEACHERS, teacherId));
        return {
          id: teacherId,
          name: teacherDoc.exists() ? `${teacherDoc.data()?.firstName} ${teacherDoc.data()?.lastName}` : 'Unknown Teacher'
        };
      })
    );

    const present: { teacherId: string; teacherName: string }[] = [];
    const absent: { teacherId: string; teacherName: string }[] = [];
    const notMarked: { teacherId: string; teacherName: string }[] = [];

    teachers.forEach(teacher => {
      const record = attendanceSnapshot.docs.find(doc => doc.data().teacherId === teacher.id);
      if (record) {
        const status = record.data().status;
        if (status === 'PRESENT') {
          present.push({ teacherId: teacher.id, teacherName: teacher.name });
        } else if (status === 'ABSENT') {
          absent.push({ teacherId: teacher.id, teacherName: teacher.name });
        }
      } else {
        notMarked.push({ teacherId: teacher.id, teacherName: teacher.name });
      }
    });

    return {
      present,
      absent,
      notMarked,
      summary: {
        totalAssigned: teachers.length,
        presentCount: present.length,
        absentCount: absent.length,
        notMarkedCount: notMarked.length
      }
    };
  } catch (error) {
    console.error('Error getting session attendance:', error);
    // Try fallback to mock data if Firebase fails
    try {
      const mockApi = await import('./mockDataService');
      console.warn('Falling back to empty session attendance data - mock service does not support analytics');
      return {
        present: [],
        absent: [],
        notMarked: [],
        summary: { totalAssigned: 0, presentCount: 0, absentCount: 0, notMarkedCount: 0 }
      };
    } catch (mockError) {
      console.error('Mock fallback also failed:', mockError);
      return {
        present: [],
        absent: [],
        notMarked: [],
        summary: { totalAssigned: 0, presentCount: 0, absentCount: 0, notMarkedCount: 0 }
      };
    }
  }
};

export const getDailyHeadcountAndAttendanceRate = async (trainingProgramId: string, startDate: string, endDate: string): Promise<{
  dailyStats: { date: string; totalAssigned: number; presentCount: number; absentCount: number; notMarkedCount: number; attendanceRate: number }[];
  overallSummary: { totalDays: number; averageAttendanceRate: number; totalPresent: number; totalAbsent: number; totalNotMarked: number };
}> => {
  try {
    // Generate date range
    const dates: string[] = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get training program to find assigned teachers
    const training = await getDoc(doc(db, COLLECTIONS.TRAINING_PROGRAMS, trainingProgramId));
    const assignedTeachers = training.data()?.assignedTeachers || [];
    const totalAssigned = assignedTeachers.length;

    // Get all attendance records for the period
    const attendanceRef = collection(db, COLLECTIONS.TRAINING_ATTENDANCE);
    const q = query(
      attendanceRef,
      where('trainingProgramId', '==', trainingProgramId),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const attendanceSnapshot = await getDocs(q);

    const dailyStats = dates.map(date => {
      const dayRecords = attendanceSnapshot.docs.filter(doc => doc.data().date === date);
      const presentCount = dayRecords.filter(doc => doc.data().status === 'PRESENT').length;
      const absentCount = dayRecords.filter(doc => doc.data().status === 'ABSENT').length;
      const notMarkedCount = totalAssigned - presentCount - absentCount;
      const attendanceRate = totalAssigned > 0 ? (presentCount / totalAssigned) * 100 : 0;

      return {
        date,
        totalAssigned,
        presentCount,
        absentCount,
        notMarkedCount,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      };
    });

    const totalDays = dailyStats.length;
    const averageAttendanceRate = totalDays > 0 ?
      dailyStats.reduce((sum, day) => sum + day.attendanceRate, 0) / totalDays : 0;
    const totalPresent = dailyStats.reduce((sum, day) => sum + day.presentCount, 0);
    const totalAbsent = dailyStats.reduce((sum, day) => sum + day.absentCount, 0);
    const totalNotMarked = dailyStats.reduce((sum, day) => sum + day.notMarkedCount, 0);

    return {
      dailyStats,
      overallSummary: {
        totalDays,
        averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100,
        totalPresent,
        totalAbsent,
        totalNotMarked
      }
    };
  } catch (error) {
    console.error('Error getting daily headcount and attendance rate:', error);
    // Try fallback to mock data if Firebase fails
    try {
      const mockApi = await import('./mockDataService');
      console.warn('Falling back to empty daily headcount data - mock service does not support analytics');
      return {
        dailyStats: [],
        overallSummary: { totalDays: 0, averageAttendanceRate: 0, totalPresent: 0, totalAbsent: 0, totalNotMarked: 0 }
      };
    } catch (mockError) {
      console.error('Mock fallback also failed:', mockError);
      return {
        dailyStats: [],
        overallSummary: { totalDays: 0, averageAttendanceRate: 0, totalPresent: 0, totalAbsent: 0, totalNotMarked: 0 }
      };
    }
  }
};

export const getTeachersWithNoAttendance = async (trainingProgramId: string, startDate: string, endDate: string): Promise<{
  teachers: { teacherId: string; teacherName: string; totalSessions: number; attendedSessions: number }[];
  summary: { totalTeachers: number; noAttendanceCount: number };
}> => {
  try {
    // Get training program to find assigned teachers
    const training = await getDoc(doc(db, COLLECTIONS.TRAINING_PROGRAMS, trainingProgramId));
    const assignedTeachers = training.data()?.assignedTeachers || [];

    // Get all attendance records for the period
    const attendanceRef = collection(db, COLLECTIONS.TRAINING_ATTENDANCE);
    const q = query(
      attendanceRef,
      where('trainingProgramId', '==', trainingProgramId),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const attendanceSnapshot = await getDocs(q);

    // Get teacher details and calculate attendance
    const teachersWithAttendance = await Promise.all(
      assignedTeachers.map(async (teacherId: string) => {
        const teacherDoc = await getDoc(doc(db, COLLECTIONS.TEACHERS, teacherId));
        const teacherName = teacherDoc.exists() ? `${teacherDoc.data()?.firstName} ${teacherDoc.data()?.lastName}` : 'Unknown Teacher';

        const teacherRecords = attendanceSnapshot.docs.filter(doc => doc.data().teacherId === teacherId);
        const attendedSessions = teacherRecords.filter(doc => doc.data().status === 'PRESENT').length;

        return {
          teacherId,
          teacherName,
          totalSessions: teacherRecords.length,
          attendedSessions
        };
      })
    );

    // Filter teachers with no attendance
    const teachersWithNoAttendance = teachersWithAttendance.filter(teacher => teacher.attendedSessions === 0);

    return {
      teachers: teachersWithNoAttendance,
      summary: {
        totalTeachers: assignedTeachers.length,
        noAttendanceCount: teachersWithNoAttendance.length
      }
    };
  } catch (error) {
    console.error('Error getting teachers with no attendance:', error);
    // Try fallback to mock data if Firebase fails
    try {
      const mockApi = await import('./mockDataService');
      console.warn('Falling back to empty no-attendance data - mock service does not support analytics');
      return { teachers: [], summary: { totalTeachers: 0, noAttendanceCount: 0 } };
    } catch (mockError) {
      console.error('Mock fallback also failed:', mockError);
      return { teachers: [], summary: { totalTeachers: 0, noAttendanceCount: 0 } };
    }
  }
};

// Cache invalidation functions
export const invalidateSchoolsCache = (): void => {
  cacheService.invalidate(CACHE_KEYS.SCHOOLS);
  cacheService.invalidate(CACHE_KEYS.DASHBOARD_STATS);
};

export const invalidateTeachersCache = (): void => {
  cacheService.invalidate(CACHE_KEYS.TEACHERS);
  cacheService.invalidate(CACHE_KEYS.DASHBOARD_STATS);
  cacheService.invalidatePattern(CACHE_KEYS.TEACHERS_BY_SCHOOL('.*'));
};

export const invalidateMentorsCache = (): void => {
  cacheService.invalidate(CACHE_KEYS.MENTORS);
  cacheService.invalidatePattern(CACHE_KEYS.MENTORS_BY_SCHOOL('.*'));
};

export const invalidateManagementCache = (): void => {
  cacheService.invalidate(CACHE_KEYS.MANAGEMENT);
  cacheService.invalidatePattern(CACHE_KEYS.MANAGEMENT_BY_SCHOOL('.*'));
};

export const invalidateTrainingsCache = (): void => {
  cacheService.invalidate(CACHE_KEYS.TRAININGS);
  cacheService.invalidate(CACHE_KEYS.DASHBOARD_STATS);
};

export const invalidateAllCache = (): void => {
  cacheService.clear();
};

// Export the service object with the same interface as the mock service
const firebaseService = {
  getSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  getTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getMentors,
  getManagement,
  getTrainingPrograms,
  createTraining,
  updateTraining,
  deleteTraining,
  getDashboardStats,
  getTrainingCompletionData,
  getTasks,
  createManagement,
  removeManagement,
  assignTeacherToTraining,
  removeTeacherFromTraining,
  getTeacherTrainingRecords,
  saveTrainingAttendance,
  getTrainingAttendance,
  getTeacherAttendanceForTraining,
  // Attendance Analytics Functions
  getFullPeriodAttendance,
  getSessionAttendance,
  getDailyHeadcountAndAttendanceRate,
  getTeachersWithNoAttendance,
  // Cache invalidation functions
  invalidateSchoolsCache,
  invalidateTeachersCache,
  invalidateMentorsCache,
  invalidateManagementCache,
  invalidateTrainingsCache,
  invalidateAllCache
};

export default firebaseService;