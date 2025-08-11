import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, X } from 'lucide-react';
import api from '../../utils/api';

const roles = ['user', 'admin'];

const UserManagement = () => {
  const queryClient = useQueryClient();
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    isActive: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // List users with search and filters
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data.users || res.data;
    }
  });
  
  // Apply search and filters
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter (name or email)
      const matchesSearch = 
        !searchTerm || 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Role filter
      const matchesRole = !filters.role || user.role === filters.role;
      
      // Status filter
      const matchesStatus = 
        filters.isActive === '' || 
        (filters.isActive === 'active' && user.isActive) || 
        (filters.isActive === 'inactive' && !user.isActive);
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, filters]);
  
  const resetFilters = () => {
    setSearchTerm('');
    setFilters({
      role: '',
      isActive: ''
    });
  };
  
  const hasActiveFilters = searchTerm || filters.role || filters.isActive !== '';

  // Create user
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    role: 'user',
    password: '',
  });

  const createUser = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/admin/users', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries('admin-users');
      alert('User created');
      setCreateForm({ name: '', email: '', role: 'user', password: '' });
    },
  });

  // Update user
  const updateUser = useMutation({
    mutationFn: async ({ userId, payload }) => {
      const res = await api.put(`/admin/users/${userId}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries('admin-users');
      alert('User updated');
    },
  });

  // Deactivate/Delete user (using DELETE)
  const deleteUser = useMutation({
    mutationFn: async ({ userId }) => {
      const res = await api.delete(`/admin/users/${userId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries('admin-users');
      alert('User removed');
    },
  });

  if (isLoading) return <div className="p-4">Loading users...</div>;
  if (error) return <div className="p-4 text-red-600">Error loading users: {error.message}</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>
      
      {/* Search and Filter Bar */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users by name or email..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                {[searchTerm, filters.role, filters.isActive].filter(Boolean).length}
              </span>
            )}
          </button>
          
          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </button>
          )}
        </div>
        
        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Role Filter */}
              <div>
                <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role-filter"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                >
                  <option value="">All Roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              {/* Status Filter */}
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status-filter"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={filters.isActive}
                  onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        )}
        
        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-500">
          Showing {filteredUsers.length} of {users.length} users
          {hasActiveFilters && ' (filtered)'}
        </div>
      </div>
      
      {/* Create User Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create User</h3>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!createForm.email || !createForm.password) {
              alert('Email and default password are required');
              return;
            }
            createUser.mutate(createForm);
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="user@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <select
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={createForm.role}
                onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Default Password</label>
              <input
                type="password"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Temp@123"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" 
              type="submit" 
              disabled={createUser.isLoading}
            >
              {createUser.isLoading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
        </div>
      </div>

      {/* Users Table */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Users</h3>
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-gray-600">
              {hasActiveFilters 
                ? 'No users match the current filters. Try adjusting your search or filters.'
                : 'No users found.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((u) => (
              <UserRow
                key={u._id}
                user={u}
                onUpdate={(payload) => updateUser.mutate({ userId: u._id, payload })}
                onDelete={() => {
                  if (window.confirm('Are you sure you want to remove this user?')) {
                    deleteUser.mutate({ userId: u._id });
                  }
                }}
                isUpdating={updateUser.isLoading}
                isRemoving={deleteUser.isLoading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const UserRow = ({ user, onUpdate, onDelete, isUpdating, isRemoving }) => {
  const [edit, setEdit] = useState({
    name: user.name || '',
    role: user.role || 'user',
    isActive: user.isActive !== false,
  });

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
        <div className="col-span-2">
          <p className="font-medium text-gray-900">{user.email}</p>
          <input
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={edit.name}
            onChange={(e) => setEdit((f) => ({ ...f, name: e.target.value }))}
            placeholder="Name"
          />
        </div>
        <div>
          <select
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={edit.role}
            onChange={(e) => setEdit((f) => ({ ...f, role: e.target.value }))}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="inline-flex items-center mt-2">
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={edit.isActive}
              onChange={(e) => setEdit((f) => ({ ...f, isActive: e.target.checked }))}
            />
            <span className="ml-2 text-sm text-gray-700">Active</span>
          </label>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isUpdating}
            onClick={() => onUpdate({ name: edit.name, role: edit.role, isActive: edit.isActive })}
          >
            {isUpdating ? 'Saving...' : 'Save'}
          </button>
          <button
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isRemoving}
            onClick={onDelete}
          >
            {isRemoving ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
