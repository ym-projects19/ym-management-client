import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Trash2, Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
// eslint-disable-next-line
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { toast } from 'react-hot-toast';
import api from '../../api/client';

const TaskForm = () => {
  const { taskId } = useParams();
  const isEditMode = !!taskId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 7 days from now
    questions: [],
    assignedUsers: [],
    isActive: true
  });

  const [newQuestion, setNewQuestion] = useState({
    questionNumber: '',
    title: '',
    difficulty: 'Medium',
    url: ''
  });

  // Fetch task data if in edit mode
  const { isLoading: isLoadingTask } = useQuery({
    queryKey: ['leetcode-task', taskId],
    queryFn: async () => {
      const response = await api.get(`/leetcode/tasks/${taskId}`);
      return response.data.task;
    },
    enabled: isEditMode,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          title: data.title,
          description: data.description || '',
          deadline: new Date(data.deadline),
          questions: data.questions || [],
          assignedUsers: data.assignedUsers || [],
          isActive: data.isActive !== false
        });
      }
    }
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data.users || [];
    },
    enabled: isEditMode || true // Always fetch users
  });

  // Fetch practice question statistics for duplicate checking
  const { data: practiceStats = [], isError: practiceStatsError } = useQuery({
    queryKey: ['practice-stats'],
    queryFn: async () => {
      try {
        const response = await api.get('/leetcode/practice-stats');
        return response.data.stats || [];
      } catch (error) {
        // If the endpoint fails, fall back to empty array (graceful degradation)
        console.warn('Failed to fetch practice stats:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 1 // Only retry once
  });

  // Mutation for create/update
  const mutation = useMutation({
    mutationFn: async (data) => {
      const endpoint = isEditMode 
        ? `/leetcode/tasks/${taskId}` 
        : '/leetcode/tasks';
      const method = isEditMode ? 'put' : 'post';
      
      const response = await api[method](endpoint, data);
      return response.data;
    },
    onSuccess: () => {
      const action = isEditMode ? 'updated' : 'created';
      toast.success(`Task ${action} successfully!`);
      queryClient.invalidateQueries(['leetcode-tasks']);
      navigate('/leetcode/tasks');
    },
    onError: (error) => {
      console.error('Error saving task:', error);
      toast.error(error.response?.data?.message || 'Failed to save task');
    }
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle question input changes
  const handleQuestionChange = (e) => {
    const { name, value } = e.target;
    setNewQuestion(prev => ({
      ...prev,
      [name]: name === 'questionNumber' ? parseInt(value) || '' : value
    }));
  };

  // Check if a question number is already used in practice
  const isQuestionUsedInPractice = (questionNumber) => {
    if (!questionNumber || !practiceStats.length) return false;
    return practiceStats.some(stat => 
      stat.questionNumber === parseInt(questionNumber)
    );
  };

  // Get practice submission count for a question
  const getPracticeSubmissionCount = (questionNumber) => {
    if (!questionNumber || !practiceStats.length) return 0;
    const stat = practiceStats.find(stat => 
      stat.questionNumber === parseInt(questionNumber)
    );
    return stat ? stat.userCount : 0;
  };

  // Get practice submission details for a question
  const getPracticeSubmissionDetails = (questionNumber) => {
    if (!questionNumber || !practiceStats.length) return null;
    return practiceStats.find(stat => 
      stat.questionNumber === parseInt(questionNumber)
    );
  };

  // Add a new question
  const addQuestion = (e) => {
    e.preventDefault();
    if (!newQuestion.questionNumber || !newQuestion.title || !newQuestion.url) {
      toast.error('Please fill in all question fields');
      return;
    }

    // Check if question is already in the current task
    const isDuplicate = formData.questions.some(q => 
      q.questionNumber === parseInt(newQuestion.questionNumber)
    );

    if (isDuplicate) {
      toast.error('This question number is already added to this task');
      return;
    }

    setFormData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          questionNumber: parseInt(newQuestion.questionNumber),
          title: newQuestion.title,
          difficulty: newQuestion.difficulty,
          url: newQuestion.url
        }
      ].sort((a, b) => a.questionNumber - b.questionNumber)
    }));

    // Reset form
    setNewQuestion({
      questionNumber: '',
      title: '',
      difficulty: 'Medium',
      url: ''
    });
  };

  // Remove a question
  const removeQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  // Toggle user assignment
  const toggleUserAssignment = (userId) => {
    setFormData(prev => {
      const assignedUsers = [...prev.assignedUsers];
      const userIndex = assignedUsers.indexOf(userId);
      
      if (userIndex > -1) {
        assignedUsers.splice(userIndex, 1);
      } else {
        assignedUsers.push(userId);
      }

      return { ...prev, assignedUsers };
    });
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    const payload = {
      ...formData,
      deadline: formData.deadline.toISOString()
    };

    // console.log('🔍 TaskForm - Submitting payload:', payload);
    // console.log('🔍 TaskForm - Questions in payload:', payload.questions);

    mutation.mutate(payload);
  };

  if (isLoadingTask && isEditMode) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Task' : 'Create New Task'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEditMode 
            ? 'Update the task details and questions.' 
            : 'Create a new coding task with multiple LeetCode questions.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Task Information</h2>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div className="col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Provide a brief description of the task..."
              />
            </div>

            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
                Deadline <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <DatePicker
                  selected={formData.deadline}
                  onChange={(date) => setFormData(prev => ({ ...prev, deadline: date }))}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-10"
                  required
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              {formData.deadline < new Date() && (
                <p className="mt-1 text-sm text-yellow-600 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Deadline is in the past
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <div className="mt-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.isActive 
                    ? 'Task is visible to assigned users.'
                    : 'Task is hidden from users.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Questions</h2>
            {formData.questions.length > 0 && (
              <div className="text-sm text-gray-500">
                {(() => {
                  const practicedCount = formData.questions.filter(q => 
                    isQuestionUsedInPractice(q.questionNumber)
                  ).length;
                  return practicedCount > 0 ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {practicedCount} of {formData.questions.length} already practiced
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ All questions are new
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
          
          {practiceStats.length > 0 && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Practice Detection:</span> Questions that have been practiced by users will be highlighted with a warning indicator. This helps you avoid assigning questions that users have already solved.
              </p>
            </div>
          )}
          
          {practiceStatsError && (
            <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-700">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                <span className="font-medium">Note:</span> Unable to load practice statistics. Question duplication detection is temporarily unavailable.
              </p>
            </div>
          )}
          
          {formData.questions.length > 0 ? (
            <div className="mb-6 space-y-4">
              {formData.questions.map((q, index) => {
                const isPracticed = isQuestionUsedInPractice(q.questionNumber);
                const practiceCount = getPracticeSubmissionCount(q.questionNumber);
                
                return (
                  <div key={index} className={`border rounded-md p-4 relative ${
                    isPracticed ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">
                            #{q.questionNumber} - {q.title}
                          </h3>
                          {isPracticed && (
                            <span 
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 cursor-help"
                              title={`This question has been practiced by ${practiceCount} user(s) with ${(() => {
                                const details = getPracticeSubmissionDetails(q.questionNumber);
                                return details ? details.submissionCount : practiceCount;
                              })()} total submissions`}
                            >
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Practiced
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          Difficulty: <span className="font-medium">{q.difficulty}</span>
                        </p>
                        {isPracticed && (
                          <div className="mt-1">
                            <p className="text-xs text-yellow-600">
                              Already practiced by {practiceCount} user(s)
                            </p>
                            {(() => {
                              const details = getPracticeSubmissionDetails(q.questionNumber);
                              return details && details.submissionCount > details.userCount && (
                                <p className="text-xs text-gray-500">
                                  {details.submissionCount} total submissions
                                </p>
                              );
                            })()}
                          </div>
                        )}
                        <a 
                          href={q.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                          View on LeetCode
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-gray-400 hover:text-red-500"
                        title="Remove question"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mb-6 text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">No questions added yet</p>
            </div>
          )}

          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-medium text-gray-900">Add New Question</h3>
              <div className="text-xs text-gray-500 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1 text-yellow-500" />
                Questions already practiced will be highlighted
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
              <div className="sm:col-span-1">
                <label htmlFor="questionNumber" className="block text-sm font-medium text-gray-700">
                  #
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="questionNumber"
                    name="questionNumber"
                    value={newQuestion.questionNumber}
                    onChange={handleQuestionChange}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-indigo-500 sm:text-sm ${
                      newQuestion.questionNumber && isQuestionUsedInPractice(newQuestion.questionNumber)
                        ? 'border-yellow-300 focus:border-yellow-500 bg-yellow-50'
                        : 'border-gray-300 focus:border-indigo-500'
                    }`}
                    placeholder="1"
                    min="1"
                  />
                  {newQuestion.questionNumber && isQuestionUsedInPractice(newQuestion.questionNumber) && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </div>
                  )}
                </div>
                {newQuestion.questionNumber && isQuestionUsedInPractice(newQuestion.questionNumber) && (
                  <div className="mt-1">
                    <p className="text-xs text-yellow-600 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Already practiced by {getPracticeSubmissionCount(newQuestion.questionNumber)} user(s)
                    </p>
                    {(() => {
                      const details = getPracticeSubmissionDetails(newQuestion.questionNumber);
                      return details && details.submissionCount > details.userCount && (
                        <p className="text-xs text-gray-500">
                          {details.submissionCount} total submissions
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="sm:col-span-5">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={newQuestion.title}
                  onChange={handleQuestionChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Two Sum"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  name="difficulty"
                  value={newQuestion.difficulty}
                  onChange={handleQuestionChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="url" className="block text-sm font-medium text-gray-700">
                  LeetCode URL
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="url"
                    id="url"
                    name="url"
                    value={newQuestion.url}
                    onChange={handleQuestionChange}
                    className="block w-full rounded-none rounded-l-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="https://leetcode.com/problems/..."
                  />
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Assign Users</h2>
          <p className="text-sm text-gray-500 mb-4">
            {formData.assignedUsers.length === 0 
              ? 'This task will be visible to all users.' 
              : `This task is assigned to ${formData.assignedUsers.length} user(s).`}
          </p>
          
          <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md">
            {users.map((user) => (
              <div key={user._id} className="flex items-center">
                <input
                  id={`user-${user._id}`}
                  name="assignedUsers"
                  type="checkbox"
                  checked={formData.assignedUsers.includes(user._id)}
                  onChange={() => toggleUserAssignment(user._id)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor={`user-${user._id}`} className="ml-3 text-sm text-gray-700">
                  {user.name} ({user.email})
                  {user.role === 'admin' && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Admin
                    </span>
                  )}
                </label>
              </div>
            ))}
          </div>
          
          {users.length === 0 && (
            <p className="mt-2 text-sm text-gray-500">
              No users found. Create users in the user management section first.
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/leetcode/tasks')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isLoading || formData.questions.length === 0}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              mutation.isLoading || formData.questions.length === 0 ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {mutation.isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : isEditMode ? (
              'Update Task'
            ) : (
              'Create Task'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskForm;
