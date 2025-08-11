import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Code as CodeIcon } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import api from '../../api/client';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
];

export default function CodeSubmissionForm({ taskId, question, onSuccess, onCancel }) {
  const [code, setCode] = useState(question?.template || '// Your code here\n');
  const [language, setLanguage] = useState('javascript');
  const [explanation, setExplanation] = useState('');
  const queryClient = useQueryClient();

  const submitMutation = useMutation({
    mutationFn: (data) => api.post('/leetcode/submit', {
      taskId,
      questionNumber: question.questionNumber,
      questionTitle: question.title,
      ...data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['leetcode-task', taskId]);
      onSuccess?.();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    submitMutation.mutate({ code, language, explanation });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full p-2 border rounded"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700">Solution</label>
          <span className="text-xs text-gray-500">
            {LANGUAGES.find(l => l.value === language)?.label}
          </span>
        </div>
        <div className="relative border rounded overflow-hidden">
          <SyntaxHighlighter
            language={language}
            style={atomDark}
            showLineNumbers
            customStyle={{
              margin: 0,
              minHeight: '200px',
              fontSize: '0.875rem',
            }}
          >
            {code}
          </SyntaxHighlighter>
          <textarea
            className="absolute inset-0 w-full h-full opacity-0"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              padding: '1rem',
              resize: 'none',
            }}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Explanation (Optional)
        </label>
        <textarea
          rows={3}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Explain your approach..."
        />
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitMutation.isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {submitMutation.isLoading ? 'Submitting...' : 'Submit Solution'}
        </button>
      </div>
    </form>
  );
}
