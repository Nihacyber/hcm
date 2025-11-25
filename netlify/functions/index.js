"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongodb_1 = require("./config/mongodb");
const db_1 = require("./services/db");
const mongodb_2 = require("./config/mongodb");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '50mb' }));
// Async wrapper
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
// Connect to MongoDB
mongodb_1.mongodb.connect().catch(console.error);
// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'HCMS API Server is running' });
});
/* ==================== AUTHENTICATION ==================== */
// Login for admin or teacher (role = 'admin' | 'teacher')
app.post('/api/auth/login', asyncHandler(async (req, res) => {
    const { username, password, role } = req.body;
    // Choose collection based on role
    const collection = role === 'teacher' ? mongodb_2.Collections.TEACHERS : mongodb_2.Collections.USERS;
    // DEBUG: Check connection
    const dbInstance = await Promise.resolve().then(() => __importStar(require('./config/mongodb'))).then(m => m.mongodb.getDb());
    const dbName = dbInstance.databaseName;
    const user = await db_1.db.findOne(collection, { username, is_active: true });
    if (!user) {
        return res.status(401).json({
            error: 'Invalid credentials (User not found)',
            debug: {
                receivedUsername: username,
                role,
                collection,
                dbName,
                userFound: false
            }
        });
    }
    const isValid = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!isValid) {
        return res.status(401).json({
            error: 'Invalid credentials (Password mismatch)',
            debug: {
                receivedUsername: username,
                userFound: true,
                passwordMatch: false,
                storedHashPrefix: user.password_hash?.substring(0, 10)
            }
        });
    }
    // Admins get permissions, teachers do not
    const permissions = role === 'teacher' ? null : await db_1.db.findOne(mongodb_2.Collections.PERMISSIONS, { user_id: user.id });
    res.json({ user, permissions });
}));
// Teacher login via phone (existing route, keep unchanged)
app.post('/api/auth/teacher-login', asyncHandler(async (req, res) => {
    const { phone } = req.body;
    const teacher = await db_1.db.findOne(mongodb_2.Collections.TEACHERS, {
        phone,
        is_active_login: true,
        status: 'active',
    });
    if (!teacher) {
        return res.status(401).json({ error: 'Invalid phone number or inactive account' });
    }
    res.json({ teacher });
}));
/* ==================== TRAINING JOIN ==================== */
app.post('/api/training/join', asyncHandler(async (req, res) => {
    const { teacherId, assignmentId } = req.body;
    // Verify teacher exists and is active
    const teacher = await db_1.db.findOne(mongodb_2.Collections.TEACHERS, { id: teacherId, status: 'active' });
    if (!teacher)
        return res.status(404).json({ error: 'Teacher not found' });
    // Verify assignment exists and belongs to this teacher
    const assignment = await db_1.db.findOne(mongodb_2.Collections.TRAINING_ASSIGNMENTS, {
        id: assignmentId,
        teacher_id: teacherId,
    });
    if (!assignment)
        return res.status(404).json({ error: 'Assignment not found or not assigned to this teacher' });
    // Insert attendance if not already present
    const existing = await db_1.db.findOne(mongodb_2.Collections.TRAINING_ATTENDANCE, {
        teacher_id: teacherId,
        assignment_id: assignmentId,
    });
    if (existing)
        return res.status(200).json({ message: 'Already joined', attendance: existing });
    const attendance = await db_1.db.insertOne(mongodb_2.Collections.TRAINING_ATTENDANCE, {
        teacher_id: teacherId,
        assignment_id: assignmentId,
        status: 'in_progress',
        joined_at: new Date().toISOString(),
    });
    res.status(201).json({ message: 'Joined training', attendance });
}));
/* ==================== GENERIC CRUD ==================== */
// Count documents
app.get('/api/:collection/count', asyncHandler(async (req, res) => {
    const { collection } = req.params;
    const { filter } = req.query;
    let filterObj = {};
    try {
        filterObj = filter ? JSON.parse(filter) : {};
    }
    catch {
        filterObj = {};
    }
    const count = await db_1.db.count(collection, filterObj);
    res.json({ count });
}));
// Get all documents
app.get('/api/:collection', asyncHandler(async (req, res) => {
    const { collection } = req.params;
    const { filter, sort, limit, skip } = req.query;
    const filterObj = filter ? JSON.parse(filter) : {};
    const sortObj = sort ? JSON.parse(sort) : undefined;
    const limitNum = limit ? parseInt(limit) : undefined;
    const skipNum = skip ? parseInt(skip) : undefined;
    const results = await db_1.db.find(collection, filterObj, {
        sort: sortObj,
        limit: limitNum,
        skip: skipNum,
    });
    res.json(results);
}));
// Get single document by id
app.get('/api/:collection/:id', asyncHandler(async (req, res) => {
    const { collection, id } = req.params;
    const result = await db_1.db.findById(collection, id);
    if (!result)
        return res.status(404).json({ error: 'Document not found' });
    res.json(result);
}));
// Create document
app.post('/api/:collection', asyncHandler(async (req, res) => {
    const { collection } = req.params;
    const document = req.body;
    const result = await db_1.db.insertOne(collection, document);
    res.status(201).json(result);
}));
// Bulk create
app.post('/api/:collection/bulk', asyncHandler(async (req, res) => {
    const { collection } = req.params;
    const documents = req.body;
    const results = await db_1.db.insertMany(collection, documents);
    res.status(201).json(results);
}));
// Update by id
app.put('/api/:collection/:id', asyncHandler(async (req, res) => {
    const { collection, id } = req.params;
    const updates = req.body;
    const success = await db_1.db.updateById(collection, id, updates);
    if (!success)
        return res.status(404).json({ error: 'Document not found or not updated' });
    res.json({ success: true, id });
}));
// Delete by id
app.delete('/api/:collection/:id', asyncHandler(async (req, res) => {
    const { collection, id } = req.params;
    const success = await db_1.db.deleteById(collection, id);
    if (!success)
        return res.status(404).json({ error: 'Document not found' });
    res.json({ success: true, id });
}));
// Upsert
app.post('/api/:collection/upsert', asyncHandler(async (req, res) => {
    const { collection } = req.params;
    const { filter, document } = req.body;
    const result = await db_1.db.upsert(collection, filter, document);
    res.json(result);
}));
/* ==================== DASHBOARD STATS ==================== */
app.get('/api/dashboard/stats', asyncHandler(async (req, res) => {
    const { role, assignedSchools } = req.query;
    let schoolFilter = {};
    let teacherFilter = {};
    if (role !== 'admin' && assignedSchools) {
        const schoolIds = JSON.parse(assignedSchools);
        schoolFilter = { id: { $in: schoolIds } };
        teacherFilter = { school_id: { $in: schoolIds } };
    }
    const [schools, teachers, mentors, programs, assignments] = await Promise.all([
        db_1.db.count(mongodb_2.Collections.SCHOOLS, schoolFilter),
        db_1.db.count(mongodb_2.Collections.TEACHERS, teacherFilter),
        db_1.db.count(mongodb_2.Collections.MENTOR_SCHOOLS, {}),
        db_1.db.count(mongodb_2.Collections.TRAINING_PROGRAMS, { status: 'active' }),
        db_1.db.find(mongodb_2.Collections.TRAINING_ASSIGNMENTS, {}),
    ]);
    res.json({ schools, teachers, mentors, programs, assignments });
}));
/* ==================== ERROR HANDLING ==================== */
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});
/* ==================== SERVER START (dev only) ==================== */
// In production Netlify Functions handle the request, so we keep this commented out.
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`📡 API available at http://localhost:${PORT}/api`);
// });
exports.default = app;
