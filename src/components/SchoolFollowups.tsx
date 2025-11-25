import { useState, useEffect } from 'react';
import { School, User, Permission, SchoolFollowup } from '../lib/models';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Calendar, Clock, Plus, MessageSquare, Building2, ArrowRight } from 'lucide-react';

interface Props {
  currentUser: User;
  currentPermissions: Permission;
}

type SchoolWithFollowup = School & {
  latestFollowup?: SchoolFollowup;
  needsFollowup: boolean;
};

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function SchoolFollowups({ currentUser }: Props) {
  const [schools, setSchools] = useState<SchoolWithFollowup[]>([]);
  const [followups, setFollowups] = useState<(SchoolFollowup & { school: School; employee: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'history'>('today');
  const [formData, setFormData] = useState({
    comments: '',
    next_followup_date: '',
  });

  useEffect(() => {
    loadData();
  }, [currentUser.id, activeTab]);

  const loadData = async () => {
    setLoading(true);

    // Get assigned schools
    const assignedSchools = await db.find<any>(Collections.SCHOOL_ASSIGNMENTS, { employee_id: currentUser.id });

    if (!assignedSchools || assignedSchools.length === 0) {
      setSchools([]);
      setFollowups([]);
      setLoading(false);
      return;
    }

    const schoolIds = assignedSchools.map(a => a.school_id);

    // Get schools details
    // Note: MongoDB find with $in equivalent
    // Since our simple db service might not support $in directly in the find interface efficiently without a custom query,
    // we might need to fetch all schools and filter, or fetch individually.
    // For now, let's assume we can fetch all and filter in memory if the dataset is small,
    // or better, let's use a loop if we don't have a bulk fetch by ID list exposed yet.
    // Actually, let's just fetch all schools for now as a safe fallback or use a custom query if supported.
    // Given the current db service, let's fetch all schools and filter.
    const allSchools = await db.find<School>(Collections.SCHOOLS, {}, { sort: { name: 1 } });
    const schoolsData = allSchools.filter(s => schoolIds.includes(s.id));

    if (schoolsData) {
      const today = getLocalDate();

      const schoolsWithFollowups = await Promise.all(
        schoolsData.map(async (school) => {
          const latestFollowupList = await db.find<SchoolFollowup>(
            Collections.SCHOOL_FOLLOWUPS,
            { school_id: school.id, employee_id: currentUser.id },
            { sort: { followup_date: -1 }, limit: 1 }
          );
          const latestFollowup = latestFollowupList[0];

          const needsFollowup = latestFollowup?.next_followup_date
            ? latestFollowup.next_followup_date <= today
            : true;

          return {
            ...school,
            latestFollowup,
            needsFollowup,
          };
        })
      );

      if (activeTab === 'today') {
        setSchools(schoolsWithFollowups.filter(s => s.needsFollowup));
      } else if (activeTab === 'upcoming') {
        setSchools(schoolsWithFollowups.filter(s =>
          s.latestFollowup?.next_followup_date && s.latestFollowup.next_followup_date > today
        ));
      } else {
        setSchools(schoolsWithFollowups);
      }
    }

    if (activeTab === 'history') {
      const followupsData = await db.find<SchoolFollowup>(
        Collections.SCHOOL_FOLLOWUPS,
        { employee_id: currentUser.id },
        { sort: { followup_date: -1 }, limit: 50 }
      );

      if (followupsData) {
        // Manually join school and employee data
        const followupsWithDetails = await Promise.all(followupsData.map(async (f) => {
          const school = await db.findById<School>(Collections.SCHOOLS, f.school_id);
          const employee = await db.findById<User>(Collections.USERS, f.employee_id);
          return {
            ...f,
            school: school!,
            employee: employee!
          };
        }));
        setFollowups(followupsWithDetails as any);
      }
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchool) return;

    try {
      await db.insertOne(Collections.SCHOOL_FOLLOWUPS, {
        school_id: selectedSchool.id,
        employee_id: currentUser.id,
        followup_date: getLocalDate(),
        comments: formData.comments,
        next_followup_date: formData.next_followup_date || null,
        status: 'completed',
        created_at: new Date().toISOString(),
      });

      setShowAddModal(false);
      setSelectedSchool(null);
      setFormData({ comments: '', next_followup_date: '' });
      loadData();
    } catch (error: any) {
      console.error('Error creating followup:', error);
      alert('Failed to create followup: ' + error.message);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    const target = new Date(dateString);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">School Followups</h2>
          <p className="text-gray-600 mt-1">Track and manage your school visits</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'today'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Today's Followups
          {schools.filter(s => s.needsFollowup).length > 0 && activeTab !== 'today' && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {schools.filter(s => s.needsFollowup).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'upcoming'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'history'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          History
        </button>
      </div>

      {activeTab === 'history' ? (
        <div className="space-y-4">
          {followups.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <MessageSquare className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">No followup history found</p>
            </div>
          ) : (
            followups.map((followup) => (
              <div key={followup.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Building2 className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{followup.school?.name || 'Unknown School'}</h3>
                      <p className="text-sm text-gray-500">Code: {followup.school?.code || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatDate(followup.followup_date)}</p>
                    {followup.next_followup_date && (
                      <p className="text-xs text-gray-500 flex items-center gap-1 justify-end mt-1">
                        <ArrowRight size={12} />
                        Next: {formatDate(followup.next_followup_date)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700">{followup.comments || 'No comments'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
              <Calendar className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600">
                {activeTab === 'today'
                  ? 'No schools need followup today'
                  : 'No upcoming followups scheduled'}
              </p>
            </div>
          ) : (
            schools.map((school) => (
              <div key={school.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Building2 className="text-blue-600" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-gray-900 truncate">{school.name}</h3>
                      <p className="text-xs text-gray-500">Code: {school.code}</p>
                    </div>
                  </div>
                </div>

                {school.latestFollowup && (
                  <div className="mb-3 space-y-1">
                    <p className="text-xs text-gray-500">Last visit: {formatDate(school.latestFollowup.followup_date)}</p>
                    {school.latestFollowup.next_followup_date && (
                      <div className="flex items-center gap-1 text-xs">
                        <Clock size={12} className="text-gray-400" />
                        <span className={`font-medium ${school.needsFollowup ? 'text-red-600' : 'text-gray-600'
                          }`}>
                          {school.needsFollowup
                            ? 'Followup needed!'
                            : `In ${getDaysUntil(school.latestFollowup.next_followup_date)} days`}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => {
                    setSelectedSchool(school);
                    setShowAddModal(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus size={16} />
                  Add Followup
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {showAddModal && selectedSchool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold mb-4">Add Followup for {selectedSchool.name}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Followup Date
                </label>
                <input
                  type="text"
                  value={new Date().toLocaleDateString()}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments / Notes *
                </label>
                <textarea
                  required
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  rows={4}
                  placeholder="Enter your observations, notes, and any important information from this visit..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Followup Date
                </label>
                <input
                  type="date"
                  value={formData.next_followup_date}
                  onChange={(e) => setFormData({ ...formData, next_followup_date: e.target.value })}
                  min={getLocalDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Set when you need to follow up with this school next
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedSchool(null);
                    setFormData({ comments: '', next_followup_date: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Followup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
