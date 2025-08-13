import React, { useState, Fragment, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isBefore, isAfter, isToday, parseISO, addDays, isWithinInterval, startOfToday, endOfDay, isAfter as isAfterDate, isBefore as isBeforeDate } from 'date-fns';
import {
  Clock, Code, Plus, AlertTriangle,
  ChevronDown, Calendar, Check, X, Copy, Edit, Trash2,
  Users, XCircle, Search, Filter
} from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import TaskFilters from '../../components/TaskFilters';

const LeetCodeTasks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeletedTasks, setShowDeletedTasks] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    difficulty: 'all',
    dateRange: 'all',
    customDateRange: {
      startDate: new Date(),
      endDate: addDays(new Date(), 7),
      key: 'selection'
    },
    showFilters: false
  });

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [permanentDelete, setPermanentDelete] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [taskToDuplicate, setTaskToDuplicate] = useState(null);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle date range changes
  const handleDateRangeChange = (range) => {
    setFilters(prev => ({
      ...prev,
      customDateRange: range.selection
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setFilters({
      status: 'all',
      difficulty: 'all',
      dateRange: 'all',
      customDateRange: {
        startDate: new Date(),
        endDate: addDays(new Date(), 7),
        key: 'selection'
      },
      showFilters: false
    });
  };

  // Fetch tasks with filters
  const { data: tasksData = [], isLoading, error, refetch } = useQuery({
    queryKey: ['leetcode-tasks', filters, searchTerm, showDeletedTasks],
    queryFn: async () => {
      // console.log('🔍 Fetching tasks from API...');
      const params = new URLSearchParams();
      if (showDeletedTasks && isAdmin) {
        params.append('includeDeleted', 'true');
      }
      const url = `/leetcode/tasks${params.toString() ? '?' + params.toString() : ''}`;
      const response = await api.get(url);
      // console.log('🔍 API response:', response.data);
      const tasks = response.data.tasks || response.data || [];
      // console.log('🔍 Parsed tasks:', tasks);
      return tasks;
    },
    refetchOnWindowFocus: false,
    retry: 1
  });

  // Apply filters to tasks
  const filteredTasks = useMemo(() => {
    return tasksData.filter(task => {
      // Enhanced search filter - includes title, description, and question numbers
      const matchesSearch = !searchTerm || (() => {
        const searchLower = searchTerm.toLowerCase();
        
        // Search in title and description
        const titleMatch = task.title.toLowerCase().includes(searchLower);
        const descriptionMatch = task.description?.toLowerCase().includes(searchLower);
        
        // Search in question numbers (both as string and number)
        const questionNumberMatch = task.questions?.some(q => 
          q.questionNumber.toString().includes(searchTerm) ||
          q.title?.toLowerCase().includes(searchLower)
        );
        
        return titleMatch || descriptionMatch || questionNumberMatch;
      })();

      // Status filter
      const now = new Date();
      const deadline = parseISO(task.deadline);
      let matchesStatus = true;

      if (filters.status === 'active') {
        matchesStatus = isBefore(now, deadline) || isToday(deadline);
      } else if (filters.status === 'upcoming') {
        matchesStatus = isAfter(deadline, now) && !isToday(deadline);
      } else if (filters.status === 'expired') {
        matchesStatus = isBefore(deadline, now) && !isToday(deadline);
      } else if (filters.status === 'completed') {
        // Assuming task has a 'completed' property
        matchesStatus = task.completed === true;
      }

      // Difficulty filter
      const matchesDifficulty = filters.difficulty === 'all' ||
        task.questions?.some(q => q.difficulty === filters.difficulty);

      // Date range filter
      let matchesDateRange = true;
      if (filters.dateRange !== 'all') {
        const start = startOfToday();
        let end;

        switch (filters.dateRange) {
          case 'today':
            end = endOfDay(now);
            matchesDateRange = isWithinInterval(deadline, { start, end });
            break;
          case 'week':
            end = endOfDay(addDays(now, 7));
            matchesDateRange = isWithinInterval(deadline, { start, end });
            break;
          case 'next7':
            end = endOfDay(addDays(now, 7));
            matchesDateRange = isWithinInterval(deadline, { start, end });
            break;
          case 'next30':
            end = endOfDay(addDays(now, 30));
            matchesDateRange = isWithinInterval(deadline, { start, end });
            break;
          case 'custom':
            matchesDateRange = isWithinInterval(deadline, {
              start: filters.customDateRange.startDate,
              end: filters.customDateRange.endDate
            });
            break;
          default:
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesDifficulty && matchesDateRange;
    });
  }, [tasksData, searchTerm, filters]);

  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ taskId, permanent = false }) => {
      const url = permanent 
        ? `/leetcode/tasks/${taskId}?permanent=true`
        : `/leetcode/tasks/${taskId}`;
      await api.delete(url);
      return { permanent };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['leetcode-tasks']);
      toast.success(data.permanent ? 'Task permanently deleted' : 'Task deleted successfully');
      setShowDeleteModal(false);
      setTaskToDelete(null);
    },
    onError: (error) => {
      console.error('Delete task error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete task');
    }
  });

  // Duplicate task mutation
  const duplicateMutation = useMutation({
    mutationFn: async (taskId) => {
      const response = await api.post(`/leetcode/tasks/${taskId}/duplicate`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['leetcode-tasks']);
      toast.success('Task duplicated successfully');
      setShowDuplicateModal(false);
      navigate(`/leetcode/tasks/${data.task._id}/edit`);
    },
    onError: (error) => {
      console.error('Duplicate task error:', error);
      toast.error(error.response?.data?.message || 'Failed to duplicate task');
    }
  });

  // Restore task mutation
  const restoreMutation = useMutation({
    mutationFn: async (taskId) => {
      const response = await api.patch(`/leetcode/tasks/${taskId}/restore`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leetcode-tasks']);
      toast.success('Task restored successfully');
    },
    onError: (error) => {
      console.error('Restore task error:', error);
      toast.error(error.response?.data?.message || 'Failed to restore task');
    }
  });

  const tasks = tasksData || [];
  const isAdmin = user?.role === 'admin';

  // Handle duplicate click
  const handleDuplicateClick = (task) => {
    setTaskToDuplicate(task);
    setShowDuplicateModal(true);
  };

  // Get deadline status with additional status and icon
  const getLeetCodeDeadlineStatus = (deadline) => {
    if (!deadline) return {
      status: 'no-deadline',
      text: 'No deadline',
      color: 'text-gray-500',
      icon: <Clock size={16} />
    };

    const now = new Date();
    const dueDate = new Date(deadline);
    const diffTime = dueDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (isBefore(dueDate, now)) {
      return {
        status: 'overdue',
        text: 'Overdue',
        color: 'text-red-600',
        icon: <AlertTriangle size={16} className="text-red-500" />
      };
    } else if (diffDays === 0) {
      return {
        status: 'due-today',
        text: 'Due today',
        color: 'text-yellow-600',
        icon: <Clock size={16} className="text-yellow-500" />
      };
    } else if (diffDays === 1) {
      return {
        status: 'due-tomorrow',
        text: 'Due tomorrow',
        color: 'text-yellow-600',
        icon: <Clock size={16} className="text-yellow-500" />
      };
    } else if (diffDays <= 7) {
      return {
        status: 'due-soon',
        text: `Due in ${diffDays} days`,
        color: 'text-yellow-600',
        icon: <Clock size={16} className="text-yellow-500" />
      };
    } else {
      return {
        status: 'upcoming',
        text: `Due ${format(dueDate, 'MMM d, yyyy')}`,
        color: 'text-gray-500',
        icon: <Calendar size={16} className="text-gray-500" />
      };
    }
  };

  // Handle delete click
  const handleDeleteClick = (task) => {
    setTaskToDelete(task);
    setPermanentDelete(false);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (taskToDelete) {
      deleteMutation.mutate({ 
        taskId: taskToDelete._id, 
        permanent: permanentDelete 
      });
    }
  };

  // Confirm duplicate
  const confirmDuplicate = () => {
    if (taskToDuplicate) {
      duplicateMutation.mutate(taskToDuplicate._id);
    }
  };

  const renderTaskCards = () => {
    // Debug logging
    // console.log('🔍 Rendering task cards. Tasks data:', tasksData);
    // console.log('🔍 Filtered tasks:', filteredTasks);
    
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Error loading tasks: {error.message}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (filteredTasks.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-lg shadow p-6">
          <Code className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm || Object.values(filters).some(f => f !== 'all' && f !== false)
              ? 'No tasks match your filters'
              : 'No tasks found'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || Object.values(filters).some(f => f !== 'all' && f !== false)
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating a new task.'}
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => navigate('/leetcode/tasks/new')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              New Task
            </button>
            {(searchTerm || Object.values(filters).some(f => f !== 'all' && f !== false)) && (
              <button
                type="button"
                onClick={resetFilters}
                className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <X className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                Clear filters
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTasks.map((task) => {
          const deadlineStatus = getLeetCodeDeadlineStatus(task.deadline);
          const isDeleted = task.isActive === false;
          
          // Debug logging for each task
          // console.log(`🔍 Task "${task.title}" questions:`, task.questions);

          return (
            <div key={task._id} className={`rounded-lg shadow-sm border transition-shadow duration-200 ${
              isDeleted 
                ? 'bg-red-50 border-red-200 opacity-75' 
                : 'bg-white border-gray-200 hover:shadow-md'
            }`}>
              <div className="p-6">
                {/* Header with title and status */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className={`text-lg font-semibold truncate ${isDeleted ? 'text-red-700' : 'text-gray-900'}`}>
                        {task.title}
                      </h3>
                      {isDeleted && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          🗑️ Deleted
                        </span>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${deadlineStatus.color}`}>
                      {deadlineStatus.text}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {task.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{task.description}</p>
                )}

                {/* Task Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Code className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{task.questions?.length || 0} questions</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>Created by {task.createdBy?.name || 'Unknown'}</span>
                  </div>
                </div>

                {/* Questions Preview */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {task.questions?.slice(0, 2).map((question, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                      >
                        #{question.questionNumber}
                      </span>
                    ))}
                    {task.questions?.length > 2 && (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                        +{task.questions.length - 2} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  {!isDeleted ? (
                    <Link
                      to={`/leetcode/tasks/${task._id}`}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      View Task
                    </Link>
                  ) : (
                    <span className="text-sm text-red-600 font-medium">
                      Task is deleted
                    </span>
                  )}

                  {isAdmin && (
                    <div className="flex items-center space-x-2">
                      {isDeleted ? (
                        <button
                          onClick={() => restoreMutation.mutate(task._id)}
                          disabled={restoreMutation.isLoading}
                          className="inline-flex items-center px-3 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
                        >
                          {restoreMutation.isLoading ? 'Restoring...' : '🔄 Restore'}
                        </button>
                      ) : (
                        <>
                          <Link
                            to={`/leetcode/tasks/${task._id}/edit`}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Link>

                          <Menu as="div" className="relative inline-block text-left">
                            <div>
                              <Menu.Button className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" />
                                </svg>
                              </Menu.Button>
                            </div>

                            <Transition
                              as={Fragment}
                              enter="transition ease-out duration-100"
                              enterFrom="transform opacity-0 scale-95"
                              enterTo="transform opacity-100 scale-100"
                              leave="transition ease-in duration-75"
                              leaveFrom="transform opacity-100 scale-100"
                              leaveTo="transform opacity-0 scale-95"
                            >
                              <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                <div className="py-1">
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={() => handleDuplicateClick(task)}
                                        className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                                          } flex items-center w-full text-left px-4 py-2 text-sm`}
                                      >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Duplicate
                                      </button>
                                    )}
                                  </Menu.Item>
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={() => handleDeleteClick(task)}
                                        className={`${active ? 'bg-red-50 text-red-700' : 'text-red-600'
                                          } flex items-center w-full text-left px-4 py-2 text-sm`}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </button>
                                    )}
                                  </Menu.Item>
                                </div>
                              </Menu.Items>
                            </Transition>
                          </Menu>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading tasks</h3>
        <p className="mt-1 text-sm text-gray-500">
          {error.message || 'Failed to load tasks. Please try again.'}
        </p>
        <div className="mt-6">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Delete Task
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete the task "{taskToDelete?.title}"?
                    </p>
                    
                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <input
                          id="permanent-delete"
                          type="checkbox"
                          checked={permanentDelete}
                          onChange={(e) => setPermanentDelete(e.target.checked)}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                        />
                        <label htmlFor="permanent-delete" className="ml-2 text-sm text-gray-700">
                          <span className="font-medium text-red-600">Permanently delete</span> (removes task and all submissions)
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        {permanentDelete 
                          ? '⚠️ This will permanently remove the task and all related submissions from the database. This cannot be undone!'
                          : 'Task will be hidden but can be restored later if needed.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-1 sm:text-sm"
                  disabled={deleteMutation.isLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:mt-0 sm:text-sm"
                  disabled={deleteMutation.isLoading}
                >
                  {deleteMutation.isLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Confirmation Modal */}
      {showDuplicateModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <Copy className="h-6 w-6 text-blue-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Duplicate Task
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Create a copy of "{taskToDuplicate?.title}"? You can modify it after creation.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-1 sm:text-sm"
                  disabled={duplicateMutation.isLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDuplicate}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:mt-0 sm:text-sm"
                  disabled={duplicateMutation.isLoading}
                >
                  {duplicateMutation.isLoading ? 'Duplicating...' : 'Duplicate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">LeetCode Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} found
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => {
              // console.log('🔄 Force refreshing tasks...');
              refetch();
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            🔄 Refresh
          </button>
          
          <Link
            to="/leetcode/my-practice"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Code className="mr-2 h-4 w-4" />
            My Practice
          </Link>

          <Link
            to="/leetcode/community-practice"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <Users className="mr-2 h-4 w-4" />
            Community Practice
          </Link>

          {isAdmin && (
            <>
              <div className="flex items-center">
                <input
                  id="show-deleted"
                  type="checkbox"
                  checked={showDeletedTasks}
                  onChange={(e) => setShowDeletedTasks(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="show-deleted" className="ml-2 text-sm text-gray-700">
                  Show deleted tasks
                </label>
              </div>
              
              <Link
                to="/leetcode/tasks/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">LeetCode Tasks</h1>
          <button
            onClick={() => navigate('/leetcode/tasks/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            New Task
          </button>
        </div>
      </div>

      {/* Task Filters */}
      <TaskFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={filters}
        onFilterChange={handleFilterChange}
        onDateRangeChange={handleDateRangeChange}
        onResetFilters={resetFilters}
      />

      {renderTaskCards()}
    </div>
  );
};

export default LeetCodeTasks;
