import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../../api/client';

const TaskProgress = ({ taskId, showDetails = false }) => {
  const { data: progressData, isLoading, error } = useQuery({
    queryKey: ['task-progress', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      const response = await api.get(`/leetcode/tasks/${taskId}/progress`);
      return response.data;
    },
    enabled: !!taskId,
    refetchOnWindowFocus: false
  });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-2 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  if (error || !progressData) {
    return null;
  }

  const { totalQuestions, completedQuestions, progress } = progressData;

  // Determine color based on completion percentage
  const getProgressColor = () => {
    if (progress === 0) return 'text-red-600';
    if (progress === 100) return 'text-green-600';
    return 'text-yellow-600';
  };

  const getProgressBgColor = () => {
    if (progress === 0) return 'bg-red-500';
    if (progress === 100) return 'bg-green-500';
    return 'bg-yellow-500';
  };

  const getProgressIcon = () => {
    if (progress === 0) return <AlertCircle className="w-4 h-4" />;
    if (progress === 100) return <CheckCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (progress === 0) return 'Not Started';
    if (progress === 100) return 'Completed';
    return 'In Progress';
  };

  return (
    <div className="space-y-2">
      {/* Progress Text */}
      <div className={`flex items-center space-x-2 text-sm font-medium ${getProgressColor()}`}>
        {getProgressIcon()}
        <span>
          {completedQuestions} of {totalQuestions} questions completed
        </span>
        {showDetails && (
          <span className="text-xs">
            ({getStatusText()})
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getProgressBgColor()}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Progress Percentage */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{progress}% complete</span>
        {showDetails && progressData.incompleteQuestions > 0 && (
          <span>{progressData.incompleteQuestions} remaining</span>
        )}
      </div>

      {/* Detailed breakdown (optional) */}
      {showDetails && progressData.incompleteQuestionDetails && progressData.incompleteQuestionDetails.length > 0 && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Remaining Questions:</h4>
          <div className="space-y-1">
            {progressData.incompleteQuestionDetails.map((question) => (
              <div key={question.questionNumber} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  #{question.questionNumber} - {question.title}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  question.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                  question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {question.difficulty}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskProgress;