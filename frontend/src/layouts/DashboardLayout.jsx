import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDebounce } from 'use-debounce';
import { Pie, Doughnut, Bar, Line, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  UsersIcon,
  CurrencyDollarIcon,
  ChartPieIcon,
  HomeIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';

ChartJS.register(
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

const chartTypes = ['Pie', 'Doughnut', 'Bar', 'Line', 'Area', 'Radar'];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('Home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [data, setData] = useState({ users: [], transactions: [], budgets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [chartType, setChartType] = useState('Bar');
  const [expandedEmail, setExpandedEmail] = useState(null);
  const [deletingIds, setDeletingIds] = useState([]);
  const [deletingAllEmails, setDeletingAllEmails] = useState([]);

  const navItems = [
    { name: 'Home', icon: HomeIcon },
    { name: 'Users', icon: UsersIcon },
    { name: 'Transactions', icon: CurrencyDollarIcon },
    { name: 'Budgets', icon: ChartPieIcon },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) throw new Error('No admin token found. Please log in.');
        const [usersRes, transactionsRes, budgetsRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_ADMIN_BACKEND_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${import.meta.env.VITE_ADMIN_BACKEND_URL}/admin/transactions`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${import.meta.env.VITE_ADMIN_BACKEND_URL}/admin/budgets`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
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

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  const sortData = (key, dataType) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
    if (dataType === 'users') {
      setData({
        ...data,
        users: [...data.users].sort((a, b) => {
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
        }),
      });
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${import.meta.env.VITE_ADMIN_BACKEND_URL}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData({ ...data, users: data.users.filter(user => user._id !== userId) });
      alert('User deleted successfully');
    } catch (error) {
      alert('Failed to delete user: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;
    setDeletingIds([...deletingIds, id]);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${import.meta.env.VITE_ADMIN_BACKEND_URL}/admin/${type}s/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData({
        ...data,
        [type + 's']: data[type + 's'].filter(item => item._id !== id),
      });
      setDeletingIds(deletingIds.filter(dId => dId !== id));
      alert(`${type} deleted successfully`);
    } catch (error) {
      alert(`Failed to delete ${type}: ` + (error.response?.data?.message || error.message));
      setDeletingIds(deletingIds.filter(dId => dId !== id));
    }
  };

  const handleDeleteAll = async (email, type) => {
    if (!window.confirm(`Are you sure you want to delete all ${type}s for ${email}?`)) return;
    setDeletingAllEmails([...deletingAllEmails, email]);
    try {
      const token = localStorage.getItem('adminToken');
      const items = data[type + 's'].filter(item => item.user?.email === email);
      for (const item of items) {
        await axios.delete(`${import.meta.env.VITE_ADMIN_BACKEND_URL}/admin/${type}s/${item._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setData({
        ...data,
        [type + 's']: data[type + 's'].filter(item => item.user?.email !== email),
      });
      setDeletingAllEmails(deletingAllEmails.filter(e => e !== email));
      setExpandedEmail(expandedEmail === email ? null : expandedEmail);
      alert(`All ${type}s for ${email} deleted successfully`);
    } catch (error) {
      alert(`Failed to delete ${type}s: ` + (error.response?.data?.message || error.message));
      setDeletingAllEmails(deletingAllEmails.filter(e => e !== email));
    }
  };

  const getChartComponent = (dataConfig, type, options = chartOptions) => {
    switch (type) {
      case 'Pie':
        return <Pie data={dataConfig} options={options} />;
      case 'Doughnut':
        return <Doughnut data={dataConfig} options={options} />;
      case 'Bar':
        return <Bar data={dataConfig} options={options} />;
      case 'Line':
        return <Line data={dataConfig} options={options} />;
      case 'Area':
        return <Line data={dataConfig} options={{ ...options, fill: true }} />;
      case 'Radar':
        return <Radar data={dataConfig} options={options} />;
      default:
        return <Bar data={dataConfig} options={options} />;
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: {
            size: window.innerWidth < 640 ? 10 : window.innerWidth < 1024 ? 12 : 14,
            family: 'Inter',
            weight: '500',
          },
          color: '#1f2937',
          padding: window.innerWidth < 640 ? 8 : 16,
          usePointStyle: true,
          boxWidth: window.innerWidth < 640 ? 6 : 8,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(30, 58, 138, 0.9)',
        titleFont: { family: 'Inter', size: window.innerWidth < 640 ? 12 : 14, weight: '600' },
        bodyFont: { family: 'Inter', size: window.innerWidth < 640 ? 10 : 12 },
        padding: window.innerWidth < 640 ? 8 : 12,
        cornerRadius: 8,
        boxPadding: 6,
      },
      datalabels: {
        display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0 && window.innerWidth >= 640,
        color: '#1f2937',
        font: { family: 'Inter', size: window.innerWidth < 640 ? 8 : 10, weight: '500' },
        formatter: (value) => value > 0 ? value.toLocaleString() : '',
        align: 'end',
        offset: 4,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Inter', size: window.innerWidth < 640 ? 8 : 10 }, color: '#1f2937' },
        title: {
          display: true,
          text: 'Date/Category/User',
          font: { family: 'Inter', size: window.innerWidth < 640 ? 10 : 12, weight: '600' },
        },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          font: { family: 'Inter', size: window.innerWidth < 640 ? 8 : 10 },
          color: '#1f2937',
          beginAtZero: true,
          callback: (value) => value.toLocaleString(),
        },
        title: {
          display: true,
          text: 'Amount (₹) / Count',
          font: { family: 'Inter', size: window.innerWidth < 640 ? 10 : 12, weight: '600' },
        },
      },
    },
    elements: {
      bar: {
        borderRadius: 6,
        backgroundColor: (ctx) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.4)');
          return gradient;
        },
      },
      line: { tension: 0.4 },
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart',
    },
  };

  // Financial Metrics for Home
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeUsers = data.users.filter(u => new Date(u.createdAt) >= thirtyDaysAgo).length;
  const transactionAmounts = data.transactions.map(t => t.amount || 0);
  const highSpendingThreshold = transactionAmounts.length
    ? transactionAmounts.sort((a, b) => b - a)[Math.floor(transactionAmounts.length * 0.25)] || 0
    : 0;
  const highSpendingUsers = data.users.filter(u =>
    data.transactions.filter(t => t.user?.email === u.email).reduce((sum, t) => sum + (t.amount || 0), 0) >= highSpendingThreshold
  ).length;

  const homeSummary = {
    totalUsers: data.users.length,
    activeUsers,
    totalTransactions: data.transactions.length,
    avgTransaction: data.transactions.length
      ? (data.transactions.reduce((sum, t) => sum + (t.amount || 0), 0) / data.transactions.length).toFixed(2)
      : 0,
    totalBudgets: data.budgets.length,
    avgBudget: data.budgets.length
      ? (data.budgets.reduce((sum, b) => sum + (b.amount || 0), 0) / data.budgets.length).toFixed(2)
      : 0,
    highSpendingUsers,
  };

  // Home Charts
  const homeChart1 = {
    labels: ['Users', 'Transactions', 'Budgets'],
    datasets: [{
      label: 'Data Distribution',
      data: [data.users.length, data.transactions.length, data.budgets.length],
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'],
      borderColor: '#ffffff',
      borderWidth: 2,
    }],
  };

  const homeChart2 = {
    labels: data.users
      .map(u => ({ email: u.email, amount: data.transactions.filter(t => t.user?.email === u.email).reduce((sum, t) => sum + (t.amount || 0), 0) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(u => u.email.split('@')[0]),
    datasets: [{
      label: 'Top 5 Users by Transaction Amount',
      data: data.users
        .map(u => ({ email: u.email, amount: data.transactions.filter(t => t.user?.email === u.email).reduce((sum, t) => sum + (t.amount || 0), 0) }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
        .map(u => u.amount),
      backgroundColor: '#3b82f6',
      borderColor: '#1e3a8a',
      borderWidth: 1,
    }],
  };

  const homeChart3 = {
    labels: [...new Set(data.transactions.map(t => new Date(t.date).toLocaleDateString()))].sort((a, b) => new Date(a) - new Date(b)),
    datasets: [
      {
        label: 'Transaction Count',
        data: [...new Set(data.transactions.map(t => new Date(t.date).toLocaleDateString()))]
          .sort((a, b) => new Date(a) - new Date(b))
          .map(date => data.transactions.filter(t => new Date(t.date).toLocaleDateString() === date).length),
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3b82f6',
        limits: 2,
        pointRadius: 4,
        yAxisID: 'y',
      },
      {
        label: 'Transaction Amount',
        data: [...new Set(data.transactions.map(t => new Date(t.date).toLocaleDateString()))]
          .sort((a, b) => new Date(a) - new Date(b))
          .map(date => data.transactions.filter(t => new Date(t.date).toLocaleDateString() === date).reduce((sum, t) => sum + (t.amount || 0), 0)),
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10b981',
        borderWidth: 2,
        pointRadius: 4,
        yAxisID: 'y1',
      },
    ],
  };

  const homeChart4 = {
    labels: [...new Set(data.budgets.map(b => b.category || 'Unknown'))].slice(0, 5),
    datasets: [{
      label: 'Top Budget Categories',
      data: [...new Set(data.budgets.map(b => b.category || 'Unknown'))]
        .slice(0, 5)
        .map(cat => data.budgets.filter(b => b.category === cat).reduce((sum, b) => sum + (b.amount || 0), 0)),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      borderColor: '#ffffff',
      borderWidth: 2,
    }],
  };

  const homeChart5 = {
    labels: [...new Set([...data.budgets.map(b => b.category || 'Unknown'), ...data.transactions.map(t => t.category || 'Unknown')])],
    datasets: [
      {
        label: 'Budget Allocated',
        data: [...new Set([...data.budgets.map(b => b.category || 'Unknown'), ...data.transactions.map(t => t.category || 'Unknown')])]
          .map(cat => data.budgets.filter(b => b.category === cat).reduce((sum, b) => sum + (b.amount || 0), 0)),
        backgroundColor: '#3b82f6',
        borderColor: '#1e3a8a',
        borderWidth: 1,
      },
      {
        label: 'Actual Spending',
        data: [...new Set([...data.budgets.map(b => b.category || 'Unknown'), ...data.transactions.map(t => t.category || 'Unknown')])]
          .map(cat => data.transactions.filter(t => t.category === cat).reduce((sum, t) => sum + (t.amount || 0), 0)),
        backgroundColor: '#ef4444',
        borderColor: '#b91c1c',
        borderWidth: 1,
      },
    ],
  };

  const homeChart6 = {
    labels: [...new Set(data.users.map(u => new Date(u.createdAt).toLocaleDateString()))].sort((a, b) => new Date(a) - new Date(b)),
    datasets: [{
      label: 'Active Users',
      data: [...new Set(data.users.map(u => new Date(u.createdAt).toLocaleDateString()))]
        .sort((a, b) => new Date(a) - new Date(b))
        .map(date => data.users.filter(u => new Date(u.createdAt).toLocaleDateString() <= date).length),
      backgroundColor: 'rgba(139, 92, 246, 0.2)',
      borderColor: '#8b5cf6',
      borderWidth: 2,
      pointRadius: 4,
      fill: true,
    }],
  };

  // Users Charts
  const usersChart1 = {
    labels: [...new Set(data.users.map(u => new Date(u.createdAt).toLocaleDateString()))].sort((a, b) => new Date(a) - new Date(b)),
    datasets: [{
      label: 'Users Joined Per Day',
      data: [...new Set(data.users.map(u => new Date(u.createdAt).toLocaleDateString()))]
        .sort((a, b) => new Date(a) - new Date(b))
        .map(date => data.users.filter(u => new Date(u.createdAt).toLocaleDateString() === date).length),
      backgroundColor: '#3b82f6',
      borderColor: '#1e3a8a',
      borderWidth: 2,
      pointRadius: 4,
    }],
  };

  const usersChart2 = {
    labels: data.users.map(u => u.email.split('@')[0]),
    datasets: [{
      label: 'Total Transaction Amount (₹)',
      data: data.users.map(u => data.transactions.filter(t => t.user?.email === u.email).reduce((sum, t) => sum + (t.amount || 0), 0)),
      backgroundColor: '#10b981',
      borderColor: '#065f46',
      borderWidth: 1,
    }],
  };

  const usersChart3 = {
    labels: data.users.map(u => u.email.split('@')[0]),
    datasets: [{
      label: 'Total Budget Amount (₹)',
      data: data.users.map(u => data.budgets.filter(b => b.user?.email === u.email).reduce((sum, b) => sum + (b.amount || 0), 0)),
      backgroundColor: '#f59e0b',
      borderColor: '#b45309',
      borderWidth: 1,
    }],
  };

  // Transactions Charts
  const transactionsChart1 = {
    labels: [...new Set(data.transactions.map(t => t.category || 'Unknown'))],
    datasets: [{
      label: 'Transaction Categories (₹)',
      data: [...new Set(data.transactions.map(t => t.category || 'Unknown'))].map(
        cat => data.transactions.filter(t => t.category === cat).reduce((sum, t) => sum + (t.amount || 0), 0)
      ),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      borderColor: '#ffffff',
      borderWidth: 2,
    }],
  };

  const transactionsChart2 = {
    labels: [...new Set(data.transactions.map(t => new Date(t.date).toLocaleDateString()))].sort((a, b) => new Date(a) - new Date(b)),
    datasets: [{
      label: 'Transaction Amounts (₹)',
      data: [...new Set(data.transactions.map(t => new Date(t.date).toLocaleDateString()))]
        .sort((a, b) => new Date(a) - new Date(b))
        .map(date => data.transactions
          .filter(t => new Date(t.date).toLocaleDateString() === date)
          .reduce((sum, t) => sum + (t.amount || 0), 0)
        ),
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderColor: '#3b82f6',
      borderWidth: 2,
      pointRadius: 4,
      fill: chartType === 'Area',
    }],
  };

  const transactionsChart3 = {
    labels: data.users.map(u => u.email.split('@')[0]),
    datasets: [{
      label: 'Transaction Amounts by User (₹)',
      data: data.users.map(u => data.transactions.filter(t => t.user?.email === u.email).reduce((sum, t) => sum + (t.amount || 0), 0)),
      backgroundColor: '#10b981',
      borderColor: '#065f46',
      borderWidth: 1,
    }],
  };

  // Budgets Charts
  const budgetsChart1 = {
    labels: [...new Set(data.budgets.map(b => b.category || 'Unknown'))],
    datasets: [{
      label: 'Budget Categories (₹)',
      data: [...new Set(data.budgets.map(b => b.category || 'Unknown'))].map(
        cat => data.budgets.filter(b => b.category === cat).reduce((sum, b) => sum + (b.amount || 0), 0)
      ),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      borderColor: '#ffffff',
      borderWidth: 2,
    }],
  };

  const budgetsChart2 = {
    labels: [...new Set(data.budgets.map(b => new Date(b.createdAt).toLocaleDateString()))].sort((a, b) => new Date(a) - new Date(b)),
    datasets: [...new Set(data.budgets.map(b => b.category || 'Unknown'))].map((cat, index) => ({
      label: cat,
      data: [...new Set(data.budgets.map(b => new Date(b.createdAt).toLocaleDateString()))]
        .sort((a, b) => new Date(a) - new Date(b))
        .map(date => data.budgets
          .filter(b => b.category === cat && new Date(b.createdAt).toLocaleDateString() === date)
          .reduce((sum, b) => sum + (b.amount || 0), 0)
        ),
      backgroundColor: ['rgba(59, 130, 246, 0.3)', 'rgba(16, 185, 129, 0.3)', 'rgba(245, 158, 11, 0.3)', 'rgba(239, 68, 68, 0.3)', 'rgba(139, 92, 246, 0.3)'][index % 5],
      borderColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5],
      borderWidth: 2,
      pointRadius: 4,
      fill: chartType === 'Area',
    })),
  };

  const budgetsChart3 = {
    labels: data.users.map(u => u.email.split('@')[0]),
    datasets: [{
      label: 'Budget Amounts by User (₹)',
      data: data.users.map(u => data.budgets.filter(b => b.user?.email === u.email).reduce((sum, b) => sum + (b.amount || 0), 0)),
      backgroundColor: '#f59e0b',
      borderColor: '#b45309',
      borderWidth: 1,
    }],
  };

  const filteredUsers = data.users.filter(user =>
    (user.username || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  const getTransactionUsers = () => {
    return Object.values(
      data.transactions.reduce((acc, txn) => {
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
  };

  const getBudgetUsers = () => {
    return Object.values(
      data.budgets.reduce((acc, budget) => {
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
  };

  const getUserDetails = (email, type) => {
    const items = data[type + 's'].filter(item => item.user?.email === email).sort((a, b) => {
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
      if (sortConfig.key === 'date' && type === 'transaction') {
        return sortConfig.direction === 'asc'
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date);
      }
      if (sortConfig.key === 'period' && type === 'budget') {
        return sortConfig.direction === 'asc'
          ? (a.period || '').localeCompare(b.period || '')
          : (b.period || '').localeCompare(a.period || '');
      }
      if (sortConfig.key === 'createdAt') {
        return sortConfig.direction === 'asc'
          ? new Date(a.createdAt) - new Date(b.createdAt)
          : new Date(b.createdAt) - new Date(a.createdAt);
      }
      return 0;
    });
    return { [type + 's']: items };
  };

  return (
    <div className="flex min-h-screen bg-gray-100 font-inter">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 sm:w-72 bg-white text-gray-800 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out z-50 shadow-lg`}
      >
        <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-br from-indigo-700 to-indigo-500">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <ChartPieIcon className="h-5 w-5 sm:h-6 sm:w-6" /> Admin Dashboard
          </h2>
        </div>
        <nav className="flex flex-col p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => {
                setActiveSection(item.name);
                setIsSidebarOpen(false);
                setSearchQuery('');
                setExpandedEmail(null);
              }}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm sm:text-base font-medium transition duration-200 ${
                activeSection === item.name
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'
              }`}
            >
              <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              {item.name}
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="mt-4 flex items-center gap-3 rounded-xl bg-red-100 text-red-700 px-4 py-3 text-sm sm:text-base font-medium hover:bg-red-200 transition duration-200"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            Logout
          </button>
        </nav>
      </aside>

      {/* Mobile Sidebar Toggle */}
      <button
        className="md:hidden p-3 text-indigo-600 fixed top-4 left-4 z-50 bg-white rounded-full shadow-md"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      {/* Main Content */}
      <main className="flex-1 max-w-full p-4 sm:p-6 md:ml-64 lg:ml-72">
        <div className="max-w-full mx-auto">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-6 sm:mb-8">
            Admin Dashboard
          </h1>

          {/* Chart Type Selector */}
          {activeSection !== 'Home' && (
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <label className="text-sm sm:text-base font-medium text-gray-700">
                Chart Type:
              </label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="w-full sm:w-48 rounded-lg border border-gray-300 p-2 sm:p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 bg-white shadow-sm text-sm sm:text-base"
              >
                {chartTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg transition-opacity duration-300">
              {error}
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8">
              {/* Home Section */}
              {activeSection === 'Home' && (
                <div className="space-y-6 sm:space-y-8">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {[
                      { label: 'Total Users', value: homeSummary.totalUsers, color: 'bg-indigo-100 text-indigo-700' },
                      { label: 'Active Users (30d)', value: homeSummary.activeUsers, color: 'bg-green-100 text-green-700' },
                      { label: 'High Spenders', value: homeSummary.highSpendingUsers, color: 'bg-amber-100 text-amber-700' },
                      { label: 'Avg. Transaction', value: `₹${homeSummary.avgTransaction}`, color: 'bg-blue-100 text-blue-700' },
                      { label: 'Total Transactions', value: homeSummary.totalTransactions, color: 'bg-purple-100 text-purple-700' },
                      { label: 'Total Budgets', value: homeSummary.totalBudgets, color: 'bg-pink-100 text-pink-700' },
                      { label: 'Avg. Budget', value: `₹${homeSummary.avgBudget}`, color: 'bg-teal-100 text-teal-700' },
                    ].map((item, index) => (
                      <div
                        key={index}
                        className={`p-4 sm:p-6 rounded-xl shadow-md ${item.color} transition duration-300 hover:shadow-lg hover:-translate-y-1`}
                      >
                        <h3 className="text-sm sm:text-base font-medium">{item.label}</h3>
                        <p className="text-xl sm:text-2xl font-bold mt-2">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Charts */}
                  <div className="space-y-6 sm:space-y-8">
                    {[
                      { title: 'Data Distribution', chart: homeChart1, type: 'Doughnut' },
                      { title: 'Top Users by Transactions', chart: homeChart2, type: 'Bar' },
                      {
                        title: 'Transaction Volume',
                        chart: homeChart3,
                        type: 'Line',
                        options: {
                          ...chartOptions,
                          scales: {
                            x: chartOptions.scales.x,
                            y: { ...chartOptions.scales.y, title: { display: true, text: 'Count' } },
                            y1: {
                              ...chartOptions.scales.y,
                              position: 'right',
                              title: { display: true, text: 'Amount (₹)' },
                              grid: { display: false },
                            },
                          },
                        },
                      },
                      { title: 'Top Budget Categories', chart: homeChart4, type: 'Doughnut' },
                      { title: 'Budget vs. Spending', chart: homeChart5, type: 'Bar' },
                      { title: 'User Retention', chart: homeChart6, type: 'Area' },
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="bg-white p-4 sm:p-6 rounded-xl shadow-md transition duration-300 hover:shadow-lg w-full"
                      >
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 bg-indigo-50 p-3 sm:p-4 rounded-t-xl">
                          {item.title}
                        </h2>
                        <div className="w-full h-64 sm:h-80 lg:h-96">
                          {getChartComponent(item.chart, item.type, item.options || chartOptions)}
                        </div>
                      </div>
                    ))}
                    {/* Recent Transactions */}
                    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md transition duration-300 hover:shadow-lg">
                      <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 bg-indigo-50 p-3 sm:p-4 rounded-t-xl">
                        Recent Transactions
                      </h2>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-200">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                              {['User', 'Amount', 'Category', 'Date'].map((header) => (
                                <th
                                  key={header}
                                  className="px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.transactions
                              .sort((a, b) => new Date(b.date) - new Date(a.date))
                              .slice(0, 5)
                              .map(txn => (
                                <tr key={txn._id} className="border-t hover:bg-gray-50 transition duration-200 even:bg-gray-50/50">
                                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                    {txn.user?.email?.split('@')[0] || 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                    ₹{txn.amount?.toFixed(2) || 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                    {txn.category || 'N/A'}
                                  </td>
                                  <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                    {txn.date ? new Date(txn.date).toLocaleDateString() : 'N/A'}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Users Section */}
              {activeSection === 'Users' && (
                <div className="space-y-6 sm:space-y-8">
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full sm:w-96 rounded-lg border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 bg-white shadow-sm text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-7 sm:space-y-8">
                    {[
                      { title: 'Users Joined Per Day', chart: usersChart1, type: chartType },
                      { title: 'Transaction Amounts by User', chart: usersChart2, type: chartType },
                      { title: 'Budget Amounts by User', chart: usersChart3, type: chartType },
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="bg-white p-4 sm:p-6 rounded-xl shadow-md transition duration-300 hover:shadow-lg w-full"
                      >
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 bg-indigo-50 p-3 sm:p-4 rounded-t-xl">
                          {item.title}
                        </h2>
                        <div className="w-full h-64 sm:h-80 lg:h-96">
                          {getChartComponent(item.chart, item.type)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredUsers.length === 0 ? (
                    <div className="text-gray-600 text-center text-sm sm:text-base">
                      No users found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 bg-white rounded-xl shadow-md">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            {['Name', 'Email', 'Joined', 'Action'].map((header, idx) => (
                              <th
                                key={header}
                                className={`px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 ${idx < 3 ? 'cursor-pointer' : ''}`}
                                onClick={() => idx < 3 && sortData(['name', 'email', 'createdAt'][idx], 'users')}
                              >
                                {header} {sortConfig.key === ['name', 'email', 'createdAt'][idx] && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map(user => (
                            <tr key={user._id} className="border-t hover:bg-gray-50 transition duration-200 even:bg-gray-50/50">
                              <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                {user.username || 'N/A'}
                              </td>
                              <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                {user.email || 'N/A'}
                              </td>
                              <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-3 py-2 sm:px-4 sm:py-3">
                                <button
                                  onClick={() => deleteUser(user._id)}
                                  className="bg-red-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-lg hover:bg-red-700 transition duration-200 transform hover:scale-105 shadow-sm text-xs sm:text-sm"
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
              )}

              {/* Transactions Section */}
              {activeSection === 'Transactions' && (
                <div className="space-y-6 sm:space-y-8">
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search by name, email, or total expenses..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full sm:w-96 rounded-lg border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 bg-white shadow-sm text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-6 sm:space-y-8">
                    {[
                      { title: 'Transaction Categories', chart: transactionsChart1, type: 'Doughnut' },
                      { title: 'Transaction Trends', chart: transactionsChart2, type: chartType },
                      { title: 'Transaction Amounts by User', chart: transactionsChart3, type: chartType },
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="bg-white p-4 sm:p-6 rounded-xl shadow-md transition duration-300 hover:shadow-lg w-full"
                      >
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 bg-indigo-50 p-3 sm:p-4 rounded-t-xl">
                          {item.title}
                        </h2>
                        <div className="w-full h-64 sm:h-80 lg:h-96">
                          {getChartComponent(item.chart, item.type)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {getTransactionUsers().length === 0 ? (
                    <div className="text-gray-600 text-center text-sm sm:text-base">
                      No users found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 bg-white rounded-xl shadow-md">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            {['Name', 'Email', 'Date Created', 'Total Expenses', 'Action'].map((header, idx) => (
                              <th
                                key={header}
                                className={`px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 ${idx < 4 ? 'cursor-pointer' : ''}`}
                                onClick={() => idx < 4 && sortData(['name', 'email', 'createdAt', 'totalExpenses'][idx], 'transactions')}
                              >
                                {header} {sortConfig.key === ['name', 'email', 'createdAt', 'totalExpenses'][idx] && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {getTransactionUsers().map(user => (
                            <React.Fragment key={user.email}>
                              <tr className="border-t hover:bg-gray-50 transition duration-200 even:bg-gray-50/50">
                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                  {user.username}
                                </td>
                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                  {user.email}
                                </td>
                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                  ₹{user.totalExpenses.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 sm:px-4 sm:py-3 flex gap-2 sm:gap-3">
                                  <button
                                    onClick={() => setExpandedEmail(expandedEmail === user.email ? null : user.email)}
                                    className="bg-indigo-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-lg hover:bg-indigo-700 transition duration-200 transform hover:scale-105 shadow-sm text-xs sm:text-sm"
                                  >
                                    {expandedEmail === user.email ? 'Collapse' : 'Expand'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAll(user.email, 'transaction')}
                                    disabled={deletingAllEmails.includes(user.email)}
                                    className={`bg-red-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-lg transition duration-200 transform hover:scale-105 shadow-sm ${deletingAllEmails.includes(user.email) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'}`}
                                  >
                                    {deletingAllEmails.includes(user.email) ? 'Deleting...' : 'Delete All'}
                                  </button>
                                </td>
                              </tr>
                              {expandedEmail === user.email && (
                                <tr>
                                  <td colSpan="5" className="px-3 py-2 sm:px-4 sm:py-3 bg-gray-50">
                                    <div className="p-3 sm:p-4">
                                      <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">
                                        Transactions
                                      </h3>
                                      {getUserDetails(user.email, 'transaction').transactions.length === 0 ? (
                                        <div className="text-gray-600 text-xs sm:text-sm">
                                          No transactions found.
                                        </div>
                                      ) : (
                                        <table className="min-w-full border border-gray-200 bg-white rounded-lg">
                                          <thead className="bg-gray-50 sticky top-0 z-10">
                                            <tr>
                                              {['Category', 'Amount', 'Date', 'Action'].map((header, idx) => (
                                                <th
                                                  key={header}
                                                  className={`px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 ${idx < 3 ? 'cursor-pointer' : ''}`}
                                                  onClick={() => idx < 3 && sortData(['category', 'amount', 'date'][idx], 'transactions')}
                                                >
                                                  {header} {sortConfig.key === ['category', 'amount', 'date'][idx] && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {getUserDetails(user.email, 'transaction').transactions.map(txn => (
                                              <tr key={txn._id} className="border-t hover:bg-gray-50 transition duration-200 even:bg-gray-50/50">
                                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                                  {txn.category ?? 'N/A'}
                                                </td>
                                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                                  ₹{txn.amount?.toFixed(2) ?? 'N/A'}
                                                </td>
                                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                                  {txn.date ? new Date(txn.date).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-3 py-2 sm:px-4 sm:py-3">
                                                  <button
                                                    onClick={() => handleDelete(txn._id, 'transaction')}
                                                    disabled={deletingIds.includes(txn._id)}
                                                    className={`bg-red-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-lg transition duration-200 transform hover:scale-105 shadow-sm ${deletingIds.includes(txn._id) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'}`}
                                                  >
                                                    {deletingIds.includes(txn._id) ? 'Deleting...' : 'Delete'}
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
              )}

              {/* Budgets Section */}
              {activeSection === 'Budgets' && (
                <div className="space-y-6 sm:space-y-8">
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder="Search by name, email, or total budget..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full sm:w-96 rounded-lg border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 bg-white shadow-sm text-sm sm:text-base"
                    />
                  </div>
                  <div className="space-y-6 sm:space-y-8">
                    {[
                      { title: 'Budget Categories', chart: budgetsChart1, type: 'Doughnut' },
                      { title: 'Budget Trends by Category', chart: budgetsChart2, type: chartType },
                      { title: 'Budget Amounts by User', chart: budgetsChart3, type: chartType },
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="bg-white p-4 sm:p-6 rounded-xl shadow-md transition duration-300 hover:shadow-lg w-full"
                      >
                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 bg-indigo-50 p-3 sm:p-4 rounded-t-xl">
                          {item.title}
                        </h2>
                        <div className="w-full h-64 sm:h-80 lg:h-96">
                          {getChartComponent(item.chart, item.type)}
                        </div>
                      </div>
                    ))}
                  </div>
                  {getBudgetUsers().length === 0 ? (
                    <div className="text-gray-600 text-center text-sm sm:text-base">
                      No users found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 bg-white rounded-xl shadow-md">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            {['Name', 'Email', 'Date Created', 'Total Budget', 'Action'].map((header, idx) => (
                              <th
                                key={header}
                                className={`px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 ${idx < 4 ? 'cursor-pointer' : ''}`}
                                onClick={() => idx < 4 && sortData(['name', 'email', 'createdAt', 'totalBudget'][idx], 'budgets')}
                              >
                                {header} {sortConfig.key === ['name', 'email', 'createdAt', 'totalBudget'][idx] && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {getBudgetUsers().map(user => (
                            <React.Fragment key={user.email}>
                              <tr className="border-t hover:bg-gray-50 transition duration-200 even:bg-gray-50/50">
                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                  {user.username}
                                </td>
                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                  {user.email}
                                </td>
                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                  ₹{user.totalBudget.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 sm:px-4 sm:py-3 flex gap-2 sm:gap-3">
                                  <button
                                    onClick={() => setExpandedEmail(expandedEmail === user.email ? null : user.email)}
                                    className="bg-indigo-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-lg hover:bg-indigo-700 transition duration-200 transform hover:scale-105 shadow-sm text-xs sm:text-sm"
                                  >
                                    {expandedEmail === user.email ? 'Collapse' : 'Expand'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAll(user.email, 'budget')}
                                    disabled={deletingAllEmails.includes(user.email)}
                                    className={`bg-red-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-lg transition duration-200 transform hover:scale-105 shadow-sm ${deletingAllEmails.includes(user.email) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'}`}
                                  >
                                    {deletingAllEmails.includes(user.email) ? 'Deleting...' : 'Delete All'}
                                  </button>
                                </td>
                              </tr>
                              {expandedEmail === user.email && (
                                <tr>
                                  <td colSpan="5" className="px-3 py-2 sm:px-4 sm:py-3 bg-gray-50">
                                    <div className="p-3 sm:p-4">
                                      <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-4">
                                        Budgets
                                      </h3>
                                      {getUserDetails(user.email, 'budget').budgets.length === 0 ? (
                                        <div className="text-gray-600 text-xs sm:text-sm">
                                          No budgets found.
                                        </div>
                                      ) : (
                                        <table className="min-w-full border border-gray-200 bg-white rounded-lg">
                                          <thead className="bg-gray-50 sticky top-0 z-10">
                                            <tr>
                                              {['Category', 'Period', 'Amount', 'Created At', 'Action'].map((header, idx) => (
                                                <th
                                                  key={header}
                                                  className={`px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 ${idx < 4 ? 'cursor-pointer' : ''}`}
                                                  onClick={() => idx < 4 && sortData(['category', 'period', 'amount', 'createdAt'][idx], 'budgets')}
                                                >
                                                  {header} {sortConfig.key === ['category', 'period', 'amount', 'createdAt'][idx] && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {getUserDetails(user.email, 'budget').budgets.map(budget => (
                                              <tr key={budget._id} className="border-t hover:bg-gray-50 transition duration-200 even:bg-gray-50/50">
                                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                                  {budget.category ?? 'N/A'}
                                                </td>
                                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                                  {budget.period ?? 'N/A'}
                                                </td>
                                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                                  ₹{budget.amount?.toFixed(2) ?? 'N/A'}
                                                </td>
                                                <td className="px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
                                                  {budget.createdAt ? new Date(budget.createdAt).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-3 py-2 sm:px-4 sm:py-3">
                                                  <button
                                                    onClick={() => handleDelete(budget._id, 'budget')}
                                                    disabled={deletingIds.includes(budget._id)}
                                                    className={`bg-red-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-lg transition duration-200 transform hover:scale-105 shadow-sm ${deletingIds.includes(budget._id) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'}`}
                                                  >
                                                    {deletingIds.includes(budget._id) ? 'Deleting...' : 'Delete'}
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
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}