import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Code, Users, Calendar, Flag, Activity, Download,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import api from '../../utils/api';
import ExportButton from '../../components/ExportButton';

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

// Date range options
const DATE_RANGES = [
  { label: 'Last 7 Days', value: 7 },
  { label: 'Last 30 Days', value: 30 },
  { label: 'Last 90 Days', value: 90 },
  { label: 'Last Year', value: 365 }
];

const Stat = ({ label, value, icon, trend, trendLabel, className = '' }) => (
  <div className={`p-4 rounded-lg border bg-white shadow-sm ${className}`}>
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-500">{label}</p>
      <div className="p-2 rounded-full bg-opacity-20 bg-current text-current">
        {icon}
      </div>
    </div>
    <div className="mt-2 flex items-end justify-between">
      <p className="text-2xl font-semibold">{value}</p>
      {trend && (
        <span className={`text-sm flex items-center ${
          trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'
        }`}>
          {trend > 0 ? <ChevronUp className="h-4 w-4" /> : 
           trend < 0 ? <ChevronDown className="h-4 w-4" /> : null}
          {trend !== 0 && `${Math.abs(trend)}%`}
          {trendLabel && <span className="ml-1 text-xs text-gray-500">{trendLabel}</span>}
        </span>
      )}
    </div>
  </div>
);

const ChartCard = ({ title, children, className = '' }) => (
  <div className={`bg-white rounded-lg border shadow-sm p-4 ${className}`}>
    <h3 className="text-md font-medium text-gray-900 mb-4">{title}</h3>
    <div className="h-64">
      {children}
    </div>
  </div>
);

const TaskCompletionChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-center my-8">No task completion data available</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        layout="vertical"
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="title" type="category" width={150} />
        <Tooltip 
          formatter={(value, name) => [value, name === 'completed' ? 'Completed' : 'Total']}
          labelFormatter={(label) => `Task: ${label}`}
        />
        <Legend />
        <Bar dataKey="totalSubmissions" name="Total Submissions" fill="#8884d8" />
        <Bar dataKey="completedSubmissions" name="Completed Submissions" fill="#82ca9d" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const SubmissionTrendChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-center my-8">No submission data available</p>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tickFormatter={(date) => format(new Date(date), 'MMM d')}
        />
        <YAxis />
        <Tooltip 
          labelFormatter={(date) => format(new Date(date), 'MMMM d, yyyy')}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="count" 
          name="Submissions" 
          stroke="#8884d8" 
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

const UserActivityPieChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <p className="text-gray-500 text-center my-8">No user activity data available</p>;
  }

  const pieData = [
    { name: 'Active Users', value: data.filter(u => u.isActive).length },
    { name: 'Inactive Users', value: data.filter(u => !u.isActive).length },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="h-48 w-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name) => [value, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-4">
        {pieData.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-1" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs text-gray-600">
              {entry.name}: {entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [dateRange, setDateRange] = useState(30);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Close export menu when clicking outside
  const exportMenuRef = React.useRef(null);
  
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-dashboard', dateRange],
    queryFn: async () => {
      const res = await api.get(`/admin/dashboard?days=${dateRange}`);
      return res.data;
    },
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading admin dashboard.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const d = data || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <label htmlFor="date-range" className="text-sm text-gray-600 whitespace-nowrap">Date Range:</label>
            <select
              id="date-range"
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              {DATE_RANGES.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="relative group">
            <button 
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
              <svg className="-mr-1 ml-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <ExportButton 
                    type="users" 
                    label="Export Users" 
                    onExportStart={() => setShowExportMenu(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  />
                  <ExportButton 
                    type="submissions" 
                    label="Export Submissions" 
                    onExportStart={() => setShowExportMenu(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  />
                  <ExportButton 
                    type="reports" 
                    label="Export Reports" 
                    onExportStart={() => setShowExportMenu(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat 
          label="Total Users" 
          value={d.usersCount ?? 0} 
          icon={<Users className="h-5 w-5 text-blue-600" />}
          trend={d.analytics?.userGrowth}
          trendLabel="vs last period"
        />
        <Stat 
          label="Active Users" 
          value={d.activeUsers ?? 0} 
          icon={<Activity className="h-5 w-5 text-green-600" />}
          trend={d.analytics?.activeUserGrowth}
          trendLabel="active now"
        />
        <Stat 
          label="Active Tasks" 
          value={d.activeTasks ?? 0} 
          icon={<Code className="h-5 w-5 text-purple-600" />}
          trend={d.analytics?.taskCompletionRate}
          trendLabel="completion rate"
        />
        <Stat 
          label="Pending Reports" 
          value={d.pendingReports ?? 0} 
          icon={<Flag className="h-5 w-5 text-yellow-600" />}
          trend={d.analytics?.pendingReportsChange}
          trendLabel="to review"
        />
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Task Completion">
          <TaskCompletionChart data={d.analytics?.taskCompletion || []} />
        </ChartCard>
        
        <ChartCard title="Submission Trends">
          <SubmissionTrendChart data={d.analytics?.submissionTrends || []} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="User Activity" className="lg:col-span-1">
          <UserActivityPieChart data={d.analytics?.userActivity || []} />
        </ChartCard>
        
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <h3 className="text-md font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link
                to="/admin/leetcode"
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors flex flex-col items-center text-center"
              >
                <div className="p-3 rounded-full bg-blue-100 text-blue-600 mb-2">
                  <Code className="h-6 w-6" />
                </div>
                <h3 className="font-medium text-gray-900">LeetCode Manager</h3>
                <p className="text-sm text-gray-500 mt-1">Manage coding challenges and tasks</p>
              </Link>
              
              <Link
                to="/admin/training"
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors flex flex-col items-center text-center"
              >
                <div className="p-3 rounded-full bg-green-100 text-green-600 mb-2">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="font-medium text-gray-900">Training Sessions</h3>
                <p className="text-sm text-gray-500 mt-1">Schedule and manage training sessions</p>
              </Link>
              
              <Link
                to="/admin/reports"
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors flex flex-col items-center text-center"
              >
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mb-2">
                  <Flag className="h-6 w-6" />
                </div>
                <h3 className="font-medium text-gray-900">View Reports</h3>
                <p className="text-sm text-gray-500 mt-1">Review and manage training reports</p>
              </Link>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <h3 className="text-md font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Code className="h-4 w-4 mr-2 text-blue-500" />
                  Recent Submissions
                </h4>
                {d.recentSubmissions?.length ? (
                  <div className="space-y-2">
                    {d.recentSubmissions.map((s) => (
                      <div key={s._id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              #{s.questionNumber} {s.questionTitle || ''}
                            </p>
                            <p className="text-xs text-gray-500">
                              {s.user?.name || s.user?.email} • {s.language}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-2">No recent submissions</p>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Flag className="h-4 w-4 mr-2 text-yellow-500" />
                  Recent Training Reports
                </h4>
                {d.recentReports?.length ? (
                  <div className="space-y-2">
                    {d.recentReports.map((r) => (
                      <div key={r._id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">
                              {r.session?.collegeName || 'Training Report'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {r.user?.name || r.user?.email}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 py-2">No recent reports</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
