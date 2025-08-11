import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft,
    Users,
    CheckCircle,
    Clock,
    XCircle,
    AlertTriangle,
    Download,
    Filter
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/client';

const TaskSubmissions = () => {
    const { taskId } = useParams();
    const { user } = useAuth();
    const [selectedQuestion, setSelectedQuestion] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('user');

    // Fetch task details
    const { data: taskData, isLoading: isLoadingTask } = useQuery({
        queryKey: ['leetcode-task', taskId],
        queryFn: async () => {
            const res = await api.get(`/leetcode/tasks/${taskId}`);
            return res.data.task;
        }
    });

    // Fetch all submissions for the task
    const { data: submissionsData, isLoading: isLoadingSubmissions } = useQuery({
        queryKey: ['leetcode-task-submissions', taskId],
        queryFn: async () => {
            const res = await api.get(`/leetcode/tasks/${taskId}/submissions`);
            return res.data.submissions || [];
        },
        enabled: !!taskId
    });

    // Get all assigned users for this task
    const { data: usersData } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await api.get('/users');
            return res.data.users || [];
        },
        enabled: user?.role === 'admin'
    });

    const submissions = submissionsData || [];
    const task = taskData;
    const users = usersData || [];

    // Filter and organize submissions
    const filteredSubmissions = useMemo(() => {
        let filtered = submissions;

        // Filter by question
        if (selectedQuestion !== 'all') {
            filtered = filtered.filter(sub => sub.questionNumber === parseInt(selectedQuestion));
        }

        // Filter by status
        if (statusFilter !== 'all') {
            filtered = filtered.filter(sub => {
                if (statusFilter === 'submitted') return sub.status === 'submitted' || sub.status === 'Accepted';
                if (statusFilter === 'late') return sub.status === 'late';
                if (statusFilter === 'missing') return false; // Handle missing separately
                return sub.status === statusFilter;
            });
        }

        return filtered;
    }, [submissions, selectedQuestion, statusFilter]);

    // Create submission matrix (users vs questions)
    const submissionMatrix = useMemo(() => {
        if (!task?.questions || !users.length) return [];

        const assignedUsers = task.assignedUsers?.length > 0
            ? users.filter(u => task.assignedUsers.includes(u._id))
            : users.filter(u => u.role !== 'admin');

        return assignedUsers.map(user => {
            const userSubmissions = submissions.filter(sub => sub.user?._id === user._id);

            const questionStatus = task.questions.map(question => {
                const submission = userSubmissions.find(sub => sub.questionNumber === question.questionNumber);

                if (!submission) {
                    return {
                        questionNumber: question.questionNumber,
                        status: 'missing',
                        submission: null
                    };
                }

                const isLate = task.deadline && new Date(submission.createdAt) > new Date(task.deadline);

                return {
                    questionNumber: question.questionNumber,
                    status: isLate ? 'late' : 'submitted',
                    submission
                };
            });

            return {
                user,
                questionStatus,
                totalSubmitted: questionStatus.filter(q => q.status !== 'missing').length,
                totalLate: questionStatus.filter(q => q.status === 'late').length
            };
        });
    }, [task, users, submissions]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'submitted':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'late':
                return <AlertTriangle className="w-4 h-4 text-orange-500" />;
            case 'missing':
                return <XCircle className="w-4 h-4 text-red-500" />;
            default:
                return <Clock className="w-4 h-4 text-gray-400" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'submitted':
                return 'bg-green-100 text-green-800';
            case 'late':
                return 'bg-orange-100 text-orange-800';
            case 'missing':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoadingTask || isLoadingSubmissions) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600">Task not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link
                        to={`/leetcode/tasks/${taskId}`}
                        className="inline-flex items-center text-gray-500 hover:text-gray-700"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Task
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Submissions Overview</h1>
                        <p className="text-gray-600">{task.title}</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white shadow rounded-lg p-4">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Filters:</span>
                    </div>

                    <div>
                        <select
                            value={selectedQuestion}
                            onChange={(e) => setSelectedQuestion(e.target.value)}
                            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Questions</option>
                            {task.questions?.map((q) => (
                                <option key={q.questionNumber} value={q.questionNumber}>
                                    #{q.questionNumber} - {q.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="submitted">Submitted</option>
                            <option value="late">Late</option>
                            <option value="missing">Missing</option>
                        </select>
                    </div>

                    <div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="user">Sort by User</option>
                            <option value="submitted">Sort by Submitted</option>
                            <option value="completion">Sort by Completion</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Submission Matrix */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Submission Matrix
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Overview of all user submissions across questions
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                {task.questions?.map((question) => (
                                    <th key={question.questionNumber} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="flex flex-col items-center">
                                            <span>#{question.questionNumber}</span>
                                            <span className="text-xs text-gray-400 normal-case truncate max-w-20">
                                                {question.title}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Progress
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {submissionMatrix.map((userRow) => (
                                <tr key={userRow.user._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                                <span className="text-blue-600 font-medium text-sm">
                                                    {userRow.user.name?.charAt(0) || 'U'}
                                                </span>
                                            </div>
                                            <div className="ml-3">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {userRow.user.name}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {userRow.user.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {userRow.questionStatus.map((questionStatus) => (
                                        <td key={questionStatus.questionNumber} className="px-3 py-4 text-center">
                                            <div className="flex justify-center">
                                                {questionStatus.submission ? (
                                                    <Link
                                                        to={`/leetcode/submissions/${questionStatus.submission._id}`}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:scale-110 transition-transform"
                                                        title={`${questionStatus.status} - Click to view`}
                                                    >
                                                        {getStatusIcon(questionStatus.status)}
                                                    </Link>
                                                ) : (
                                                    <div className="inline-flex items-center justify-center w-8 h-8">
                                                        {getStatusIcon(questionStatus.status)}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    ))}

                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="text-sm font-medium text-gray-900">
                                                {userRow.totalSubmitted}/{task.questions?.length || 0}
                                            </div>
                                            <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full"
                                                    style={{
                                                        width: `${(userRow.totalSubmitted / (task.questions?.length || 1)) * 100}%`
                                                    }}
                                                ></div>
                                            </div>
                                            {userRow.totalLate > 0 && (
                                                <span className="text-xs text-orange-600 mt-1">
                                                    {userRow.totalLate} late
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <Users className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Total Users</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {submissionMatrix.length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Total Submissions</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {submissions.length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-8 w-8 text-orange-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Late Submissions</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {submissions.filter(s => s.status === 'late').length}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <XCircle className="h-8 w-8 text-red-600" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Missing Submissions</p>
                            <p className="text-2xl font-semibold text-gray-900">
                                {submissionMatrix.reduce((acc, user) =>
                                    acc + user.questionStatus.filter(q => q.status === 'missing').length, 0
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskSubmissions;