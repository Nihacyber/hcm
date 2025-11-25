import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { TrainingProgram, User, Permission, TrainingAttendance, Teacher, School, SchoolAssignment, TrainingAssignment } from '../lib/models';
import { Calendar, Users, FileText, Download, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  currentUser: User;
  currentPermissions: Permission;
}

interface DailyAttendance {
  attendance_date: string;
  training_program_id: string;
  training_program_name: string;
  total_assigned: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_percentage: number;
}

interface TeacherAttendanceDetail {
  teacher_name: string;
  teacher_email: string;
  school_name: string;
  status: string;
  notes: string;
}

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DailyAttendanceReport({ currentUser, currentPermissions }: Props) {
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [selectedProgram, setSelectedProgram] = useState<string>('all');
  const [dailyReports, setDailyReports] = useState<DailyAttendance[]>([]);
  const [teacherDetails, setTeacherDetails] = useState<TeacherAttendanceDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const canViewReports = currentUser.role === 'admin' || currentUser.role === 'employee' || currentPermissions.can_view_reports;

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadDailyReport();
    }
  }, [selectedDate, selectedProgram]);

  const loadPrograms = async () => {
    const data = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {}, { sort: { title: 1 } });
    if (data) setPrograms(data);
  };

  const loadDailyReport = async () => {
    setLoading(true);

    try {
      let assignedSchoolIds: string[] = [];

      if (currentUser.role !== 'admin') {
        const userAssignments = await db.find<SchoolAssignment>(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });
        assignedSchoolIds = userAssignments?.map(a => a.school_id) || [];
      }

      const attendanceFilter: any = { attendance_date: selectedDate };
      if (selectedProgram !== 'all') {
        attendanceFilter.training_program_id = selectedProgram;
      }

      const attendanceData = await db.find<TrainingAttendance>(Collections.TRAINING_ATTENDANCE, attendanceFilter);

      if (attendanceData) {
        // Fetch related data for manual joining
        const teacherIds = attendanceData.map(a => a.teacher_id);
        const teachers = await db.find<Teacher>(Collections.TEACHERS, {}); // Fetch all for now
        const schools = await db.find<School>(Collections.SCHOOLS, {});
        const programs = await db.find<TrainingProgram>(Collections.TRAINING_PROGRAMS, {});

        const filteredAttendance = currentUser.role === 'admin'
          ? attendanceData
          : attendanceData.filter((a) => {
            const teacher = teachers.find(t => t.id === a.teacher_id);
            if (!teacher) return false;
            return teacher.school_id && assignedSchoolIds.includes(teacher.school_id);
          });

        const programMap = new Map<string, DailyAttendance>();

        for (const record of filteredAttendance) {
          const program = programs.find(p => p.id === record.training_program_id);
          const programId = record.training_program_id;
          const programName = program?.title || 'Unknown Program';

          if (!programMap.has(programId)) {
            const assignments = await db.find<TrainingAssignment>(Collections.TRAINING_ASSIGNMENTS, { training_program_id: programId });

            let totalAssigned = 0;

            if (assignments) {
              if (currentUser.role === 'admin') {
                totalAssigned = assignments.length;
              } else {
                totalAssigned = assignments.filter((a) => {
                  const teacher = teachers.find(t => t.id === a.teacher_id);
                  return teacher && teacher.school_id && assignedSchoolIds.includes(teacher.school_id);
                }).length;
              }
            }

            programMap.set(programId, {
              attendance_date: selectedDate,
              training_program_id: programId,
              training_program_name: programName,
              total_assigned: totalAssigned,
              present: 0,
              absent: 0,
              late: 0,
              excused: 0,
              attendance_percentage: 0,
            });
          }

          const report = programMap.get(programId)!;

          switch (record.status) {
            case 'present':
              report.present++;
              break;
            case 'absent':
              report.absent++;
              break;
            case 'late':
              report.late++;
              break;
            case 'excused':
              report.excused++;
              break;
          }
        }

        programMap.forEach((report) => {
          report.attendance_percentage = report.total_assigned > 0
            ? Math.round((report.present / report.total_assigned) * 100)
            : 0;
        });

        setDailyReports(Array.from(programMap.values()));

        const details: TeacherAttendanceDetail[] = filteredAttendance.map((record) => {
          const teacher = teachers.find(t => t.id === record.teacher_id);
          const school = teacher ? schools.find(s => s.id === teacher.school_id) : undefined;

          return {
            teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown',
            teacher_email: teacher?.email || '',
            school_name: school?.name || 'Unknown',
            status: record.status,
            notes: record.notes || '',
          };
        });

        setTeacherDetails(details);
      }
    } catch (error) {
      console.error('Error loading daily report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    let csvContent = `Daily Attendance Report - ${selectedDate}\n\n`;

    csvContent += 'Program,Total Assigned,Present,Absent,Late,Excused,Attendance %\n';

    dailyReports.forEach(report => {
      csvContent += `"${report.training_program_name}",${report.total_assigned},${report.present},${report.absent},${report.late},${report.excused},${report.attendance_percentage}%\n`;
    });

    if (showDetails && teacherDetails.length > 0) {
      csvContent += '\n\nTeacher Details\n';
      csvContent += 'Teacher Name,Email,School,Status,Notes\n';

      teacherDetails.forEach(detail => {
        csvContent += `"${detail.teacher_name}","${detail.teacher_email}","${detail.school_name}","${detail.status}","${detail.notes}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Daily Training Attendance Report', 14, 20);

    doc.setFontSize(12);
    doc.text(`Date: ${selectedDate}`, 14, 30);

    const summaryData = dailyReports.map(report => [
      report.training_program_name,
      report.total_assigned.toString(),
      report.present.toString(),
      report.absent.toString(),
      report.late.toString(),
      report.excused.toString(),
      `${report.attendance_percentage}%`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Program', 'Total', 'Present', 'Absent', 'Late', 'Excused', 'Rate']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 }
    });

    if (showDetails && teacherDetails.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 40;

      doc.setFontSize(14);
      doc.text('Teacher Details', 14, finalY + 15);

      const detailsData = teacherDetails.map(detail => [
        detail.teacher_name,
        detail.teacher_email,
        detail.school_name,
        detail.status,
        detail.notes || '-'
      ]);

      autoTable(doc, {
        startY: finalY + 20,
        head: [['Teacher Name', 'Email', 'School', 'Status', 'Notes']],
        body: detailsData,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 45 },
          2: { cellWidth: 35 },
          3: { cellWidth: 20 },
          4: { cellWidth: 45 }
        }
      });
    }

    doc.save(`attendance_report_${selectedDate}.pdf`);
  };

  if (!canViewReports) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">You don't have permission to view reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-8 h-8 text-blue-600" />
          Daily Training Attendance Report
        </h2>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Training Program</label>
            <select
              value={selectedProgram}
              onChange={(e) => {
                console.log('Program selected:', e.target.value);
                setSelectedProgram(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
            >
              <option value="all">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.title}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={exportToPDF}
              disabled={dailyReports.length === 0}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={exportToCSV}
              disabled={dailyReports.length === 0}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading report...</p>
          </div>
        ) : dailyReports.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No attendance records found for this date.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {dailyReports.map((report) => (
                <div key={report.training_program_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{report.training_program_name}</h3>
                      <p className="text-sm text-gray-600">Total Teachers Assigned: {report.total_assigned}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{report.attendance_percentage}%</div>
                      <div className="text-xs text-gray-600">Attendance Rate</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-700">{report.present}</div>
                      <div className="text-xs text-green-600">Present</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-red-700">{report.absent}</div>
                      <div className="text-xs text-red-600">Absent</div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-yellow-700">{report.late}</div>
                      <div className="text-xs text-yellow-600">Late</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-700">{report.excused}</div>
                      <div className="text-xs text-blue-600">Excused</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t pt-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                {showDetails ? 'Hide' : 'Show'} Teacher Details
              </button>

              {showDetails && teacherDetails.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {teacherDetails.map((detail, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{detail.teacher_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{detail.teacher_email}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{detail.school_name}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full
                              ${detail.status === 'present' ? 'bg-green-100 text-green-800' :
                                detail.status === 'absent' ? 'bg-red-100 text-red-800' :
                                  detail.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'}`}>
                              {detail.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{detail.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
