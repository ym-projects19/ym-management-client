import React, { useState, useMemo } from 'react';
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
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Trophy,
  Target,
  TrendingUp,
  Filter,
  Search
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api/client';

const CommunityPractice = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedSubmission, setExpandedSubmission] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // Fetch all personal practice submissions from all users
  const { data: allPracticeData, isLoading, error, refetch } = useQuery({
    queryKey: ['community-practice'],
    queryFn: async () => {
      const res = await api.get('/leetcode/community-practice');
      return res.data.submissions || [];
    }
  });

  // Fetch users for filter
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data.users || [];
    }
  });

  // Like/unlike a submission
  const likeMutation = useMutation({
    mutationFn: async (submissionId) => {
      const res = await api.post(`/leetcode/submissions/${submissionId}/like`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['community-practice']);
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
      queryClient.invalidateQueries(['community-practice']);
      setCommentText('');
    },
    onError: (error) => {
      console.error('Comment error:', error);
      toast.error('Failed to add comment');
    }
  });

  const submissions = allPracticeData || [];
  const users = usersData || [];

  // Filter and sort submissions
  const filteredSubmissions = useMemo(() => {
    let filtered = submissions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(sub => 
        sub.questionTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.questionNumber?.toString().includes(searchTerm) ||
        sub.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // User filter
    if (selectedUser !== 'all') {
      filtered = filtered.filter(sub => sub.user?._id === selectedUser);
    }

    // Difficulty filter (we'll need to add this to submissions or derive from question number)
    // For now, we'll skip this filter

    // Sort
    switch (sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'popular':
        filtered.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
        break;
      case 'question':
        filtered.sort((a, b) => a.questionNumber - b.questionNumber);
        break;
      case 'user':
        filtered.sort((a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''));
        break;
      default:
        break;
    }

    return filtered;
  }, [submissions, searchTerm, selectedUser, sortBy]);

  // Group submissions by question for stats
  const questionStats = useMemo(() => {
    const stats = {};
    submissions.forEach(sub => {
      const key = sub.questionNumber;
      if (!stats[key]) {
        stats[key] = {
          questionNumber: sub.questionNumber,
          questionTitle: sub.questionTitle,
          submissions: [],
          uniqueUsers: new Set()
        };
      }
      stats[key].submissions.push(sub);
      stats[key].uniqueUsers.add(sub.user?._id);
    });

    return Object.values(stats).map(stat => ({
      ...stat,
      uniqueUsers: stat.uniqueUsers.size
    })).sort((a, b) => b.submissions.length - a.submissions.length);
  }, [submissions]);

  // User leaderboard
  const userLeaderboard = useMemo(() => {
    const userStats = {};
    submissions.forEach(sub => {
      const userId = sub.user?._id;
      if (!userId) return;
      
      if (!userStats[userId]) {
        userStats[userId] = {
          user: sub.user,
          submissions: 0,
          totalLikes: 0,
          uniqueQuestions: new Set()
        };
      }
      
      userStats[userId].submissions++;
      userStats[userId].totalLikes += sub.likes?.length || 0;
      userStats[userId].uniqueQuestions.add(sub.questionNumber);
    });

    return Object.values(userStats).map(stat => ({
      ...stat,
      uniqueQuestions: stat.uniqueQuestions.size
    })).sort((a, b) => b.uniqueQuestions - a.uniqueQuestions);
  }, [submissions]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading community practice. Please try again.</p>
        <button
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Practice</h1>
          <p className="text-gray-600">See what others are practicing and get inspired!</p>
        </div>
        <div className="text-sm text-gray-500">
          {submissions.length} total submissions from {userLeaderboard.length} users
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Code className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Practice Submissions</p>
              <p className="text-2xl font-semibold text-gray-900">{submissions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Target className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Unique Questions Solved</p>
              <p className="text-2xl font-semibold text-gray-900">{questionStats.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Practitioners</p>
              <p className="text-2xl font-semibold text-gray-900">{userLeaderboard.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
            Practice Leaderboard
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {userLeaderboard.slice(0, 9).map((userStat, index) => (
              <div key={userStat.user._id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                  }`}>
                    {index < 3 ? '🏆' : index + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {userStat.user.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {userStat.uniqueQuestions} questions • {userStat.submissions} submissions
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by question, user, or question number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">All Users</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Liked</option>
              <option value="question">By Question #</option>
              <option value="user">By User</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Feed */}
      <div className="space-y-4">
        {filteredSubmissions.length > 0 ? (
          filteredSubmissions.map((submission) => {
            const isExpanded = expandedSubmission === submission._id;
            const isCurrentUser = submission.user?._id === user?._id;
            const userHasLiked = hasLiked(submission);

            return (
              <div key={submission._id} className="bg-white shadow rounded-lg overflow-hidden">
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(submission._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {submission.user?.name?.charAt(0) || 'U'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">
                            {isCurrentUser ? 'You' : submission.user?.name || 'Anonymous'}
                          </h4>
                          {isCurrentUser && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              Your Practice
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          #{submission.questionNumber} - {submission.questionTitle}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(submission.createdAt).toLocaleString()} • {submission.language}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3 text-sm text-gray-500">
                        <span className="flex items-center">
                          <ThumbsUp className="w-4 h-4 mr-1" />
                          {submission.likes?.length || 0}
                        </span>
                        <span className="flex items-center">
                          <MessageSquare className="w-4 h-4 mr-1" />
                          {submission.comments?.length || 0}
                        </span>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <div className="p-4">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium">Solution:</h5>
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
                        <SyntaxHighlighter 
                          language={submission.language} 
                          style={atomOneDark}
                          className="rounded text-sm max-h-96 overflow-auto"
                          showLineNumbers
                        >
                          {submission.code}
                        </SyntaxHighlighter>
                      </div>
                      
                      {submission.explanation && (
                        <div className="mb-4">
                          <h5 className="text-sm font-medium mb-2">Explanation:</h5>
                          <div className="prose prose-sm max-w-none border-l-2 border-gray-200 pl-4">
                            <ReactMarkdown>{submission.explanation}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                        <div className="flex items-center space-x-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(submission._id);
                            }}
                            className={`flex items-center space-x-1 ${
                              userHasLiked ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
                            }`}
                            disabled={isCurrentUser}
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
                      </div>
                      
                      {/* Comments section */}
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        {!isCurrentUser && (
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
                        )}
                        
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
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
              <Code className="h-6 w-6 text-gray-600" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No practice submissions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedUser !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Be the first to share your practice solutions!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityPractice;