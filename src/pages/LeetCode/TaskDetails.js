import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  ThumbsUp,
  MessageSquare,
  Check,
  X,
  Users,
  BarChart3
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';
import { toast } from 'react-hot-toast';
import QuestionCompletionModal from '../../components/LeetCode/QuestionCompletionModal';
import TaskProgress from '../../components/LeetCode/TaskProgress';

const languages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
];

// Format date to a readable string
const formatDate = (dateString) => {
  if (!dateString) return 'No deadline';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Get status badge based on submission status
const getStatusBadge = (status) => {
  switch (status) {
    case 'accepted':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Check className="h-3 w-3 mr-1" /> Accepted
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1 animate-spin" /> Pending
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <X className="h-3 w-3 mr-1" /> Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Not Submitted
        </span>
      );
  }
};

const TaskDetails = () => {
  const { taskId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [activeSolutionTab, setActiveSolutionTab] = useState('yours'); // 'yours' or 'others'
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  // Fetch task details
  const { data: taskData, isLoading, error } = useQuery({
    queryKey: ['leetcode-task', taskId],
    queryFn: async () => {
      const res = await api.get(`/leetcode/tasks/${taskId}`);
      return res.data.task;
    },
    onSuccess: (data) => {
      if (data?.questions?.length > 0) {
        setActiveQuestionIndex(0);
      }
    },
    retry: 1,
    refetchOnWindowFocus: false
  });

  // Fetch submissions for the current user
  const userId = user?._id || user?.id;

  const { data: userSubmissions, error: userSubmissionsError } = useQuery({
    queryKey: ['leetcode-user-submissions', taskId, userId],
    queryFn: async () => {
      if (!userId) return [];
      // console.log('Fetching user submissions for userId:', userId, 'taskId:', taskId);
      const res = await api.get(`/leetcode/tasks/${taskId}/submissions?userId=${userId}`);
      // console.log('User submissions response:', res.data);
      return res.data.submissions || [];
    },
    enabled: !!taskId && !!userId,
    refetchOnWindowFocus: false
  });

  // Fetch all submissions for the task
  const { data: allSubmissions } = useQuery({
    queryKey: ['leetcode-all-submissions', taskId],
    queryFn: async () => {
      const res = await api.get(`/leetcode/tasks/${taskId}/submissions`);
      return res.data.submissions || [];
    },
    enabled: !!taskId,
    refetchOnWindowFocus: false
  });

  // Combine submissions for display
  const submissions = useMemo(() => {
    if (user?.role === 'admin') {
      return allSubmissions || [];
    }
    // For regular users, show their submissions first, then others' submissions
    return [
      ...(userSubmissions || []),
      ...((allSubmissions || []).filter(s =>
        !userSubmissions?.some(us => us._id === s._id)
      ))
    ];
  }, [userSubmissions, allSubmissions, user?.role]);

  const [form, setForm] = useState({
    questionNumber: '',
    questionTitle: '',
    language: 'javascript',
    code: '',
    explanation: '',
    isPersonalPractice: false
  });

  // Set default values when task data is loaded
  useEffect(() => {
    if (taskData?.questions?.length > 0) {
      const question = taskData.questions[0]; // Use first question by default
      const userSubmission = userSubmissions?.find(
        sub => sub.questionNumber === question.questionNumber
      );

      setForm(prev => ({
        ...prev,
        questionNumber: question.questionNumber.toString(),
        questionTitle: question.title,
        code: userSubmission?.code || '',
        explanation: userSubmission?.explanation || '',
        language: userSubmission?.language || 'javascript'
      }));
    }
  }, [taskData, userSubmissions]);

  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/leetcode/submit', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leetcode-task', taskId]);
      queryClient.invalidateQueries(['leetcode-user-submissions']);
      queryClient.invalidateQueries(['leetcode-all-submissions']);

      // Show success message
      toast.success(
        hasSubmitted
          ? 'Solution updated successfully!'
          : 'Solution submitted successfully!'
      );
    },
    onError: (error) => {
      console.error('Submission error:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to submit solution';
      toast.error(errorMessage);
    }
  });

  // Like/unlike submission
  const likeMutation = useMutation({
    mutationFn: async (submissionId) => {
      const res = await api.post(`/leetcode/submissions/${submissionId}/like`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leetcode-user-submissions']);
      queryClient.invalidateQueries(['leetcode-all-submissions']);
    },
    onError: (error) => {
      console.error('Like error:', error);
      toast.error('Failed to update like');
    }
  });

  // Add comment to submission
  const commentMutation = useMutation({
    mutationFn: async ({ submissionId, text }) => {
      const res = await api.post(`/leetcode/submissions/${submissionId}/comment`, { text });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leetcode-user-submissions']);
      queryClient.invalidateQueries(['leetcode-all-submissions']);
    },
    onError: (error) => {
      console.error('Comment error:', error);
      toast.error('Failed to add comment');
    }
  });

  // Handle like submission
  const handleLike = (submissionId) => {
    likeMutation.mutate(submissionId);
  };

  // Handle add comment
  const handleAddComment = (submissionId, text) => {
    if (!text.trim()) return;
    commentMutation.mutate({ submissionId, text });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!form.questionNumber) {
      toast.error('Please select a question');
      return;
    }

    if (!form.code.trim()) {
      toast.error('Please provide your solution code');
      return;
    }

    if (form.code.trim().length < 10) {
      toast.error('Code must be at least 10 characters long');
      return;
    }

    const payload = {
      taskId,
      questionNumber: Number(form.questionNumber),
      questionTitle: form.questionTitle && form.questionTitle.trim() && form.questionTitle.trim().length >= 3 ? form.questionTitle.trim() : undefined,
      language: form.language,
      code: form.code.trim(),
      explanation: form.explanation && form.explanation.trim() ? form.explanation.trim() : undefined,
      isPersonalPractice: false
    };

    // console.log('Submitting payload:', payload); // Debug log
    submitMutation.mutate(payload);
  };

  // Get submissions for the current question (moved before early returns)
  const currentSubmissions = useMemo(() => {
    if (!taskData || !submissions) return [];
    return submissions.filter(sub =>
      sub.questionNumber === taskData.questions[activeQuestionIndex]?.questionNumber
    );
  }, [submissions, taskData, activeQuestionIndex]);

  // Check if current user has already submitted for the current question (moved before early returns)
  const userSubmission = useMemo(() => {
    if (!taskData || !userSubmissions) return null;
    return userSubmissions.find(sub =>
      sub.questionNumber === taskData.questions[activeQuestionIndex]?.questionNumber
    );
  }, [userSubmissions, taskData, activeQuestionIndex]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading task details. Please try again.</p>
      </div>
    );
  }

  const task = taskData;

  const hasSubmitted = !!userSubmission;
  const hasSubmittedAnyQuestion = userSubmissions && userSubmissions.length > 0;

  // Debug logging
  // console.log('Debug - user object:', user);
  // console.log('Debug - userId (computed):', userId);
  // console.log('Debug - taskId:', taskId);
  // console.log('Debug - userSubmissions:', userSubmissions);
  // console.log('Debug - userSubmissionsError:', userSubmissionsError);
  // console.log('Debug - allSubmissions:', allSubmissions);
  // console.log('Debug - hasSubmittedAnyQuestion:', hasSubmittedAnyQuestion);
  // console.log('Debug - currentSubmissions:', currentSubmissions);

  // Check if current user has liked a submission
  const hasLiked = (submission) => {
    if (!userId || !submission?.likes) return false;
    return submission.likes.some(like => like.user === userId);
  };

  const handleViewCompletion = (question) => {
    setSelectedQuestion(question);
    setShowCompletionModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{task?.title || 'Task Details'}</h1>
          {task?.deadline && (
            <p className="text-gray-600">
              Deadline: {formatDate(task.deadline)}
            </p>
          )}
        </div>
        
        {user?.role === 'admin' && (
          <div className="flex items-center space-x-3">
            <Link
              to={`/leetcode/tasks/${taskId}/submissions`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              📊 View All Submissions
            </Link>
          </div>
        )}
      </div>

      {/* User Progress (for non-admin users) */}
      {user?.role !== 'admin' && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Your Progress</h3>
          </div>
          <div className="p-4">
            <TaskProgress taskId={taskId} showDetails={true} />
          </div>
        </div>
      )}

      {/* Task Questions */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Questions</h3>
        </div>
        {task?.questions?.length ? (
          <div className="space-y-6">
            {task.questions.map((q, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      #{q.questionNumber} {q.title || ''}
                    </p>
                    {q.difficulty && (
                      <p className="text-sm text-gray-500">Difficulty: {q.difficulty}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => handleViewCompletion(q)}
                        className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Users className="w-4 h-4 mr-1" />
                        View Completion
                      </button>
                    )}
                    {q.url && (
                      <a
                        href={q.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 text-sm hover:text-blue-800 underline"
                      >
                        Open on LeetCode
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No questions listed for this task.</p>
        )}
      </div>

      {/* Submissions by Question */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Submissions by Question</h3>
        </div>
        
        {/* Question Selector */}
        <div className="border-b border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Question to View Submissions:</label>
          <select
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={activeQuestionIndex}
            onChange={(e) => setActiveQuestionIndex(parseInt(e.target.value))}
          >
            {task?.questions?.map((q, idx) => {
              const questionSubmissions = submissions?.filter(sub => sub.questionNumber === q.questionNumber) || [];
              return (
                <option key={idx} value={idx}>
                  #{q.questionNumber} - {q.title} ({questionSubmissions.length} submissions)
                </option>
              );
            })}
          </select>
        </div>

        {/* Current Question Info */}
        {task?.questions?.[activeQuestionIndex] && (
          <div className="p-4 bg-blue-50 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">
                  #{task.questions[activeQuestionIndex].questionNumber} - {task.questions[activeQuestionIndex].title}
                </h4>
                <p className="text-sm text-blue-700">
                  Difficulty: {task.questions[activeQuestionIndex].difficulty}
                </p>
              </div>
              {task.questions[activeQuestionIndex].url && (
                <a
                  href={task.questions[activeQuestionIndex].url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 text-sm hover:text-blue-800 underline"
                >
                  Open on LeetCode
                </a>
              )}
            </div>
          </div>
        )}

        {/* Submissions for Selected Question */}
        <div className="p-4">
          {(() => {
            const currentQuestion = task?.questions?.[activeQuestionIndex];
            if (!currentQuestion) {
              return (
                <div className="text-center py-8">
                  <p className="text-gray-500">No question selected</p>
                </div>
              );
            }

            const questionSubmissions = submissions?.filter(sub => 
              sub.questionNumber === currentQuestion.questionNumber
            ) || [];

            if (questionSubmissions.length === 0) {
              return (
                <div className="text-center py-8">
                  <p className="text-gray-500">No submissions yet for this question</p>
                  {user && (
                    <p className="text-sm text-gray-400 mt-2">Be the first to submit a solution!</p>
                  )}
                </div>
              );
            }

            // Group submissions by user
            const submissionsByUser = questionSubmissions.reduce((acc, submission) => {
              const userId = submission.user?._id || 'anonymous';
              if (!acc[userId]) {
                acc[userId] = [];
              }
              acc[userId].push(submission);
              return acc;
            }, {});

            return (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h5 className="text-md font-medium text-gray-900">
                    {questionSubmissions.length} Submission{questionSubmissions.length !== 1 ? 's' : ''} from {Object.keys(submissionsByUser).length} User{Object.keys(submissionsByUser).length !== 1 ? 's' : ''}
                  </h5>
                </div>

                {Object.entries(submissionsByUser).map(([userIdKey, userSubmissions]) => {
                  const latestSubmission = userSubmissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
                  const isCurrentUser = latestSubmission.user?._id === userId;
                  const userHasLiked = hasLiked(latestSubmission);

                  return (
                    <div key={userIdKey} className="bg-white border rounded-lg overflow-hidden">
                      {/* User Header */}
                      <div className="p-4 bg-gray-50 border-b">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {latestSubmission.user?.name?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div>
                              <h6 className="font-medium text-gray-900 flex items-center">
                                {isCurrentUser ? 'Your Solution' : latestSubmission.user?.name || 'Anonymous User'}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                    You
                                  </span>
                                )}
                              </h6>
                              <p className="text-sm text-gray-500">
                                {userSubmissions.length > 1 ? `${userSubmissions.length} submissions, ` : ''}
                                Latest: {new Date(latestSubmission.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              latestSubmission.status === 'submitted' || latestSubmission.status === 'Accepted'
                                ? 'bg-green-100 text-green-800'
                                : latestSubmission.status === 'late'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {latestSubmission.status === 'late' ? 'Late Submission' : 
                               latestSubmission.status === 'submitted' ? 'Submitted' : 
                               latestSubmission.status}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {latestSubmission.language}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Solution Content */}
                      <div className="p-4">
                        <div className="mb-4">
                          <h6 className="text-sm font-medium mb-2">Solution Code:</h6>
                          <SyntaxHighlighter
                            language={latestSubmission.language}
                            style={atomOneDark}
                            className="rounded text-sm"
                            showLineNumbers
                          >
                            {latestSubmission.code}
                          </SyntaxHighlighter>
                        </div>

                        {latestSubmission.explanation && (
                          <div className="mb-4">
                            <h6 className="text-sm font-medium mb-2">Explanation:</h6>
                            <div className="prose prose-sm max-w-none border-l-2 border-gray-200 pl-4">
                              <ReactMarkdown>{latestSubmission.explanation}</ReactMarkdown>
                            </div>
                          </div>
                        )}

                        {/* Interaction Bar */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="flex items-center space-x-4 text-sm">
                            <button
                              onClick={() => handleLike(latestSubmission._id)}
                              className={`flex items-center space-x-1 ${
                                userHasLiked ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
                              }`}
                              disabled={!user || isCurrentUser}
                            >
                              <ThumbsUp className="w-4 h-4" />
                              <span>{latestSubmission.likes?.length || 0}</span>
                            </button>
                            <div className="flex items-center space-x-1 text-gray-500">
                              <MessageSquare className="w-4 h-4" />
                              <span>{latestSubmission.comments?.length || 0} comments</span>
                            </div>
                          </div>
                          
                          {userSubmissions.length > 1 && (
                            <button className="text-xs text-blue-600 hover:text-blue-800">
                              View all {userSubmissions.length} submissions
                            </button>
                          )}
                        </div>

                        {/* Comments Section */}
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <h6 className="text-sm font-medium mb-3">Comments</h6>

                          {/* Comment Input */}
                          {user && !isCurrentUser && (
                            <div className="flex space-x-2 mb-4">
                              <input
                                type="text"
                                placeholder="Add a comment..."
                                className="flex-1 text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.target.value.trim()) {
                                    handleAddComment(latestSubmission._id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <button
                                onClick={(e) => {
                                  const input = e.target.previousElementSibling;
                                  if (input.value.trim()) {
                                    handleAddComment(latestSubmission._id, input.value);
                                    input.value = '';
                                  }
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                Post
                              </button>
                            </div>
                          )}

                          {/* Comments List */}
                          <div className="space-y-3">
                            {latestSubmission.comments?.map((comment) => (
                              <div key={comment._id} className="flex space-x-2">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                                  {comment.user?.name?.charAt(0) || 'U'}
                                </div>
                                <div className="bg-gray-50 rounded-lg p-2 flex-1">
                                  <div className="text-xs font-medium">
                                    {comment.user?._id === userId ? 'You' : comment.user?.name || 'Anonymous'}
                                  </div>
                                  <div className="text-sm">{comment.text}</div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    {new Date(comment.createdAt).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            ))}

                            {(!latestSubmission.comments || latestSubmission.comments.length === 0) && (
                              <p className="text-sm text-gray-500 text-center py-2">
                                No comments yet. Be the first to comment!
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Submit Solution */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Submit Solution</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Select Question</label>
            <select
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={form.questionNumber}
              onChange={(e) => {
                const selectedQuestion = task.questions.find(q => q.questionNumber.toString() === e.target.value);
                const existingSubmission = userSubmissions?.find(sub => sub.questionNumber === Number(e.target.value));

                setForm(f => ({
                  ...f,
                  questionNumber: e.target.value,
                  questionTitle: selectedQuestion?.title || '',
                  code: existingSubmission?.code || '',
                  explanation: existingSubmission?.explanation || '',
                  language: existingSubmission?.language || 'javascript'
                }));
              }}
              required
            >
              <option value="">Select a question</option>
              {task?.questions?.map((q) => (
                <option key={q.questionNumber} value={q.questionNumber}>
                  #{q.questionNumber} - {q.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Language</label>
            <select
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              required
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Code</label>
            <textarea
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              rows={8}
              placeholder="// Paste your solution here"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Explanation (optional)</label>
            <textarea
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              rows={4}
              placeholder="Brief explanation of your approach"
              value={form.explanation}
              onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn-primary"
              disabled={submitMutation.isLoading}
            >
              {submitMutation.isLoading ? 'Submitting...' : 'Submit Solution'}
            </button>
          </div>
        </form>
      </div>

      {/* Question Completion Modal */}
      <QuestionCompletionModal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        taskId={taskId}
        question={selectedQuestion}
      />
    </div>
  );
};

export default TaskDetails;
