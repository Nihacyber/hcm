import { useState, useEffect } from 'react';
import { db } from '../lib/services/db';
import { Collections } from '../lib/constants';
import { Smartphone, Monitor, Tablet, Shield, ShieldOff, Clock, RefreshCw } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';

interface Device {
  id: string;
  user_id: string;
  device_id: string;
  device_model: string;
  device_type: string;
  browser: string;
  os: string;
  ip_address: string;
  is_blocked: boolean;
  first_login: string;
  last_login: string;
  last_location: string | null;
  user?: {
    full_name: string;
    username: string;
    role: string;
  };
}

export default function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [users, setUsers] = useState<any[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
  });

  useEffect(() => {
    loadUsers();
    loadDevices();
  }, []);

  useEffect(() => {
    loadDevices();
  }, [filterUser, filterStatus]);

  const loadUsers = async () => {
    const data = await db.find(Collections.USERS, {}, { sort: { full_name: 1 } });
    setUsers(data.map(u => ({ id: u.id, full_name: u.full_name, username: u.username, role: u.role })));
  };

  const loadDevices = async () => {
    setLoading(true);

    try {
      // Build filter
      let filter: any = {};
      if (filterUser !== 'all') {
        filter.user_id = filterUser;
      }
      if (filterStatus === 'blocked') {
        filter.is_blocked = true;
      } else if (filterStatus === 'active') {
        filter.is_blocked = false;
      }

      const devicesData = await db.find(Collections.USER_DEVICES, filter, { sort: { last_login: -1 } });

      // Load users for devices
      const allUsers = await db.find(Collections.USERS, {});

      const devicesWithUser = devicesData.map((device: any) => ({
        ...device,
        user: allUsers.find(u => u.id === device.user_id)
      }));

      setDevices(devicesWithUser);
    } catch (error) {
      console.error('Error loading devices:', error);
    }

    setLoading(false);
  };

  const handleBlockDevice = (device: Device) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Block Device',
      message: `Are you sure you want to block this device? ${device.user?.full_name} will not be able to login from this device until it is unblocked.`,
      onConfirm: async () => {
        await toggleDeviceStatus(device.id, true);
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  const handleUnblockDevice = (device: Device) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Unblock Device',
      message: `Are you sure you want to unblock this device? ${device.user?.full_name} will be able to login from this device.`,
      onConfirm: async () => {
        await toggleDeviceStatus(device.id, false);
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  const toggleDeviceStatus = async (deviceId: string, blocked: boolean) => {
    try {
      await db.updateById(Collections.USER_DEVICES, deviceId, {
        is_blocked: blocked,
        updated_at: new Date().toISOString()
      });
      loadDevices();
    } catch (error) {
      console.error('Error updating device status:', error);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="text-blue-600" size={20} />;
      case 'tablet':
        return <Tablet className="text-green-600" size={20} />;
      default:
        return <Monitor className="text-gray-600" size={20} />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Shield className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Device Management</h3>
              <p className="text-sm text-gray-600">Monitor and control employee device access</p>
            </div>
          </div>

          <button
            onClick={loadDevices}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by User</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Devices</option>
              <option value="active">Active Only</option>
              <option value="blocked">Blocked Only</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading devices...</div>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Shield size={48} className="mx-auto mb-4 opacity-50" />
            <p>No devices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Browser/OS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {devices.map((device) => (
                  <tr key={device.id} className={device.is_blocked ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{device.user?.full_name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{device.user?.username}</div>
                        <div className="text-xs text-gray-400 capitalize">{device.user?.role}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(device.device_type)}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{device.device_model}</div>
                          <div className="text-xs text-gray-500 capitalize">{device.device_type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{device.browser}</div>
                      <div className="text-xs text-gray-500">{device.os}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock size={14} />
                        <span>{formatDate(device.first_login)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock size={14} />
                        <span>{formatDate(device.last_login)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {device.is_blocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          <ShieldOff size={14} />
                          Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          <Shield size={14} />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {device.is_blocked ? (
                        <button
                          onClick={() => handleUnblockDevice(device)}
                          className="text-green-600 hover:text-green-800 font-medium text-sm"
                        >
                          Unblock
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBlockDevice(device)}
                          className="text-red-600 hover:text-red-800 font-medium text-sm"
                        >
                          Block
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}
