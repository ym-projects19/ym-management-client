import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Code,
  BookOpen,
  Users,
  Settings,
  X,
  ChevronRight,
  Trophy,
  Calendar,
  FileText,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    {
      name: 'LeetCode Practice',
      icon: Code,
      children: [
        { name: 'Active Tasks', href: '/leetcode/tasks', icon: BookOpen },
        { name: 'My Practice', href: '/leetcode/my-practice', icon: Trophy },
      ]
    },
    {
      name: 'Training Sessions',
      icon: Calendar,
      children: [
        { name: 'My Sessions', href: '/training/sessions', icon: Calendar },
        { name: 'My Reports', href: '/training/reports/my', icon: FileText },
        { name: 'Activity', href: '/training/activity', icon: BarChart3 },
      ]
    },
  ];

  // Add admin navigation if user is admin
  if (user?.role === 'admin') {
    navigation.push({
      name: 'Administration',
      icon: Settings,
      children: [
        { name: 'Dashboard', href: '/admin/dashboard', icon: BarChart3 },
        { name: 'User Management', href: '/admin/users', icon: Users },
        { name: 'Task Management', href: '/admin/tasks', icon: Code },
        { name: 'Submissions', href: '/admin/leetcode/submissions', icon: FileText },
        { name: 'Training Management', href: '/admin/training', icon: Calendar },
        { name: 'Training Reports', href: '/admin/training-reports', icon: FileText },
      ]
    });
  }

  const isActiveLink = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const NavItem = ({ item, level = 0 }) => {
    const [isExpanded, setIsExpanded] = React.useState(
      item.children?.some(child => isActiveLink(child.href)) || false
    );

    if (item.children) {
      return (
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium rounded-md transition-colors ${level === 0 ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <div className="flex items-center">
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </div>
            <ChevronRight
              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.children.map((child) => (
                <NavItem key={child.name} item={child} level={level + 1} />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        to={item.href}
        onClick={onClose}
        className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${isActiveLink(item.href)
          ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
          : level === 0
            ? 'text-gray-700 hover:bg-gray-100'
            : 'text-gray-600 hover:bg-gray-50'
          }`}
      >
        <item.icon className="h-5 w-5 mr-3" />
        {item.name}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Code className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="ml-3">
              <h2 className="text-lg font-semibold text-gray-900">Training</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-6 px-4">
          <div className="space-y-2">
            {navigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </div>
        </nav>

        {/* User info at bottom */}
        {/* <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-600 text-white rounded-full">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div> */}
      </div>
    </>
  );
};

export default Sidebar;