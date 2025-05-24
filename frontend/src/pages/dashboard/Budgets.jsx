import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useDebounce } from 'use-debounce';
import { Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

export default function Budgets() {
  const [state, setState] = useState({
    budgets: [],
    loading: true,
    error: null,
    searchQuery: '',
    deletingIds: [],
    deletingAllEmails: [],
    expandedEmail: null,
  });
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [debouncedSearchQuery] = useDebounce(state.searchQuery, 300);

  const loadBudgets = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No admin token found. Please log in.');
      const response = await axios.get('http://localhost:5000/admin/budgets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setState(prev => ({ ...prev, budgets: Array.isArray(response.data) ? response.data : [], loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'Failed to fetch budgets.',
      }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) return;
    setState(prev => ({ ...prev, deletingIds: [...prev.deletingIds, id] }));
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`http://localhost:5000/admin/budgets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setState(prev => ({
        ...prev,
        budgets: prev.budgets.filter(b => b._id !== id),
        deletingIds: prev.deletingIds.filter(dId => dId !== id),
      }));
      alert('Budget deleted successfully');
    } catch (error) {
      alert('Failed to delete budget: ' + (error.response?.data?.message || error.message));
      setState(prev => ({
        ...prev,
        deletingIds: prev.deletingIds.filter(dId => dId !== id),
      }));
    }
  };

  const handleDeleteAll = async (email) => {
    if (!window.confirm(`Are you sure you want to delete all budgets for ${email}?`)) return;
    setState(prev => ({ ...prev, deletingAllEmails: [...prev.deletingAllEmails, email] }));
    try {
      const token = localStorage.getItem('adminToken');
      const userBudgets = state.budgets.filter(b => b.user?.email === email);
      for (const budget of userBudgets) {
        await axios.delete(`http://localhost:5000/admin/budgets/${budget._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setState(prev => ({
        ...prev,
        budgets: prev.budgets.filter(b => b.user?.email !== email),
        deletingAllEmails: prev.deletingAllEmails.filter(e => e !== email),
        expandedEmail: prev.expandedEmail === email ? null : prev.expandedEmail,
      }));
      alert(`All budgets for ${email} deleted successfully`);
    } catch (error) {
      alert('Failed to delete budgets: ' + (error.response?.data?.message || error.message));
      setState(prev => ({
        ...prev,
        deletingAllEmails: prev.deletingAllEmails.filter(e => e !== email),
      }));
    }
  };

  const sortUsers = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    loadBudgets();
  }, []);

  const users = Object.values(
    state.budgets.reduce((acc, budget) => {
      const email = budget.user?.email ?? 'Unknown';
      if (!acc[email]) {
        acc[email] = {
          name: budget.user?.name ?? 'Unknown',
          email,
          createdAt: budget.createdAt,
          budgets: [],
          totalBudget: 0,
        };
      }
      acc[email].budgets.push(budget);
      acc[email].totalBudget += budget.amount || 0;
      if (!acc[email].createdAt || budget.createdAt < acc[email].createdAt) acc[email].createdAt = budget.createdAt;
      return acc;
    }, {})
  ).filter(user =>
    user.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    user.totalBudget.toString().includes(debouncedSearchQuery.toLowerCase())
  ).sort((a, b) => {
    const aValue = a[sortConfig.key] || '';
    const bValue = b[sortConfig.key] || '';
    if (sortConfig.key === 'createdAt') {
      return sortConfig.direction === 'asc'
        ? new Date(aValue) - new Date(bValue)
        : new Date(bValue) - new Date(aValue);
    }
    if (sortConfig.key === 'totalBudget') {
      return sortConfig.direction === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    }
    return sortConfig.direction === 'asc'
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
  });

  const getUserDetails = (email) => {
    const filteredBudgets = state.budgets
      .filter(budget => budget.user?.email === email)
      .sort((a, b) => {
        if (sortConfig.key === 'category') {
          return sortConfig.direction === 'asc'
            ? (a.category || '').localeCompare(b.category || '')
            : (b.category || '').localeCompare(a.category || '');
        }
        if (sortConfig.key === 'period') {
          return sortConfig.direction === 'asc'
            ? (a.period || '').localeCompare(b.period || '')
            : (b.period || '').localeCompare(a.period || '');
        }
        if (sortConfig.key === 'amount') {
          return sortConfig.direction === 'asc'
            ? (a.amount || 0) - (b.amount || 0)
            : (b.amount || 0) - (a.amount || 0);
        }
        if (sortConfig.key === 'createdAt') {
          return sortConfig.direction === 'asc'
            ? new Date(a.createdAt) - new Date(b.createdAt)
            : new Date(b.createdAt) - new Date(a.createdAt);
        }
        return 0;
      });
    return { budgets: filteredBudgets };
  };

  const categoryData = {
    labels: [...new Set(state.budgets.map(b => b.category || 'Unknown'))],
    datasets: [{
      data: [...new Set(state.budgets.map(b => b.category || 'Unknown'))].map(
        cat => state.budgets.filter(b => b.category === cat).reduce((sum, b) => sum + (b.amount || 0), 0)
      ),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      borderColor: '#ffffff',
      borderWidth: 2,
    }],
  };

  const areaData = {
    labels: [...new Set(state.budgets.map(b => new Date(b.createdAt).toLocaleDateString()))].sort((a, b) => new Date(a) - new Date(b)),
    datasets: [...new Set(state.budgets.map(b => b.category || 'Unknown'))].map((cat, index) => ({
      label: cat,
      data: [...new Set(state.budgets.map(b => new Date(b.createdAt).toLocaleDateString()))]
        .sort((a, b) => new Date(a) - new Date(b))
        .map(date => state.budgets
          .filter(b => b.category === cat && new Date(b.createdAt).toLocaleDateString() === date)
          .reduce((sum, b) => sum + (b.amount || 0), 0)
        ),
      backgroundColor: `rgba(${[59, 130, 246, 0.2][index % 3]}, ${[1, 0.8, 0.6][index % 3]})`,
      borderColor: `rgba(${[59, 130, 246][index % 3]}, 1)`,
      fill: true,
      tension: 0.4,
    })),
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Budgets</h1>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or total budget..."
          value={state.searchQuery}
          onChange={e => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
          className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-lg transform transition hover:scale-105">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Budget Categories</h2>
          <Doughnut data={categoryData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg transform transition hover:scale-105">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Budget Trends by Category</h2>
          <Line data={areaData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } }, scales: { y: { stacked: true } } }} />
        </div>
      </div>
      {state.loading ? (
        <div className="text-gray-600 text-center">Loading...</div>
      ) : state.error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg animate-pulse">{error}</div>
      ) : users.length === 0 ? (
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
                  Date Created {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => sortUsers('totalBudget')}>
                  Total Budget {sortConfig.key === 'totalBudget' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <React.Fragment key={user.email}>
                  <tr className="border-t hover:bg-gray-50 transition">
                    <td className="px-6 py-4">{user.name}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4">₹{user.totalBudget.toFixed(2)}</td>
                    <td className="px-6 py-4 flex gap-2">
                      <button
                        onClick={() =>
                          setState(prev => ({
                            ...prev,
                            expandedEmail: prev.expandedEmail === user.email ? null : user.email,
                            searchQuery: '',
                          }))
                        }
                        className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition"
                      >
                        {state.expandedEmail === user.email ? 'Collapse' : 'Expand'}
                      </button>
                      <button
                        onClick={() => handleDeleteAll(user.email)}
                        disabled={state.deletingAllEmails.includes(user.email)}
                        className={`bg-red-500 text-white px-4 py-2 rounded-lg transition ${
                          state.deletingAllEmails.includes(user.email) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'
                        }`}
                      >
                        {state.deletingAllEmails.includes(user.email) ? 'Deleting...' : 'Delete All'}
                      </button>
                    </td>
                  </tr>
                  {state.expandedEmail === user.email && (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 bg-gray-50">
                        <div className="p-4">
                          <h3 className="text-lg font-semibold text-gray-700 mb-4">Budgets</h3>
                          {getUserDetails(user.email).budgets.length === 0 ? (
                            <div className="text-gray-600">No budgets found.</div>
                          ) : (
                            <table className="min-w-full border border-gray-200 bg-white rounded-lg">
                              <thead className="bg-indigo-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => sortUsers('category')}>
                                    Category {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => sortUsers('period')}>
                                    Period {sortConfig.key === 'period' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => sortUsers('amount')}>
                                    Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => sortUsers('createdAt')}>
                                    Created At {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getUserDetails(user.email).budgets.map(budget => (
                                  <tr key={budget._id} className="border-t hover:bg-gray-50 transition">
                                    <td className="px-4 py-2">{budget.category ?? 'N/A'}</td>
                                    <td className="px-4 py-2">{budget.period ?? 'N/A'}</td>
                                    <td className="px-4 py-2">₹{budget.amount?.toFixed(2) ?? 'N/A'}</td>
                                    <td className="px-4 py-2">{budget.createdAt ? new Date(budget.createdAt).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-4 py-2">
                                      <button
                                        onClick={() => handleDelete(budget._id)}
                                        disabled={state.deletingIds.includes(budget._id)}
                                        className={`bg-red-500 text-white px-4 py-2 rounded-lg transition ${
                                          state.deletingIds.includes(budget._id) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'
                                        }`}
                                      >
                                        {state.deletingIds.includes(budget._id) ? 'Deleting...' : 'Delete'}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}