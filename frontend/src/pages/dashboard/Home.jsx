import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Home() {
  const [data, setData] = useState({ users: [], transactions: [], budgets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found. Please log in.');
        const [usersRes, transactionsRes, budgetsRes] = await Promise.all([
          axios.get('http://localhost:5000/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:5000/admin/transactions', { headers: { Authorization: `Bearer ${token}` } }),
          axios.get('http://localhost:5000/admin/budgets', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setData({
          users: Array.isArray(usersRes.data) ? usersRes.data : [],
          transactions: Array.isArray(transactionsRes.data) ? transactionsRes.data : [],
          budgets: Array.isArray(budgetsRes.data) ? budgetsRes.data : [],
        });
      } catch (err) {
        setError(err.message || 'Failed to fetch data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const pieData = {
    labels: ['Users', 'Transactions', 'Budgets'],
    datasets: [{
      data: [data.users.length, data.transactions.length, data.budgets.length],
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
      borderColor: '#ffffff',
      borderWidth: 2,
    }],
  };

  const barData = {
    labels: data.users.map(u => u.email || 'Unknown'),
    datasets: [{
      label: 'Transactions per User',
      data: data.users.map(u => data.transactions.filter(t => t.user?.email === u.email).length),
      backgroundColor: '#3b82f6',
      borderColor: '#1e3a8a',
      borderWidth: 1,
    }],
  };

  if (loading) return <div className="text-gray-600 text-center">Loading...</div>;
  if (error) return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg animate-pulse">
      {error}
    </div>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-lg transform transition hover:scale-105">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Data Distribution</h2>
          <Pie data={pieData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
        </div>
        <div className="bg-white p-6 rounded-lg shadow-lg transform transition hover:scale-105">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">User Activity</h2>
          <Bar data={barData} options={{ responsive: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { position: 'bottom' } } }} />
        </div>
      </div>
    </div>
  );
}