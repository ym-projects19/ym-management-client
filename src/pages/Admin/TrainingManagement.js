import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, X, Users } from 'lucide-react';
import api from '../../api/client';

const TrainingManagement = () => {
  const queryClient = useQueryClient();

  // Fetch sessions
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-training-sessions'],
    queryFn: async () => {
      const res = await api.get('/admin/training/sessions');
      return res.data.sessions || res.data;
    }
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      const userData = res.data.users || res.data || [];
      // Ensure users are objects with proper structure
      return Array.isArray(userData) ? userData.filter(user => user && typeof user === 'object' && user._id) : [];
    }
  });

  // Create session form
  const [sessionForm, setSessionForm] = useState({
    title: '',
    collegeName: '',
    location: '',
    scheduledDate: '',
    assignedUsers: [],
    description: '',
  });

  // User selection state
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Helper functions for user selection
  const handleUserSelect = (user) => {
    if (!user || !user._id) return;
    
    const currentUsers = Array.isArray(sessionForm.assignedUsers) ? sessionForm.assignedUsers : [];
    if (!currentUsers.find(u => u._id === user._id)) {
      setSessionForm(prev => ({
        ...prev,
        assignedUsers: [...currentUsers, user]
      }));
    }
    setShowUserDropdown(false);
  };

  const handleUserRemove = (userId) => {
    if (!userId) return;
    
    const currentUsers = Array.isArray(sessionForm.assignedUsers) ? sessionForm.assignedUsers : [];
    setSessionForm(prev => ({
      ...prev,
      assignedUsers: currentUsers.filter(u => u._id !== userId)
    }));
  };

  const createSession = useMutation({
    mutationFn: async (payload) => {
      const body = {
        title: payload.title || undefined,
        collegeName: payload.collegeName || undefined,
        location: payload.location || undefined,
        scheduledDate: payload.scheduledDate || undefined,
        description: payload.description || undefined,
        assignedUsers: payload.assignedUsers.map(u => u._id), // Send user IDs to backend
      };

      const res = await api.post('/admin/training/sessions', body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries('admin-training-sessions');
      alert('Training session created');
      setSessionForm({
        title: '',
        collegeName: '',
        location: '',
        scheduledDate: '',
        assignedUsers: [],
        description: '',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading training sessions.</p>
      </div>
    );
  }

  const sessions = Array.isArray(data) ? data.filter(session => session && typeof session === 'object') : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Training Management</h1>

      {/* Create Session */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create Training Session</h3>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!sessionForm.collegeName && !sessionForm.title) {
                alert('Provide a title or college name');
                return;
              }
              createSession.mutate(sessionForm);
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={sessionForm.title}
                  onChange={(e) => setSessionForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Cloud Workshop"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">College Name</label>
                <input
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={sessionForm.collegeName}
                  onChange={(e) => setSessionForm((f) => ({ ...f, collegeName: e.target.value }))}
                  placeholder="XYZ Engineering College"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Location</label>
                <input
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={sessionForm.location}
                  onChange={(e) => setSessionForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder="Bengaluru, IN"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Scheduled Date/Time</label>
                <input
                  type="datetime-local"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={sessionForm.scheduledDate}
                  onChange={(e) => setSessionForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Assigned Users</label>
                <div className="mt-1 relative">
                  {/* Selected Users */}
                  {Array.isArray(sessionForm.assignedUsers) && sessionForm.assignedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {sessionForm.assignedUsers.map((user) => (
                        <span
                          key={user._id || user.email}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {String(user.name || user.email || 'Unknown User')}
                          <button
                            type="button"
                            onClick={() => handleUserRemove(user._id)}
                            className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-600 focus:outline-none"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Dropdown Button */}
                  <button
                    type="button"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <span className="flex items-center">
                      <Users className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="block truncate text-gray-500">
                        {Array.isArray(sessionForm.assignedUsers) && sessionForm.assignedUsers.length > 0
                          ? `${sessionForm.assignedUsers.length} user(s) selected`
                          : 'Select users to assign'
                        }
                      </span>
                    </span>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  {showUserDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                      {users.length === 0 ? (
                        <div className="px-4 py-2 text-gray-500">No users available</div>
                      ) : (
                        users.map((user) => {
                          const isSelected = sessionForm.assignedUsers.find(u => u._id === user._id);
                          return (
                            <button
                              key={user._id}
                              type="button"
                              onClick={() => handleUserSelect(user)}
                              disabled={isSelected}
                              className={`${isSelected
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'text-gray-900 hover:bg-blue-50 hover:text-blue-600'
                                } w-full text-left px-4 py-2 text-sm transition-colors`}
                            >
                              <div className="flex items-center">
                                <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                  <Users className="w-4 h-4 text-gray-500" />
                                </div>
                                <div className="ml-3">
                                  <div className="font-medium">{String(user.name || 'No Name')}</div>
                                  <div className="text-gray-500 text-xs">{String(user.email || 'No Email')}</div>
                                </div>
                                {isSelected && (
                                  <div className="ml-auto text-blue-600">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
                <textarea
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  rows={3}
                  value={sessionForm.description}
                  onChange={(e) => setSessionForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief about the session"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={createSession.isLoading}
              >
                {createSession.isLoading ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sessions list */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Sessions</h3>

          {sessions.length === 0 ? (
            <p className="text-gray-600">No sessions yet.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s._id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{String(s.title || s.collegeName || 'Untitled Session')}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {s.collegeName ? `${String(s.collegeName)} • ` : ''}
                        {s.location ? String(s.location) : ''} {s.scheduledDate ? `• ${new Date(s.scheduledDate).toLocaleString()}` : ''}
                      </p>
                      {s.description && (
                        <p className="text-sm text-gray-500 mt-1">{String(s.description)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {s.assignedUsers?.length || 0} users assigned
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainingManagement;
