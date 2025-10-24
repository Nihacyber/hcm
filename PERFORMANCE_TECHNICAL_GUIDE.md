# Performance Optimization - Technical Guide

## 🔍 Architecture Overview

### Cache Service Architecture
```
┌─────────────────────────────────────────────────────────┐
│                   React Components                       │
│              (Teachers, Schools, Dashboard)              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Firebase Service (API Layer)                │
│  (getTeachers, getSchools, getTrainingPrograms, etc)    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Cache Service (NEW)                         │
│  - In-memory cache with TTL                             │
│  - Request deduplication                                │
│  - Cache invalidation                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Firestore Database                          │
│  (Only queried when cache misses)                       │
└─────────────────────────────────────────────────────────┘
```

---

## 📚 Cache Service API

### Core Methods

#### 1. `get<T>(key, fetchFn, ttl)`
```typescript
// Get data from cache or fetch if missing
const teachers = await cacheService.get(
  'teachers',
  async () => {
    // This function only runs if cache misses
    return await firebaseService.getTeachers();
  },
  CACHE_TTL.MEDIUM  // 5 minutes
);
```

**Parameters**:
- `key` (string): Unique cache key
- `fetchFn` (function): Async function to fetch data if cache misses
- `ttl` (number): Time to live in milliseconds

**Returns**: Cached or freshly fetched data

---

#### 2. `set<T>(key, data, ttl)`
```typescript
// Manually set cache entry
cacheService.set('teachers', teachersData, CACHE_TTL.MEDIUM);
```

---

#### 3. `invalidate(key)`
```typescript
// Clear specific cache entry
cacheService.invalidate('teachers');
```

---

#### 4. `invalidatePattern(pattern)`
```typescript
// Clear cache entries matching regex pattern
cacheService.invalidatePattern('teachers_school_.*');
```

---

#### 5. `clear()`
```typescript
// Clear all cache
cacheService.clear();
```

---

#### 6. `getStats()`
```typescript
// Get cache statistics
const stats = cacheService.getStats();
// { hits: 45, misses: 5, size: 7 }
```

---

## 🔄 Request Deduplication

### Problem
Multiple components requesting same data simultaneously = multiple queries

### Solution
```typescript
// First request
const promise1 = cacheService.get('teachers', fetchTeachers);

// Second request (while first is pending)
const promise2 = cacheService.get('teachers', fetchTeachers);

// Both return same promise - only 1 query made!
const [data1, data2] = await Promise.all([promise1, promise2]);
// data1 === data2 (same reference)
```

---

## 🎯 Cache Key Strategy

### Predefined Cache Keys
```typescript
export const CACHE_KEYS = {
  SCHOOLS: 'schools',
  TEACHERS: 'teachers',
  MENTORS: 'mentors',
  MANAGEMENT: 'management',
  TRAININGS: 'trainings',
  AUDITS: 'audits',
  TASKS: 'tasks',
  DASHBOARD_STATS: 'dashboard_stats',
  TRAINING_COMPLETION: 'training_completion',
  TEACHERS_BY_SCHOOL: (schoolId) => `teachers_school_${schoolId}`,
  MENTORS_BY_SCHOOL: (schoolId) => `mentors_school_${schoolId}`,
  MANAGEMENT_BY_SCHOOL: (schoolId) => `management_school_${schoolId}`,
};
```

### Usage
```typescript
// Use predefined keys
const teachers = await cacheService.get(
  CACHE_KEYS.TEACHERS,
  fetchTeachers,
  CACHE_TTL.MEDIUM
);

// Use dynamic keys
const schoolTeachers = await cacheService.get(
  CACHE_KEYS.TEACHERS_BY_SCHOOL('school-123'),
  () => getTeachersBySchoolId('school-123'),
  CACHE_TTL.MEDIUM
);
```

---

## ⏱️ TTL (Time To Live) Strategy

### Predefined TTL Values
```typescript
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,        // 1 minute
  MEDIUM: 5 * 60 * 1000,       // 5 minutes (default)
  LONG: 15 * 60 * 1000,        // 15 minutes
  VERY_LONG: 60 * 60 * 1000,   // 1 hour
};
```

### TTL Selection Guide
| Data Type | TTL | Reason |
|-----------|-----|--------|
| Schools | MEDIUM (5m) | Changes infrequently |
| Teachers | MEDIUM (5m) | Changes infrequently |
| Tasks | SHORT (1m) | Changes frequently |
| Dashboard Stats | MEDIUM (5m) | Aggregated data |
| Training Programs | LONG (15m) | Rarely changes |

---

## 🔧 Integration with Firebase Service

### Before (No Caching)
```typescript
export const getTeachers = async (): Promise<Teacher[]> => {
  try {
    const teachersRef = collection(db, COLLECTIONS.TEACHERS);
    const q = query(teachersRef, orderBy('firstName'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({...}));
  } catch (error) {
    throw error;
  }
};
```

### After (With Caching)
```typescript
export const getTeachers = async (): Promise<Teacher[]> => {
  return cacheService.get(
    CACHE_KEYS.TEACHERS,
    async () => {
      try {
        const teachersRef = collection(db, COLLECTIONS.TEACHERS);
        const q = query(teachersRef, orderBy('firstName'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({...}));
      } catch (error) {
        throw error;
      }
    },
    CACHE_TTL.MEDIUM
  );
};
```

---

## 🚀 Cache Invalidation Strategy

### When to Invalidate

#### After Create Operations
```typescript
const newTeacher = await api.createTeacher(teacherData);
api.invalidateTeachersCache();  // Refresh teachers list
```

#### After Update Operations
```typescript
const updated = await api.updateTeacher(teacherId, data);
api.invalidateTeachersCache();  // Refresh teachers list
```

#### After Delete Operations
```typescript
await api.deleteTeacher(teacherId);
api.invalidateTeachersCache();  // Refresh teachers list
```

#### After School Changes
```typescript
await api.updateSchool(schoolId, data);
api.invalidateSchoolsCache();   // Invalidates schools + dashboard stats
```

---

## 📊 Performance Metrics

### Query Reduction Example

**Scenario**: Load Dashboard with 10 schools

**Before Optimization**:
```
1. getDashboardStats()
   ├─ getSchools()
   │  ├─ Query 1: Fetch all schools
   │  └─ For each school (10 schools):
   │     ├─ Query 2-4: getTeachersBySchoolId()
   │     ├─ Query 5-7: getMentorsBySchoolId()
   │     └─ Query 8-10: getManagementBySchoolId()
   ├─ getTeachers()
   │  └─ Query 11: Fetch all teachers
   └─ getTrainingPrograms()
      └─ Query 12: Fetch all trainings

Total: 31 queries
Time: 5-10 seconds
```

**After Optimization**:
```
1. getDashboardStats() [CACHED]
   ├─ getSchools() [CACHED]
   │  ├─ Query 1: Fetch all schools
   │  └─ Promise.all() for all schools:
   │     ├─ Query 2: getTeachersBySchoolId() [parallel]
   │     ├─ Query 3: getMentorsBySchoolId() [parallel]
   │     └─ Query 4: getManagementBySchoolId() [parallel]
   ├─ getTeachers() [CACHED]
   │  └─ Query 5: Fetch all teachers
   └─ getTrainingPrograms() [CACHED]
      └─ Query 6: Fetch all trainings

Total: 6 queries (first load)
Time: 1-2 seconds

Subsequent loads: 0 queries (all cached)
Time: 0.1-0.2 seconds
```

---

## 🐛 Debugging Cache Issues

### Enable Console Logging
```javascript
// All cache operations are logged to console
// Open DevTools Console (F12) to see:
[Cache HIT] teachers
[Cache MISS] schools - fetching from source
[Cache SET] trainings (TTL: 300000ms)
[Cache INVALIDATE] teachers
```

### Check Cache State
```javascript
// In browser console
import { cacheService } from './services/cacheService';

// View all cache entries
cacheService.getStats();

// Check if specific key is cached
cacheService.has('teachers');  // true/false

// Get cache size
cacheService.getSize();  // number of entries
```

### Clear Cache Manually
```javascript
// Clear specific entry
cacheService.invalidate('teachers');

// Clear by pattern
cacheService.invalidatePattern('teachers_school_.*');

// Clear all
cacheService.clear();
```

---

## ⚠️ Common Pitfalls

### 1. Forgetting to Invalidate Cache
```typescript
// ❌ WRONG - Cache not invalidated
await api.createTeacher(teacherData);
// Teachers list still shows old data

// ✅ CORRECT - Cache invalidated
await api.createTeacher(teacherData);
api.invalidateTeachersCache();
```

### 2. Using Wrong TTL
```typescript
// ❌ WRONG - Too short TTL for stable data
cacheService.set('schools', data, CACHE_TTL.SHORT);  // 1 minute

// ✅ CORRECT - Appropriate TTL
cacheService.set('schools', data, CACHE_TTL.MEDIUM);  // 5 minutes
```

### 3. Not Handling Cache Misses
```typescript
// ❌ WRONG - No error handling
const data = await cacheService.get('key', fetchFn);

// ✅ CORRECT - With error handling
try {
  const data = await cacheService.get('key', fetchFn);
} catch (error) {
  console.error('Failed to fetch data:', error);
}
```

---

## 📈 Monitoring and Optimization

### Cache Hit Rate Target
- **Good**: > 70% hit rate
- **Excellent**: > 85% hit rate
- **Outstanding**: > 90% hit rate

### Monitor in Production
```javascript
// Periodically check cache stats
setInterval(() => {
  const stats = cacheService.getStats();
  console.log(`Cache Hit Rate: ${(stats.hits / (stats.hits + stats.misses) * 100).toFixed(2)}%`);
}, 60000);  // Every minute
```

---

**Last Updated**: 2025-10-23
**Status**: ✅ Production Ready

