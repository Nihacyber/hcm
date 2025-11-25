// Base types
export type ObjectId = string;

export type User = {
    _id?: string;
    id?: string;
    username: string;
    password_hash: string;
    full_name: string;
    role: 'admin' | 'employee' | 'viewer';
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type Permission = {
    _id?: string;
    id?: string;
    user_id: string;
    can_delete_schools: boolean;
    can_manage_users: boolean;
    can_assign_training: boolean;
    can_view_reports: boolean;
    can_manage_schools: boolean;
    can_manage_teachers: boolean;
    can_manage_mentors: boolean;
    can_manage_admin_personnel: boolean;
    can_manage_training_programs: boolean;
};

export type School = {
    _id?: string;
    id?: string;
    name: string;
    code: string;
    address: string;
    phone: string;
    email: string;
    enrollment_count: number;
    principal_name: string;
    created_by?: string | null;
    created_at: string;
    updated_at: string;
};

export type Teacher = {
    _id?: string;
    id?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    school_id: string | null;
    subject_specialization: string;
    hire_date: string | null;
    status: 'active' | 'on_leave' | 'inactive';
    username: string | null;
    password_hash: string | null;
    is_active_login: boolean;
    qualification?: string;
    is_alumni?: boolean;
    years_of_experience?: number;
    date_of_birth?: string;
    created_at: string;
    updated_at: string;
};

export type Mentor = {
    _id?: string;
    id?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    specialization: string;
    years_of_experience: number;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
};

export type MentorSchool = {
    _id?: string;
    id?: string;
    mentor_id: string;
    school_id: string;
    assigned_at: string;
};

export type AdminPersonnel = {
    _id?: string;
    id?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    position: string;
    department: string;
    hire_date: string | null;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
};

export type TrainingProgram = {
    _id?: string;
    id?: string;
    title: string;
    description: string;
    duration_hours: number;
    category: string;
    status: 'active' | 'archived';
    start_date: string | null;
    end_date: string | null;
    meeting_link: string;
    created_at: string;
    updated_at: string;
};

export type TrainingAssignment = {
    _id?: string;
    id?: string;
    training_program_id: string;
    teacher_id: string;
    assigned_date: string;
    due_date: string | null;
    completion_date: string | null;
    status: 'assigned' | 'in_progress' | 'completed' | 'overdue';
    progress_percentage: number;
    score: number | null;
    assigned_by?: string | null;
};

export type TrainingAttendance = {
    _id?: string;
    id?: string;
    assignment_id: string;
    teacher_id: string;
    training_program_id: string;
    attendance_date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes: string;
    recorded_by: string | null;
    created_at: string;
    updated_at: string;
};

export type SchoolFollowup = {
    _id?: string;
    id?: string;
    school_id: string;
    employee_id: string;
    followup_date: string;
    comments: string;
    next_followup_date: string | null;
    status: 'completed' | 'pending';
    created_at: string;
    updated_at: string;
};

export type EmployeeTask = {
    _id?: string;
    id?: string;
    employee_id: string;
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high';
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    due_date?: string | null;
    completed_at?: string | null;
    time_spent: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    employee?: {
        id: string;
        full_name: string;
        username: string;
    };
};

export type SchoolAssignment = {
    _id?: string;
    id?: string;
    school_id: string;
    employee_id: string;
    assigned_at: string;
};

export type UserDevice = {
    _id?: string;
    id?: string;
    user_id: string;
    device_id: string;
    browser: string;
    os: string;
    device_type: string;
    user_agent: string;
    ip_address: string | null;
    location: string | null;
    last_login: string;
    login_count: number;
    is_blocked: boolean;
    created_at: string;
    updated_at: string;
};

// Helper function to convert MongoDB document to app format
export function toAppFormat<T extends { _id?: string; id?: string }>(doc: T | null): T | null {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return {
        ...rest,
        id: _id?.toString() || rest.id,
    } as T;
}

// Helper function to convert app format to MongoDB document
export function toDbFormat<T extends { _id?: string; id?: string }>(obj: T): Omit<T, 'id'> & { _id?: string } {
    const { id, ...rest } = obj;
    if (id && !rest._id) {
        return { ...rest, _id: id };
    }
    return rest;
}
