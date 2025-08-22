import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Code, 
  Calendar, 
  Trophy, 
  CheckCircle, 
  AlertCircle,
  Users
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';

const Dashboard = () => {
  const { user } = useAuth();

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/dashboard');
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  const stats = [
    {
      name: 'Active Tasks',
      value: dashboardData?.activeTasks || 0,
      icon: Code,
      color: 'bg-blue-500',
      href: '/leetcode/tasks'
    },
    {
      name: 'Completed Submissions',
      value: dashboardData?.completedSubmissions || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      href: '/leetcode/my-practice'
    },
    {
      name: 'Training Sessions',
      value: dashboardData?.trainingSessions || 0,
      icon: Calendar,
      color: 'bg-purple-500',
      href: '/training/sessions'
    },
    {
      name: 'Pending Reports',
      value: dashboardData?.pendingReports || 0,
      icon: AlertCircle,
      color: 'bg-orange-500',
      href: '/training/reports'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-sm p-6 text-white">
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.name}!
        </h1>
        <p className="mt-2 text-blue-100">
          Here's what's happening with your training and practice today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="card hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Recent LeetCode Tasks</h3>
          </div>
          <div className="space-y-3">
            {dashboardData?.recentTasks?.length > 0 ? (
              dashboardData.recentTasks.map((task) => (
                <div key={task._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                    <p className="text-sm text-gray-500">
                      Due: {new Date(task.deadline).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to={`/leetcode/tasks/${task._id}`}
                    className="btn-primary text-sm"
                  >
                    View
                  </Link>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Code className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No recent tasks</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Training Sessions */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Upcoming Training Sessions</h3>
          </div>
          <div className="space-y-3">
            {dashboardData?.upcomingSessions?.length > 0 ? (
              dashboardData.upcomingSessions.map((session) => (
                <div key={session._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{session.title}</h4>
                    <p className="text-sm text-gray-500">{session.collegeName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(session.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    to={`/training/sessions/${session._id}`}
                    className="btn-primary text-sm"
                  >
                    View
                  </Link>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No upcoming sessions</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">This Month's Progress</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-2">
              <Trophy className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {dashboardData?.monthlyStats?.submissions || 0}
            </p>
            <p className="text-sm text-gray-500">Code Submissions</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {dashboardData?.monthlyStats?.completedTasks || 0}
            </p>
            <p className="text-sm text-gray-500">Tasks Completed</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mx-auto mb-2">
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {dashboardData?.monthlyStats?.trainingSessions || 0}
            </p>
            <p className="text-sm text-gray-500">Training Sessions</p>
          </div>
        </div>
      </div>

      {/* Admin Quick Access */}
      {user?.role === 'admin' && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Admin Quick Access</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/admin/users"
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Users className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Manage Users</p>
                <p className="text-sm text-gray-500">Add, edit, or deactivate users</p>
              </div>
            </Link>
            <Link
              to="/admin/tasks"
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Code className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Manage Tasks</p>
                <p className="text-sm text-gray-500">Create and assign LeetCode tasks</p>
              </div>
            </Link>
            <Link
              to="/admin/training"
              className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Calendar className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Training Sessions</p>
                <p className="text-sm text-gray-500">Schedule and manage training</p>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
