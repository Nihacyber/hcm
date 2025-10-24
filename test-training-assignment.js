// Test script to verify training assignment functionality
// Run this in the browser console to test the assignment process

// Make API available globally
import * as firebaseService from './services/firebaseService.js';
window.api = firebaseService;

async function testTrainingAssignment() {
  console.log('🧪 Testing Training Assignment Process...');
  console.log('='.repeat(60));

  try {
    const api = window.api;
    
    console.log('📋 Step 1: Fetching teachers and trainings...');
    
    // Get all teachers and trainings
    const [teachers, trainings] = await Promise.all([
      api.getTeachers(),
      api.getTrainingPrograms()
    ]);
    
    console.log(`Found ${teachers.length} teachers and ${trainings.length} trainings`);
    
    if (teachers.length === 0 || trainings.length === 0) {
      console.error('❌ No teachers or trainings found. Cannot test assignment.');
      return;
    }
    
    const testTeacher = teachers[0];
    const testTraining = trainings[0];
    
    console.log(`📋 Step 2: Testing assignment of teacher "${testTeacher.firstName} ${testTeacher.lastName}" to training "${testTraining.name}"`);
    
    // Check current teacher training records
    const beforeRecords = await api.getTeacherTrainingRecords(testTeacher.id);
    console.log(`Teacher has ${beforeRecords.length} training records before assignment`);
    
    // Assign teacher to training
    try {
      await api.assignTeacherToTraining(testTeacher.id, testTraining.id);
      console.log('✅ Assignment successful');
    } catch (error) {
      if (error.message.includes('already assigned')) {
        console.log('ℹ️ Teacher already assigned to this training');
      } else {
        throw error;
      }
    }
    
    console.log('📋 Step 3: Verifying assignment...');
    
    // Check teacher training records after assignment
    const afterRecords = await api.getTeacherTrainingRecords(testTeacher.id);
    console.log(`Teacher has ${afterRecords.length} training records after assignment`);
    console.log('Training records:', afterRecords);
    
    // Check if the training appears in the records
    const assignedRecord = afterRecords.find(record => record.trainingProgramId === testTraining.id);
    
    if (assignedRecord) {
      console.log('✅ Training assignment found in teacher records');
      console.log('Assignment details:', assignedRecord);
    } else {
      console.error('❌ Training assignment NOT found in teacher records');
    }
    
    // Check if teacher appears in training's assigned teachers
    const updatedTrainings = await api.getTrainingPrograms();
    const updatedTraining = updatedTrainings.find(t => t.id === testTraining.id);
    
    if (updatedTraining && updatedTraining.assignedTeachers && updatedTraining.assignedTeachers.includes(testTeacher.id)) {
      console.log('✅ Teacher found in training\'s assigned teachers list');
    } else {
      console.error('❌ Teacher NOT found in training\'s assigned teachers list');
    }
    
    // Check teacher's training history
    const updatedTeachers = await api.getTeachers();
    const updatedTeacher = updatedTeachers.find(t => t.id === testTeacher.id);
    
    if (updatedTeacher && updatedTeacher.trainingHistory && updatedTeacher.trainingHistory.includes(testTraining.id)) {
      console.log('✅ Training found in teacher\'s training history');
    } else {
      console.error('❌ Training NOT found in teacher\'s training history');
    }
    
    console.log('🎉 Test completed!');
    
    return {
      success: true,
      teacherId: testTeacher.id,
      trainingId: testTraining.id,
      beforeRecords: beforeRecords.length,
      afterRecords: afterRecords.length,
      assignedRecord,
      inTrainingList: updatedTraining?.assignedTeachers?.includes(testTeacher.id),
      inTeacherHistory: updatedTeacher?.trainingHistory?.includes(testTraining.id)
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error.message };
  }
}

// Function to test teacher dashboard data flow
async function testTeacherDashboardData(teacherId) {
  console.log(`🧪 Testing Teacher Dashboard Data for teacher: ${teacherId}`);
  
  try {
    const api = window.api || (await import('./services/firebaseService.js')).default;
    
    // Simulate what TeacherDashboard does
    console.log('📋 Step 1: Fetching teacher data...');
    const teachers = await api.getTeachers();
    const teacher = teachers.find(t => t.id === teacherId);
    
    if (!teacher) {
      console.error('❌ Teacher not found');
      return;
    }
    
    console.log(`Found teacher: ${teacher.firstName} ${teacher.lastName}`);
    console.log('Training history:', teacher.trainingHistory);
    
    console.log('📋 Step 2: Fetching all trainings...');
    const allTrainings = await api.getTrainingPrograms();
    console.log(`Found ${allTrainings.length} total trainings`);
    
    console.log('📋 Step 3: Fetching teacher training records...');
    const trainingRecords = await api.getTeacherTrainingRecords(teacherId);
    console.log(`Found ${trainingRecords.length} training records for teacher`);
    console.log('Training records:', trainingRecords);
    
    // Check which trainings the teacher should see
    const assignedTrainings = trainingRecords.map(record => {
      const training = allTrainings.find(t => t.id === record.trainingProgramId);
      return {
        record,
        training,
        found: !!training
      };
    });
    
    console.log('📋 Step 4: Matching records with training details...');
    assignedTrainings.forEach((item, index) => {
      if (item.found) {
        console.log(`✅ Record ${index + 1}: ${item.training.name} (${item.record.status})`);
      } else {
        console.error(`❌ Record ${index + 1}: Training not found for ID ${item.record.trainingProgramId}`);
      }
    });
    
    return {
      success: true,
      teacherId,
      teacherName: `${teacher.firstName} ${teacher.lastName}`,
      trainingHistoryCount: teacher.trainingHistory?.length || 0,
      trainingRecordsCount: trainingRecords.length,
      matchedTrainings: assignedTrainings.filter(item => item.found).length,
      unmatchedRecords: assignedTrainings.filter(item => !item.found).length
    };
    
  } catch (error) {
    console.error('❌ Dashboard test failed:', error);
    return { success: false, error: error.message };
  }
}

// Export functions for use in browser console
if (typeof window !== 'undefined') {
  window.testTrainingAssignment = testTrainingAssignment;
  window.testTeacherDashboardData = testTeacherDashboardData;
}

console.log('🧪 Test functions loaded. Use:');
console.log('- testTrainingAssignment() to test assignment process');
console.log('- testTeacherDashboardData(teacherId) to test dashboard data flow');
