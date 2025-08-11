import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Code, 
  BookOpen, 
  Users, 
  Settings,
  Activity
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const AppSidebar = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'LeetCode', href: '/leetcode/tasks', icon: Code },
    { name: 'Training', href: '/training/sessions', icon: BookOpen },
    { name: 'Activity', href: '/training/activity', icon: Activity },
  ];

  const adminNavigation = [
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Admin Dashboard', href: '/admin/dashboard', icon: Settings },
  ];

  return (
    <div className="flex flex-col w-64 bg-gray-800">
      <div className="flex items-center h-16 px-4 bg-gray-900">
        <h1 className="text-white text-lg font-semibold">Task Management</h1>
      </div>
      
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <item.icon className="mr-3 h-6 w-6" />
            {item.name}
          </NavLink>
        ))}
        
        {isAdmin && (
          <>
            <div className="border-t border-gray-700 my-4"></div>
            <div className="px-2 py-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Admin
              </h3>
            </div>
            {adminNavigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`
                }
              >
                <item.icon className="mr-3 h-6 w-6" />
                {item.name}
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </div>
  );
};

export default AppSidebar;