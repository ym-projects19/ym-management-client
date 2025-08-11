import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';

const TaskManagement = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Debug current user
  useEffect(() => {
    console.log('🔍 TaskManagement - Current user:', user);
    console.log('🔍 TaskManagement - User role:', user?.role);
    console.log('🔍 TaskManagement - Is admin:', user?.role === 'admin');
  }, [user]);

  // Fetch tasks
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-tasks'],
    queryFn: async () => {
      const res = await api.get('/leetcode/tasks?includeDeleted=true');
      return res.data.tasks || res.data;
    }
  });

  // Create task form
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    deadline: '',
    questions: [{ questionNumber: '', title: '', leetcodeUrl: '', difficulty: 'Medium' }],
  });

  const addQuestion = () =>
    setTaskForm((f) => ({
      ...f,
      questions: [...f.questions, { questionNumber: '', title: '', leetcodeUrl: '', difficulty: 'Medium' }],
    }));

  const updateQuestion = (idx, key, value) =>
    setTaskForm((f) => {
      const q = [...f.questions];
      q[idx] = { ...q[idx], [key]: value };
      return { ...f, questions: q };
    });

  const removeQuestion = (idx) =>
    setTaskForm((f) => ({
      ...f,
      questions: f.questions.filter((_, i) => i !== idx),
    }));

  const createTask = useMutation({
    mutationFn: async (payload) => {
      console.log('🔍 TaskManagement - Creating task with payload:', payload);
      // map UI fields to backend schema (url)
      const mapped = {
        ...payload,
        questions: (payload.questions || []).map(q => ({
          questionNumber: Number(q.questionNumber),
          title: q.title,
          difficulty: q.difficulty || 'Medium',
          url: q.leetcodeUrl || q.url || ''
        }))
      };
      console.log('🔍 TaskManagement - Mapped payload:', mapped);
      const res = await api.post('/leetcode/tasks', mapped);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries('admin-tasks');
      alert('Task created successfully!');
      setTaskForm({
        title: '',
        description: '',
        deadline: '',
        questions: [{ questionNumber: '', title: '', leetcodeUrl: '', difficulty: 'Medium' }],
      });
    },
    onError: (error) => {
      console.error('🔍 TaskManagement - Create error:', error);
      console.error('🔍 TaskManagement - Error response:', error.response?.data);
      alert(`Failed to create task: ${error.response?.data?.message || error.message}`);
    }
  });

  const updateTask = useMutation({
    mutationFn: async ({ taskId, payload }) => {
      console.log('🔍 TaskManagement - Updating task:', taskId, 'with payload:', payload);
      const mapped = {
        ...payload,
        questions: (payload.questions || []).map(q => ({
          questionNumber: Number(q.questionNumber),
          title: q.title,
          difficulty: q.difficulty || 'Medium',
          url: q.leetcodeUrl || q.url || ''
        }))
      };
      const res = await api.put(`/leetcode/tasks/${taskId}`, mapped);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries('admin-tasks');
      alert('Task updated successfully!');
    },
    onError: (error) => {
      console.error('🔍 TaskManagement - Update error:', error);
      console.error('🔍 TaskManagement - Error response:', error.response?.data);
      alert(`Failed to update task: ${error.response?.data?.message || error.message}`);
    }
  });

  const deleteTask = useMutation({
    mutationFn: async ({ taskId }) => {
      console.log('🔍 TaskManagement - Attempting to delete task:', taskId);
      const res = await api.delete(`/leetcode/tasks/${taskId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries('admin-tasks');
      alert('Task removed');
    },
    onError: (error) => {
      console.error('🔍 TaskManagement - Delete error:', error);
      console.error('🔍 TaskManagement - Error response:', error.response?.data);
      alert(`Failed to delete task: ${error.response?.data?.message || error.message}`);
    }
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
        <p className="text-red-600">Error loading tasks.</p>
      </div>
    );
  }

  const tasks = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      {/* Debug User Status */}
      {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800">Current User Status</h3>
        <div className="mt-2 text-sm text-blue-700">
          <p><strong>Name:</strong> {user?.name || 'Not loaded'}</p>
          <p><strong>Email:</strong> {user?.email || 'Not loaded'}</p>
          <p><strong>Role:</strong> {user?.role || 'Not loaded'}</p>
          <p><strong>Is Admin:</strong> {user?.role === 'admin' ? '✅ Yes' : '❌ No'}</p>
          <p><strong>Token:</strong> {localStorage.getItem('token') ? '✅ Present' : '❌ Missing'}</p>
        </div>
        {user?.role !== 'admin' && (
          <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            ⚠️ You need admin role to manage tasks. Current role: {user?.role || 'none'}
          </div>
        )}
      </div> */}
      
      <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>

      {/* Create Task */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Create LeetCode Task</h3>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!taskForm.title || !taskForm.deadline) {
              alert('Title and deadline are required');
              return;
            }
            
            // Validate questions
            const invalidQuestions = taskForm.questions.filter(q => 
              q.questionNumber && (!q.title || !q.leetcodeUrl)
            );
            if (invalidQuestions.length > 0) {
              alert('All questions must have a title and LeetCode URL');
              return;
            }
            const payload = {
              title: taskForm.title,
              description: taskForm.description || undefined,
              deadline: taskForm.deadline,
              questions: taskForm.questions
                .filter((q) => q.questionNumber && q.title && q.leetcodeUrl)
                .map((q) => ({
                  questionNumber: Number(q.questionNumber),
                  title: q.title,
                  difficulty: q.difficulty || 'Medium',
                  leetcodeUrl: q.leetcodeUrl,
                })),
            };
            createTask.mutate(payload);
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Title</label>
              <input
                className="form-input mt-1"
                value={taskForm.title}
                onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="DP Practice Set"
                required
              />
            </div>
            <div>
              <label className="form-label">Deadline</label>
              <input
                type="datetime-local"
                className="form-input mt-1"
                value={taskForm.deadline}
                onChange={(e) => setTaskForm((f) => ({ ...f, deadline: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="form-label">Description (optional)</label>
              <input
                className="form-input mt-1"
                value={taskForm.description}
                onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Up to 6-8 questions focused on DP"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Questions</h4>
              <button type="button" className="btn-secondary" onClick={addQuestion}>
                Add Question
              </button>
            </div>

            {taskForm.questions.map((q, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-lg">
                <div>
                  <label className="form-label">Number</label>
                  <input
                    type="number"
                    className="form-input mt-1"
                    value={q.questionNumber}
                    onChange={(e) => updateQuestion(idx, 'questionNumber', e.target.value)}
                    placeholder="e.g. 1"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Title</label>
                  <input
                    className="form-input mt-1"
                    value={q.title}
                    onChange={(e) => updateQuestion(idx, 'title', e.target.value)}
                    placeholder="Two Sum"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Difficulty</label>
                  <select
                    className="form-input mt-1"
                    value={q.difficulty || 'Medium'}
                    onChange={(e) => updateQuestion(idx, 'difficulty', e.target.value)}
                    required
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">LeetCode URL</label>
                  <input
                    className="form-input mt-1"
                    value={q.leetcodeUrl}
                    onChange={(e) => updateQuestion(idx, 'leetcodeUrl', e.target.value)}
                    placeholder="https://leetcode.com/problems/..."
                    required
                  />
                </div>
                {taskForm.questions.length > 1 && (
                  <div className="md:col-span-5 flex justify-end">
                    <button type="button" className="btn-primary" onClick={() => removeQuestion(idx)}>
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button className="btn-primary" type="submit" disabled={createTask.isLoading}>
              {createTask.isLoading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>

      {/* Tasks list */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Existing Tasks</h3>
        </div>

        {tasks.length === 0 ? (
          <p className="text-gray-600">No tasks yet.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((t) => (
              <EditableTaskRow
                key={t._id}
                task={t}
                onSave={(payload) => updateTask.mutate({ taskId: t._id, payload })}
                onDelete={() => {
                  if (window.confirm('Deactivate this task set?')) {
                    deleteTask.mutate({ taskId: t._id });
                  }
                }}
                isSaving={updateTask.isLoading}
                isDeleting={deleteTask.isLoading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const EditableTaskRow = ({ task, onSave, onDelete, isSaving, isDeleting }) => {
  const [edit, setEdit] = useState(() => ({
    title: task.title || '',
    description: task.description || '',
    deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '',
    isActive: task.isActive !== false,
    questions: (task.questions || []).map(q => ({
      questionNumber: q.questionNumber || '',
      title: q.title || '',
      difficulty: q.difficulty || 'Medium',
      leetcodeUrl: q.url || ''
    })),
  }));

  const addQ = () =>
    setEdit((f) => ({
      ...f,
      questions: [...f.questions, { questionNumber: '', title: '', difficulty: 'Medium', leetcodeUrl: '' }],
    }));

  const updateQ = (idx, key, value) =>
    setEdit((f) => {
      const q = [...f.questions];
      q[idx] = { ...q[idx], [key]: value };
      return { ...f, questions: q };
    });

  const removeQ = (idx) =>
    setEdit((f) => ({
      ...f,
      questions: f.questions.filter((_, i) => i !== idx),
    }));

  return (
    <div className={`p-3 rounded-lg ${task.isActive === false ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
      {task.isActive === false && (
        <div className="mb-3 px-3 py-1 bg-red-100 border border-red-300 rounded-md">
          <span className="text-red-700 font-medium text-sm">🗑️ DELETED - This task is inactive</span>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="form-label">Title</label>
            <input
              className="form-input mt-1"
              value={edit.title}
              onChange={(e) => setEdit((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label">Deadline</label>
            <input
              type="datetime-local"
              className="form-input mt-1"
              value={edit.deadline}
              onChange={(e) => setEdit((f) => ({ ...f, deadline: e.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={edit.isActive}
                onChange={(e) => setEdit((f) => ({ ...f, isActive: e.target.checked }))}
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>
        </div>
        <div>
          <label className="form-label">Description</label>
          <input
            className="form-input mt-1"
            value={edit.description}
            onChange={(e) => setEdit((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Questions</h4>
            <button type="button" className="btn-secondary" onClick={addQ}>
              Add Question
            </button>
          </div>

          {edit.questions.map((q, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-white rounded-lg">
              <div>
                <label className="form-label">Number</label>
                <input
                  type="number"
                  className="form-input mt-1"
                  value={q.questionNumber}
                  onChange={(e) => updateQ(idx, 'questionNumber', e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <label className="form-label">Title</label>
                <input
                  className="form-input mt-1"
                  value={q.title}
                  onChange={(e) => updateQ(idx, 'title', e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Difficulty</label>
                <select
                  className="form-input mt-1"
                  value={q.difficulty || 'Medium'}
                  onChange={(e) => updateQ(idx, 'difficulty', e.target.value)}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="form-label">LeetCode URL</label>
                <input
                  className="form-input mt-1"
                  value={q.leetcodeUrl}
                  onChange={(e) => updateQ(idx, 'leetcodeUrl', e.target.value)}
                />
              </div>
              {edit.questions.length > 1 && (
                <div className="md:col-span-5 flex justify-end">
                  <button type="button" className="btn-primary" onClick={() => removeQ(idx)}>
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="btn-secondary"
            onClick={() => onSave(edit)}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            className="btn-primary"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskManagement;
