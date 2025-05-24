import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No admin token found. Please log in.');
      const res = await axios.get('http://localhost:5000/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to fetch users.');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`http://localhost:5000/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(users.filter(user => user._id !== userId));
      alert('User deleted successfully');
    } catch (error) {
      alert('Failed to delete user: ' + (error.response?.data?.message || error.message));
    }
  };

  const sortUsers = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    setUsers([...users].sort((a, b) => {
      const aValue = a[key] || '';
      const bValue = b[key] || '';
      if (key === 'createdAt') {
        return direction === 'asc'
          ? new Date(aValue) - new Date(bValue)
          : new Date(bValue) - new Date(aValue);
      }
      return direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lineData = {
    labels: users.map(u => u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'),
    datasets: [{
      label: 'User Growth',
      data: users.map((_, i) => i + 1),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Users</h1>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>
      <div className="bg-white p-6 rounded-lg shadow-lg transform transition hover:scale-105">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">User Growth Over Time</h2>
        <Line data={lineData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
      </div>
      {loading ? (
        <div className="text-gray-600 text-center">Loading...</div>
      ) : error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg animate-pulse">{error}</div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-gray-600 text-center">No users found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 bg-white rounded-lg shadow-lg">
            <thead className="bg-indigo-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => sortUsers('name')}>
                  Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => sortUsers('email')}>
                  Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => sortUsers('createdAt')}>
                  Joined {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user._id} className="border-t hover:bg-gray-50 transition">
                  <td className="px-6 py-4">{user.name || 'N/A'}</td>
                  <td className="px-6 py-4">{user.email || 'N/A'}</td>
                  <td className="px-6 py-4">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => deleteUser(user._id)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}