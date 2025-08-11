import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Edit, ChevronDown, ChevronUp, ExternalLink,
  Calendar as CalendarIcon, Users, Code, Clock, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { leetCodeApi } from '../../api/client';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Format date to readable string
const formatDate = (dateString) => {
  if (!dateString) return 'No deadline';
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

// Get deadline status (upcoming, overdue, none)
const getDeadlineStatus = (deadline) => {
  if (!deadline) return 'none';
  const now = new Date();
  const deadlineDate = new Date(deadline);
  return deadlineDate > now ? 'upcoming' : 'overdue';
};

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    draft: { label: 'Draft', color: 'bg-yellow-100 text-yellow-800' },
    active: { label: 'Active', color: 'bg-green-100 text-green-800' },
    completed: { label: 'Completed', color: 'bg-blue-100 text-blue-800' },
    archived: { label: 'Archived', color: 'bg-gray-100 text-gray-800' },
  };

  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

// Deadline badge component
const DeadlineBadge = ({ deadline }) => {
  if (!deadline) return null;

  const status = getDeadlineStatus(deadline);
  const config = {
    upcoming: { label: 'Upcoming', color: 'bg-blue-100 text-blue-800' },
    overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800' },
    none: { label: 'No deadline', color: 'bg-gray-100 text-gray-800' }
  }[status];

  return (
    <div className="mt-2 flex items-center text-sm text-gray-500">
      <CalendarIcon className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" />
      <span className="mr-2">{formatDate(deadline)}</span>
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
};

// Task set form component
const TaskSetForm = ({ onSubmit, onCancel, initialData }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    status: initialData?.status || 'draft',
    difficulty: initialData?.difficulty || 'medium',
    tasks: initialData?.tasks || [],
    deadline: initialData?.deadline ? new Date(initialData.deadline) : null,
  });

  const [newTask, setNewTask] = useState({
    questionNumber: '',
    title: '',
    url: '',
    difficulty: 'medium',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error('Title is required');
      return;
    }
    onSubmit({
      ...formData,
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
    });
  };

  const addTask = () => {
    if (!newTask.questionNumber || !newTask.title) {
      toast.error('Question number and title are required');
      return;
    }
    setFormData({
      ...formData,
      tasks: [...formData.tasks, { ...newTask }],
    });
    setNewTask({
      questionNumber: '',
      title: '',
      url: '',
      difficulty: 'medium',
    });
  };

  const removeTask = (index) => {
    const updatedTasks = [...formData.tasks];
    updatedTasks.splice(index, 1);
    setFormData({
      ...formData,
      tasks: updatedTasks,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
            Deadline
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <DatePicker
              selected={formData.deadline}
              onChange={(date) => setFormData({ ...formData, deadline: date })}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="MMMM d, yyyy h:mm aa"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholderText="Select deadline (optional)"
              isClearable
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Set a deadline to track submission timeliness
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Difficulty</label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={formData.difficulty}
            onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Tasks</h3>
        <div className="space-y-4">
          {formData.tasks.map((task, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded-md">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-medium">#{task.questionNumber}</span>
                  <span className="ml-2">{task.title}</span>
                  {task.url && (
                    <a
                      href={task.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 hover:text-blue-800 text-sm inline-flex items-center"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeTask(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Question #</label>
                <input
                  type="text"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  value={newTask.questionNumber}
                  onChange={(e) => setNewTask({ ...newTask, questionNumber: e.target.value })}
                  placeholder="e.g., 1"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                <input
                  type="text"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g., Two Sum"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Difficulty</label>
                <select
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  value={newTask.difficulty}
                  onChange={(e) => setNewTask({ ...newTask, difficulty: e.target.value })}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">URL (optional)</label>
                <input
                  type="text"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  value={newTask.url}
                  onChange={(e) => setNewTask({ ...newTask, url: e.target.value })}
                  placeholder="https://leetcode.com/problems/..."
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addTask}
                  className="w-full bg-blue-600 text-white px-3 py-1.5 text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Add Task
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {initialData ? 'Update Task Set' : 'Create Task Set'}
        </button>
      </div>
    </form>
  );
};

// Task set item component
const TaskSetItem = ({ taskSet, onEdit, onDelete }) => {
  const deadlineStatus = getDeadlineStatus(taskSet.deadline);
  const [isExpanded, setIsExpanded] = useState(false);
  const taskCount = taskSet.tasks?.length || 0;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="p-4 bg-white hover:bg-gray-50 cursor-pointer flex justify-between items-center"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-medium text-gray-900 truncate">{taskSet.title}</h3>
            <StatusBadge status={taskSet.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
            {taskSet.deadline && ` • Due: ${new Date(taskSet.deadline).toLocaleDateString()}`}
          </p>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(taskSet);
            }}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(taskSet._id);
            }}
            className="text-red-600 hover:text-red-800 p-1"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button className="text-gray-500 p-1">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          {taskSet.description && (
            <p className="text-sm text-gray-700 mb-3">{taskSet.description}</p>
          )}

          <div className="space-y-2">
            {taskSet.tasks?.map((task, index) => (
              <div key={index} className="flex items-center text-sm">
                <span className="font-medium w-10">#{task.questionNumber}</span>
                <span className="flex-1">{task.title}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${task.difficulty === 'easy'
                  ? 'bg-green-100 text-green-800'
                  : task.difficulty === 'hard'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                  }`}>
                  {task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1)}
                </span>
                {task.url && (
                  <a
                    href={task.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-800 text-sm inline-flex items-center"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
          <DeadlineBadge deadline={taskSet.deadline} />
        </div>
      )}
    </div>
  );
};

// Submission status badge component
const SubmissionStatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-4 w-4" /> },
    accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-4 w-4" /> },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: <XCircle className="h-4 w-4" /> },
    late: { label: 'Late', color: 'bg-orange-100 text-orange-800', icon: <AlertCircle className="h-4 w-4" /> }
  };

  const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

const LeetCodeAdmin = () => {
  const [activeTab, setActiveTab] = useState('task-sets');
  const [showForm, setShowForm] = useState(false);
  const [editingTaskSet, setEditingTaskSet] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deadlineFilter, setDeadlineFilter] = useState('all');
  const [submissionFilters, setSubmissionFilters] = useState({
    userId: '',
    questionId: '',
    status: 'all',
    deadlineStatus: 'all',
    search: ''
  });
  const [users, setUsers] = useState([]);
  const [submissionsError, setSubmissionsError] = useState(null);
  const queryClient = useQueryClient();

  // Fetch task sets
  const { data: taskSets = [], isLoading: isLoadingTaskSets, error: taskSetsError } = useQuery({
    queryKey: ['leetcodeTaskSets'],
    queryFn: leetCodeApi.getTaskSets,
    select: (response) => response.data.tasks || response.data,
  });

  // Fetch users for filter
  const { data: usersData = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => leetCodeApi.getUsers(),
    select: (response) => response.data.users || response.data,
    onSuccess: (data) => {
      setUsers(data);
    },
  });

  // Fetch submissions with filters
  const { data: submissionsResponse = {}, isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ['leetcodeSubmissions', submissionFilters],
    queryFn: () => leetCodeApi.getSubmissions(submissionFilters),
    onError: (error) => {
      setSubmissionsError(error.response?.data?.message || 'Failed to load submissions');
    },
    select: (response) => response.data,
    enabled: activeTab === 'submissions',
  });

  const submissions = submissionsResponse.submissions || [];

  // Create task set
  const createTaskSetMutation = useMutation({
    mutationFn: leetCodeApi.createTaskSet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leetcodeTaskSets'] });
      toast.success('Task set created successfully');
      setShowForm(false);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create task set');
    },
  });

  // Update task set
  const updateTaskSetMutation = useMutation({
    mutationFn: ({ id, ...data }) => leetCodeApi.updateTaskSet(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leetcodeTaskSets'] });
      toast.success('Task set updated successfully');
      setShowForm(false);
      setEditingTaskSet(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update task set');
    },
  });

  // Delete task set
  const deleteTaskSetMutation = useMutation({
    mutationFn: leetCodeApi.deleteTaskSet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leetcodeTaskSets'] });
      toast.success('Task set deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete task set');
    },
  });

  const handleEdit = (taskSet) => {
    setEditingTaskSet(taskSet);
    setShowForm(true);
  };

  const handleDelete = (taskSetId) => {
    if (window.confirm('Are you sure you want to delete this task set? This action cannot be undone.')) {
      deleteTaskSetMutation.mutate(taskSetId);
    }
  };

  const handleSubmit = (taskSet) => {
    if (editingTaskSet) {
      updateTaskSetMutation.mutate({ id: editingTaskSet._id, ...taskSet });
    } else {
      createTaskSetMutation.mutate(taskSet);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTaskSet(null);
  };

  const handleSubmissionFilterChange = (e) => {
    const { name, value } = e.target;
    setSubmissionFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setSubmissionFilters({
      userId: '',
      questionId: '',
      status: 'all',
      deadlineStatus: 'all',
      search: ''
    });
  };

  const getSubmissionStatus = (submission, taskSet) => {
    if (submission.status === 'accepted') {
      if (taskSet?.deadline && new Date(submission.submittedAt) > new Date(taskSet.deadline)) {
        return 'late';
      }
      return 'accepted';
    }
    return submission.status || 'pending';
  };

  // Group task sets by status
  const taskSetsByStatus = taskSets.reduce((acc, taskSet) => {
    const status = taskSet.status || 'draft';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(taskSet);
    return acc;
  }, {});

  const statusOrder = ['active', 'draft', 'completed', 'archived'];

  // Filter and sort task sets
  const filteredTaskSets = useMemo(() => {
    return taskSets.filter(taskSet => {
      // Filter by status
      if (statusFilter !== 'all' && taskSet.status !== statusFilter) {
        return false;
      }

      // Filter by deadline
      if (deadlineFilter !== 'all') {
        const status = getDeadlineStatus(taskSet.deadline);
        if (deadlineFilter !== status) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort by status first (using the predefined order)
      const statusA = statusOrder.indexOf(a.status);
      const statusB = statusOrder.indexOf(b.status);

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      // Then sort by deadline (earlier deadlines first)
      if (a.deadline && b.deadline) {
        return new Date(a.deadline) - new Date(b.deadline);
      } else if (a.deadline) {
        return -1;
      } else if (b.deadline) {
        return 1;
      }

      // Finally sort by title
      return a.title.localeCompare(b.title);
    });
  }, [taskSets, statusFilter, deadlineFilter]);

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('task-sets')}
            className={`${activeTab === 'task-sets'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Task Sets
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`${activeTab === 'submissions'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Submissions
          </button>
        </nav>
      </div>

      {activeTab === 'task-sets' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">LeetCode Task Sets</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage coding challenges and track submissions
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTaskSet(null);
                setShowForm(true);
              }}
              disabled={createTaskSetMutation.isLoading || updateTaskSetMutation.isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Create Task Set
            </button>
          </div>

          {showForm && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                {editingTaskSet ? 'Edit Task Set' : 'Create New Task Set'}
              </h2>
              <TaskSetForm
                initialData={editingTaskSet}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />
            </div>
          )}

          {taskSets.length === 0 ? (
            <div className="text-center py-12 border-2 border-gray-300 border-dashed rounded-lg">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No task sets</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new task set.
              </p>
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={() => {
                    setEditingTaskSet(null);
                    setShowForm(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="-ml-1 mr-2 h-5 w-5" />
                  Create Task Set
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {statusOrder.map((status) =>
                taskSetsByStatus[status]?.length > 0 ? (
                  <div key={status} className="space-y-4">
                    <h2 className="text-lg font-medium text-gray-900 capitalize">
                      {status} ({taskSetsByStatus[status].length})
                    </h2>
                    <div className="space-y-4">
                      {taskSetsByStatus[status].map((taskSet) => (
                        <TaskSetItem
                          key={taskSet._id}
                          taskSet={taskSet}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'submissions' && (
        <div className="space-y-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <select
                  name="userId"
                  value={submissionFilters.userId}
                  onChange={handleSubmissionFilterChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">All Users</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>
                      {user.name || user.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                <select
                  name="questionId"
                  value={submissionFilters.questionId}
                  onChange={handleSubmissionFilterChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">All Questions</option>
                  {taskSets.flatMap(taskSet =>
                    taskSet.tasks?.map(task => (
                      <option key={`${taskSet._id}-${task.questionNumber}`} value={task.questionNumber}>
                        {task.title} (Q{task.questionNumber}) - {taskSet.title}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={submissionFilters.status}
                  onChange={handleSubmissionFilterChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="late">Late Submissions</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Runtime
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissionsError ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-sm text-red-500">
                        Error: {submissionsError}
                      </td>
                    </tr>
                  ) : isLoadingSubmissions ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                        Loading submissions...
                      </td>
                    </tr>
                  ) : submissions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                        No submissions found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    submissions.map((submission) => {
                      // Find the task set and question
                      const taskSet = taskSets.find(ts => 
                        ts.tasks?.some(t => t.questionNumber === submission.questionNumber)
                      );
                      const question = taskSet?.tasks?.find(t => t.questionNumber === submission.questionNumber);
                      const status = getSubmissionStatus(submission, taskSet);

                      return (
                        <tr key={submission._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <Users className="h-6 w-6 text-gray-400" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {submission.user?.name || 'Unknown User'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {submission.user?.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {question?.title || `Question ${submission.questionNumber}`}
                            </div>
                            <div className="text-sm text-gray-500">
                              Lang : {submission.language}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <SubmissionStatusBadge status={status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(submission.submittedAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {submission.runtime ? `${submission.runtime} ms` : 'N/A'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeetCodeAdmin;