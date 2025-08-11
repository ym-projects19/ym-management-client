import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { 
  User, 
  MessageSquare, 
  ThumbsUp, 
  Reply, 
  Edit, 
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api/client';

const Comment = ({ 
  comment, 
  submissionId, 
  currentUserId, 
  isAdmin,
  depth = 0,
  onReply,
  onEdit,
  onDelete,
  onLike,
  isLiking,
  isReplying,
  isEditing,
  isDeleting
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isReplyingLocal, setIsReplyingLocal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isEditingLocal, setIsEditingLocal] = useState(false);
  const [editedText, setEditedText] = useState(comment.text);

  const queryClient = useQueryClient();

  const replyMutation = useMutation({
    mutationFn: async (text) => {
      const res = await api.post(`/leetcode/submissions/${submissionId}/comments/${comment._id}/reply`, {
        text
      });
      return res.data;
    },
    onSuccess: () => {
      setReplyText('');
      setIsReplyingLocal(false);
      queryClient.invalidateQueries(['leetcode-submission', submissionId]);
      toast.success('Reply added successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add reply');
    }
  });

  const editMutation = useMutation({
    mutationFn: async (text) => {
      const res = await api.put(`/leetcode/submissions/${submissionId}/comments/${comment._id}`, {
        text
      });
      return res.data;
    },
    onSuccess: () => {
      setIsEditingLocal(false);
      queryClient.invalidateQueries(['leetcode-submission', submissionId]);
      toast.success('Comment updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update comment');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/leetcode/submissions/${submissionId}/comments/${comment._id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leetcode-submission', submissionId]);
      toast.success('Comment deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete comment');
    }
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/leetcode/submissions/${submissionId}/comments/${comment._id}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leetcode-submission', submissionId]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to like comment');
    }
  });

  const isOwner = comment.user._id === currentUserId;
  const isLiked = comment.likes?.includes(currentUserId);
  const hasReplies = comment.repliesCount > 0;

  const handleReply = (e) => {
    e.preventDefault();
    if (replyText.trim()) {
      replyMutation.mutate(replyText);
    }
  };

  const handleEdit = (e) => {
    e.preventDefault();
    if (editedText.trim() && editedText !== comment.text) {
      editMutation.mutate(editedText);
    } else {
      setIsEditingLocal(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      deleteMutation.mutate();
    }
  };

  const handleLike = () => {
    likeMutation.mutate();
  };

  return (
    <div 
      className={`mt-4 ${depth > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}`}
      style={{ marginLeft: `${depth * 1.5}rem` }}
    >
      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="h-4 w-4 text-gray-500" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium text-gray-900">
                {comment.user?.name || 'Anonymous'}
              </p>
              <span className="text-xs text-gray-500">
                • {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                {comment.isEdited && ' • edited'}
              </span>
            </div>
            {hasReplies && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          
          {isEditingLocal ? (
            <form onSubmit={handleEdit} className="mt-1">
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                rows="3"
                autoFocus
              />
              <div className="mt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditingLocal(false)}
                  className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                  disabled={editMutation.isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={editMutation.isLoading || !editedText.trim()}
                >
                  {editMutation.isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-1 text-sm text-gray-700">
              <p className="whitespace-pre-wrap">{comment.text}</p>
              
              <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                <button 
                  onClick={handleLike}
                  className={`flex items-center space-x-1 hover:text-blue-600 ${isLiked ? 'text-blue-600' : ''}`}
                  disabled={likeMutation.isLoading}
                >
                  {likeMutation.isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ThumbsUp className="h-3 w-3" />
                  )}
                  <span>{comment.likes?.length || 0}</span>
                </button>
                
                <button 
                  onClick={() => setIsReplyingLocal(!isReplyingLocal)}
                  className="flex items-center space-x-1 hover:text-blue-600"
                >
                  <Reply className="h-3 w-3" />
                  <span>Reply</span>
                </button>
                
                {isOwner && (
                  <>
                    <button 
                      onClick={() => {
                        setEditedText(comment.text);
                        setIsEditingLocal(true);
                      }}
                      className="flex items-center space-x-1 hover:text-blue-600"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    
                    <button 
                      onClick={handleDelete}
                      className="flex items-center space-x-1 hover:text-red-600"
                      disabled={deleteMutation.isLoading}
                    >
                      {deleteMutation.isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      <span>Delete</span>
                    </button>
                  </>
                )}
                
                {(isAdmin && !isOwner) && (
                  <button 
                    onClick={handleDelete}
                    className="flex items-center space-x-1 hover:text-red-600"
                    disabled={deleteMutation.isLoading}
                  >
                    {deleteMutation.isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    <span>Delete</span>
                  </button>
                )}
              </div>
              
              {isReplyingLocal && (
                <form onSubmit={handleReply} className="mt-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    placeholder="Write a reply..."
                    rows="2"
                    autoFocus
                  />
                  <div className="mt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsReplyingLocal(false)}
                      className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                      disabled={replyMutation.isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      disabled={replyMutation.isLoading || !replyText.trim()}
                    >
                      {replyMutation.isLoading ? 'Posting...' : 'Post Reply'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Comment;
