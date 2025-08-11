import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import ReactMarkdown from 'react-markdown';
import { 
  Code, 
  ThumbsUp, 
  MessageSquare, 
  User,
  Users,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api/client';

const languages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
];

// Status badge component
const StatusBadge = ({ status }) => {
  switch (status?.toLowerCase()) {
    case 'accepted':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" /> Accepted
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1 animate-pulse" /> Pending
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" /> Rejected
        </span>
      );
    default:
      return null;
  }
};

const MyPractice = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [showForm, setShowForm] = useState(true);

  // List personal practice submissions
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['my-practice'],
    queryFn: async () => {
      const res = await api.get('/leetcode/my-practice?limit=50');
      return res.data.submissions || [];
    }
  });

  // Group submissions by question number
  const submissionsByQuestion = useMemo(() => {
    if (!data) return {};
    
    return data.reduce((acc, submission) => {
      const key = submission.questionNumber;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(submission);
      return acc;
    }, {});
  }, [data]);

  // Form state for new submission
  const [form, setForm] = useState({
    questionNumber: '',
    questionTitle: '',
    language: 'javascript',
    code: '',
    explanation: ''
  });

  // Submit a new practice solution
  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/leetcode/submit', {
        ...payload,
        isPersonalPractice: true
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-practice']);
      toast.success('Practice submission added successfully!');
      setForm({
        questionNumber: '',
        questionTitle: '',
        language: 'javascript',
        code: '',
        explanation: ''
      });
      refetch();
    },
    onError: (error) => {
      console.error('Submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit solution');
    }
  });

  // Like/unlike a submission
  const likeMutation = useMutation({
    mutationFn: async (submissionId) => {
      const res = await api.post(`/leetcode/submissions/${submissionId}/like`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-practice']);
    },
    onError: (error) => {
      console.error('Like error:', error);
      toast.error('Failed to update like');
    }
  });

  // Add comment to a submission
  const commentMutation = useMutation({
    mutationFn: async ({ submissionId, text }) => {
      const res = await api.post(`/leetcode/submissions/${submissionId}/comment`, { text });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-practice']);
      setCommentText('');
    },
    onError: (error) => {
      console.error('Comment error:', error);
      toast.error('Failed to add comment');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.questionNumber || !form.language || !form.code) {
      toast.error('Question number, language, and code are required');
      return;
    }
    
    submitMutation.mutate({
      questionNumber: Number(form.questionNumber),
      questionTitle: form.questionTitle || `Question #${form.questionNumber}`,
      language: form.language,
      code: form.code,
      explanation: form.explanation || undefined
    });
  };

  const toggleExpand = (id) => {
    setExpandedSubmission(expandedSubmission === id ? null : id);
  };

  const handleLike = (submissionId) => {
    likeMutation.mutate(submissionId);
  };

  const handleAddComment = (submissionId) => {
    if (!commentText.trim()) return;
    commentMutation.mutate({ submissionId, text: commentText });
  };

  const hasLiked = (submission) => {
    if (!user?._id || !submission?.likes) return false;
    return submission.likes.some(like => like.user === user._id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Practice</h1>
          <p className="text-gray-600">Your personal LeetCode practice submissions</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/leetcode/community-practice"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Users className="mr-2 h-4 w-4" />
            View Community
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showForm ? 'Hide Form' : 'Add New Submission'}
          </button>
        </div>
      </div>

      {/* Community Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Your practice submissions are visible to the community! 🌟
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Share your solutions to inspire others and get feedback. Your practice submissions will appear in the{' '}
              <Link to="/leetcode/community-practice" className="font-medium underline hover:text-blue-800">
                Community Practice
              </Link>{' '}
              section where others can like and comment on your solutions.
            </p>
          </div>
        </div>
      </div>

      {/* Create Practice Submission */}
      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Add a Practice Submission</h3>
            <p className="text-sm text-gray-600 mt-1">This will be visible to all users in the community</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 1"
                  value={form.questionNumber}
                  onChange={(e) => setForm((f) => ({ ...f, questionNumber: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Question Title (optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Two Sum"
                  value={form.questionTitle}
                  onChange={(e) => setForm((f) => ({ ...f, questionTitle: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Solution Code <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                rows={12}
                placeholder="// Enter your solution here"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Explanation (optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                rows={4}
                placeholder="Brief explanation of your approach, time/space complexity, etc."
                value={form.explanation}
                onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Markdown is supported for formatting
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={submitMutation.isLoading || !form.questionNumber || !form.code}
              >
                {submitMutation.isLoading ? 'Submitting...' : 'Submit Solution'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List Practice Submissions */}
      <div className="card">
        <div className="card-header flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">My Practice Submissions</h3>
          <div className="text-sm text-gray-500">
            {data?.length || 0} {data?.length === 1 ? 'submission' : 'submissions'}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">Error loading submissions. Please try again.</p>
            <button
              onClick={() => refetch()}
              className="mt-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Retry
            </button>
          </div>
        ) : data?.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {Object.entries(submissionsByQuestion).map(([questionNumber, submissions]) => (
              <div key={questionNumber} className="py-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-gray-900">
                    #{questionNumber} - {submissions[0]?.questionTitle || 'Untitled Problem'}
                  </h4>
                  <span className="text-sm text-gray-500">
                    {submissions.length} {submissions.length === 1 ? 'submission' : 'submissions'}
                  </span>
                </div>
                
                <div className="mt-2 space-y-3">
                  {submissions.map((submission) => (
                    <div key={submission._id} className="bg-gray-50 rounded-lg overflow-hidden">
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => toggleExpand(submission._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <StatusBadge status={submission.status} />
                            <span className="text-sm text-gray-500">
                              {submission.language} • {new Date(submission.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <button 
                            className="text-gray-400 hover:text-gray-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(submission._id);
                            }}
                          >
                            {expandedSubmission === submission._id ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {expandedSubmission === submission._id && (
                        <div className="p-4 border-t border-gray-200">
                          <div className="mb-4">
                            <h5 className="text-sm font-medium mb-2">Solution:</h5>
                            <div className="relative">
                              <SyntaxHighlighter 
                                language={submission.language} 
                                style={atomOneDark}
                                className="rounded text-sm max-h-96 overflow-auto"
                                showLineNumbers
                              >
                                {submission.code}
                              </SyntaxHighlighter>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(submission.code);
                                  toast.success('Code copied to clipboard!');
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-gray-700 bg-opacity-70 text-white rounded hover:bg-opacity-100 transition-colors"
                                title="Copy to clipboard"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          
                          {submission.explanation && (
                            <div className="mb-4">
                              <h5 className="text-sm font-medium mb-2">Explanation:</h5>
                              <div className="prose prose-sm max-w-none border-l-2 border-gray-200 pl-4">
                                <ReactMarkdown>{submission.explanation}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between border-t border-gray-200 pt-3 mt-4">
                            <div className="flex items-center space-x-4">
                              <button
                                onClick={() => handleLike(submission._id)}
                                className={`flex items-center space-x-1 ${
                                  hasLiked(submission) ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
                                }`}
                              >
                                <ThumbsUp className="h-4 w-4" />
                                <span className="text-sm">
                                  {submission.likes?.length || 0}
                                </span>
                              </button>
                              <div className="flex items-center space-x-1 text-gray-500">
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-sm">
                                  {submission.comments?.length || 0} comments
                                </span>
                              </div>
                            </div>
                            
                            <a
                              href={`https://leetcode.com/problems/${submission.questionTitle?.toLowerCase().replace(/\s+/g, '-')}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                            >
                              View on LeetCode
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </div>
                          
                          {/* Comments section */}
                          <div className="mt-4 pt-3 border-t border-gray-200">
                            <div className="flex space-x-2 mb-4">
                              <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                  {user?.name?.charAt(0) || 'U'}
                                </div>
                              </div>
                              <div className="flex-1">
                                <input
                                  type="text"
                                  placeholder="Add a comment..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && commentText.trim()) {
                                      handleAddComment(submission._id);
                                    }
                                  }}
                                />
                              </div>
                              <button
                                onClick={() => {
                                  if (commentText.trim()) {
                                    handleAddComment(submission._id);
                                  }
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                disabled={!commentText.trim()}
                              >
                                Post
                              </button>
                            </div>
                            
                            {submission.comments?.length > 0 ? (
                              <div className="space-y-3">
                                {submission.comments.map((comment) => (
                                  <div key={comment._id} className="flex space-x-2">
                                    <div className="flex-shrink-0">
                                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                                        {comment.user?.name?.charAt(0) || 'U'}
                                      </div>
                                    </div>
                                    <div className="flex-1 bg-gray-50 rounded-lg p-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">
                                          {comment.user?._id === user?._id ? 'You' : comment.user?.name || 'Anonymous'}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                          {new Date(comment.createdAt).toLocaleString()}
                                        </span>
                                      </div>
                                      <p className="text-sm mt-1">{comment.text}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 text-center py-4">
                                No comments yet. Be the first to comment!
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
              <Code className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No practice submissions yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by submitting your first solution!
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                New Submission
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPractice;
