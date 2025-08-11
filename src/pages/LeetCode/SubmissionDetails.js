import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ThumbsUp, 
  MessageSquare, 
  User, 
  ArrowLeft,
  Send,
  Loader2,
  Heart,
  XCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-hot-toast';
import api from '../../api/client';
import Comment from '../../components/LeetCode/Comment';

const SubmissionDetails = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [isLiking, setIsLiking] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('user');

  // Fetch current user data
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setCurrentUser(res.data.user);
        setUserRole(res.data.user.role);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    
    fetchCurrentUser();
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ['leetcode-submission', submissionId],
    queryFn: async () => {
      const res = await api.get(`/leetcode/submissions/${submissionId}`);
      return res.data.submission;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      setIsLiking(true);
      try {
        const res = await api.post(`/leetcode/submissions/${submissionId}/like`);
        return res.data;
      } finally {
        setIsLiking(false);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['leetcode-submission', submissionId]);
      toast.success(data.message === 'Liked' ? 'Liked the submission!' : 'Removed like');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to like submission');
    }
  });

  const commentMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(`/leetcode/submissions/${submissionId}/comment`, payload);
      return res.data;
    },
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries(['leetcode-submission', submissionId]);
      toast.success('Comment added successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add comment');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Error loading submission: {error.response?.data?.message || 'Please try again later'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Build comment tree from flat array
  const buildCommentTree = (comments) => {
    if (!comments) return [];
    
    const commentMap = {};
    const result = [];
    
    // First pass: create a map of comments by ID
    comments.forEach(comment => {
      comment.replies = [];
      commentMap[comment._id] = comment;
    });
    
    // Second pass: build the tree
    comments.forEach(comment => {
      if (comment.parentCommentId && commentMap[comment.parentCommentId]) {
        // This is a reply, add it to its parent's replies
        commentMap[comment.parentCommentId].replies.push(comment);
      } else {
        // This is a top-level comment
        result.push(comment);
      }
    });
    
    // Sort comments by creation date (newest first)
    const sortComments = (comments) => {
      return [...comments].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    };
    
    // Sort all levels of the tree
    const sortCommentTree = (commentList) => {
      return sortComments(commentList).map(comment => {
        if (comment.replies.length > 0) {
          comment.replies = sortCommentTree(comment.replies);
        }
        return comment;
      });
    };
    
    return sortCommentTree(result);
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const submission = data;
  const hasLiked = submission.likes?.some(like => 
    typeof like === 'object' ? like.user._id === currentUser?._id : like === currentUser?._id
  );
  const isOwnSubmission = submission.user._id === currentUser?._id;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Submission Details</h1>
        <div></div> {/* Empty div for flex spacing */}
      </div>

      {/* Submission Header */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                #{submission.questionNumber} {submission.questionTitle}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Submitted by {submission.user?.name || 'Anonymous'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {submission.language}
              </span>
              {submission.isLateSubmission && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Late Submission
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Submission Content */}
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          {submission.explanation && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Explanation</h4>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{submission.explanation}</p>
              </div>
            </div>
          )}
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Solution</h4>
            <div className="relative rounded-md overflow-hidden border border-gray-200">
              <pre className="bg-gray-900 text-gray-100 p-4 overflow-x-auto text-sm">
                <code>
                  {submission.code}
                </code>
              </pre>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            Submitted {formatDistanceToNow(new Date(submission.createdAt), { addSuffix: true })}
          </div>
        </div>
        
        {/* Like/Unlike Button */}
        <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
          <button
            onClick={() => likeMutation.mutate()}
            disabled={likeMutation.isLoading || isLiking}
            className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              hasLiked 
                ? 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {isLiking ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Heart 
                className={`mr-2 h-4 w-4 ${hasLiked ? 'fill-current text-red-500' : 'text-gray-400'}`} 
              />
            )}
            {hasLiked ? 'Liked' : 'Like'} • {submission.likes?.length || 0}
          </button>
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Discussion {submission.comments?.length ? `(${submission.comments.length})` : ''}
          </h3>
        </div>
        
        {/* Comment Form */}
        <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
          <div className="flex space-x-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-5 w-5 text-gray-500" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <form onSubmit={(e) => {
                e.preventDefault();
                if (commentText.trim()) {
                  commentMutation.mutate({ text: commentText });
                }
              }}>
                <div>
                  <label htmlFor="comment" className="sr-only">Comment</label>
                  <textarea
                    id="comment"
                    rows={3}
                    className="shadow-sm block w-full focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 rounded-md"
                    placeholder="Start a discussion..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Markdown is supported
                  </p>
                  <button
                    type="submit"
                    disabled={!commentText.trim() || commentMutation.isLoading}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      !commentText.trim() || commentMutation.isLoading
                        ? 'bg-blue-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {commentMutation.isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Post Comment
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        
        {/* Comments List */}
        <div className="bg-gray-50 px-4 py-5 sm:p-6">
          {submission.comments?.length > 0 ? (
            <div className="space-y-4">
              {buildCommentTree(submission.comments).map((comment) => (
                <Comment
                  key={comment._id}
                  comment={comment}
                  submissionId={submission._id}
                  currentUserId={currentUser?._id}
                  isAdmin={userRole === 'admin'}
                  depth={0}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No comments yet</h3>
              <p className="mt-1 text-sm text-gray-500">Be the first to start the discussion.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetails;
