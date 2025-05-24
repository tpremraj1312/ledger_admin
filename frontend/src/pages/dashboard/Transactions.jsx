import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useDebounce } from 'use-debounce';
import { Pie, Line } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

export default function Transactions() {
  const [state, setState] = useState({
    transactions: [],
    loading: true,
    error: null,
    searchQuery: '',
    deletingIds: [],
    deletingAllEmails: [],
    expandedEmail: null,
  });
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [debouncedSearchQuery] = useDebounce(state.searchQuery, 300);

  const loadTransactions = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('No admin token found. Please log in.');
      const response = await axios.get('http://localhost:5000/admin/transactions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setState(prev => ({ ...prev, transactions: Array.isArray(response.data) ? response.data : [], loading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.response?.data?.message || 'Failed to fetch transactions.',
      }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    setState(prev => ({ ...prev, deletingIds: [...prev.deletingIds, id] }));
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`http://localhost:5000/admin/transactions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setState(prev => ({
        ...prev,
        transactions: prev.transactions.filter(t => t._id !== id),
        deletingIds: prev.deletingIds.filter(dId => dId !== id),
      }));
      alert('Transaction deleted successfully');
    } catch (error) {
      alert('Failed to delete transaction: ' + (error.response?.data?.message || error.message));
      setState(prev => ({
        ...prev,
        deletingIds: prev.deletingIds.filter(dId => dId !== id),
      }));
    }
  };

  const handleDeleteAll = async (email) => {
    if (!window.confirm(`Are you sure you want to delete all transactions for ${email}?`)) return;
    setState(prev => ({ ...prev, deletingAllEmails: [...prev.deletingAllEmails, email] }));
    try {
      const token = localStorage.getItem('adminToken');
      const userTransactions = state.transactions.filter(txn => txn.user?.email === email);
      for (const txn of userTransactions) {
        await axios.delete(`http://localhost:5000/admin/transactions/${txn._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setState(prev => ({
        ...prev,
        transactions: prev.transactions.filter(txn => txn.user?.email !== email),
        deletingAllEmails: prev.deletingAllEmails.filter(e => e !== email),
        expandedEmail: prev.expandedEmail === email ? null : prev.expandedEmail,
      }));
      alert(`All transactions for ${email} deleted successfully`);
    } catch (error) {
      alert('Failed to delete transactions: ' + (error.response?.data?.message || error.message));
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
    loadTransactions();
  }, []);

  const users = Object.values(
    state.transactions.reduce((acc, txn) => {
      const email = txn.user?.email ?? 'Unknown';
      if (!acc[email]) {
        acc[email] = {
          name: txn.user?.name ?? 'Unknown',
          email,
          createdAt: txn.createdAt,
          transactions: [],
          totalExpenses: 0,
        };
      }
      acc[email].transactions.push(txn);
      acc[email].totalExpenses += txn.amount || 0;
      if (!acc[email].createdAt || txn.createdAt < acc[email].createdAt) acc[email].createdAt = txn.createdAt;
      return acc;
    }, {})
  ).filter(user =>
    user.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    user.totalExpenses.toString().includes(debouncedSearchQuery.toLowerCase())
  ).sort((a, b) => {
    const aValue = a[sortConfig.key] || '';
    const bValue = b[sortConfig.key] || '';
    if (sortConfig.key === 'createdAt') {
      return sortConfig.direction === 'asc'
        ? new Date(aValue) - new Date(bValue)
        : new Date(bValue) - new Date(aValue);
    }
    if (sortConfig.key === 'totalExpenses') {
      return sortConfig.direction === 'asc'
        ? aValue - bValue
        : bValue - aValue;
    }
    return sortConfig.direction === 'asc'
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
  });

  const getUserDetails = (email) => {
    const filteredTransactions = state.transactions
      .filter(txn => txn.user?.email === email)
      .sort((a, b) => {
        if (sortConfig.key === 'category') {
          return sortConfig.direction === 'asc'
            ? (a.category || '').localeCompare(b.category || '')
            : (b.category || '').localeCompare(a.category || '');
        }
        if (sortConfig.key === 'amount') {
          return sortConfig.direction === 'asc'
            ? (a.amount || 0) - (b.amount || 0)
            : (b.amount || 0) - (a.amount || 0);
        }
        if (sortConfig.key === 'date') {
          return sortConfig.direction === 'asc'
            ? new Date(a.date) - new Date(b.date)
            : new Date(b.date) - new Date(a.date);
        }
        return 0;
      });
    return { transactions: filteredTransactions };
  };

  const categoryData = {
    labels: [...new Set(state.transactions.map(t => t.category || 'Unknown'))],
    datasets: [{
      data: [...new Set(state.transactions.map(t => t.category || 'Unknown'))].map(
        cat => state.transactions.filter(t => t.category === cat).reduce((sum, t) => sum + (t.amount || 0), 0)
      ),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      borderColor: '#ffffff',
      borderWidth: 2,
    }],
  };

  const trendData = {
    labels: [...new Set(state.transactions.map(t => new Date(t.date).toLocaleDateString()))].sort((a, b) => new Date(a) - new Date(b)),
    datasets: [{
      label: 'Transaction Amounts Over Time',
      data: [...new Set(state.transactions.map(t => new Date(t.date).toLocaleDateString()))]
        .sort((a, b) => new Date(a) - new Date(b))
        .map(date => state.transactions
          .filter(t => new Date(t.date).toLocaleDateString() === date)
          .reduce((sum, t) => sum + (t.amount || 0), 0)
        ),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4,
    }],
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Transactions</h1>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or total expenses..."
          value={state.searchQuery}
          onChange={e => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
          className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-lg transform transition hover:scale-105">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Transaction Categories</h2>
          <Pie data={categoryData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg transform transition hover:scale-105">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Transaction Trends</h2>
          <Line data={trendData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>
      </div>
      {state.loading ? (
        <div className="text-gray-600 text-center">Loading...</div>
      ) : state.error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg animate-pulse">{state.error}</div>
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
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => sortUsers('totalExpenses')}>
                  Total Expenses {sortConfig.key === 'totalExpenses' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
                    <td className="px-6 py-4">₹{user.totalExpenses.toFixed(2)}</td>
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
                          <h3 className="text-lg font-semibold text-gray-700 mb-4">Transactions</h3>
                          {getUserDetails(user.email).transactions.length === 0 ? (
                            <div className="text-gray-600">No transactions found.</div>
                          ) : (
                            <table className="min-w-full border border-gray-200 bg-white rounded-lg">
                              <thead className="bg-indigo-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => sortUsers('category')}>
                                    Category {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => sortUsers('amount')}>
                                    Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 cursor-pointer" onClick={() => sortUsers('date')}>
                                    Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                  </th>
                                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {getUserDetails(user.email).transactions.map(txn => (
                                  <tr key={txn._id} className="border-t hover:bg-gray-50 transition">
                                    <td className="px-4 py-2">{txn.category ?? 'N/A'}</td>
                                    <td className="px-4 py-2">₹{txn.amount?.toFixed(2) ?? 'N/A'}</td>
                                    <td className="px-4 py-2">{txn.date ? new Date(txn.date).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-4 py-2">
                                      <button
                                        onClick={() => handleDelete(txn._id)}
                                        disabled={state.deletingIds.includes(txn._id)}
                                        className={`bg-red-500 text-white px-4 py-2 rounded-lg transition ${
                                          state.deletingIds.includes(txn._id) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'
                                        }`}
                                      >
                                        {state.deletingIds.includes(txn._id) ? 'Deleting...' : 'Delete'}
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