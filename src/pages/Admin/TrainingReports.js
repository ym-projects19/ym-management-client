import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Search, Filter, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../api/client';

const statusOptions = [
  { value: 'pending', label: 'Pending', icon: <Clock className="h-4 w-4 text-yellow-500" /> },
  { value: 'submitted', label: 'Submitted', icon: <CheckCircle className="h-4 w-4 text-blue-500" /> },
  { value: 'reviewed', label: 'Reviewed', icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
  { value: 'rejected', label: 'Rejected', icon: <XCircle className="h-4 w-4 text-red-500" /> },
];

const TrainingReports = () => {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    page: 1,
    limit: 10,
  });
  const [expandedReport, setExpandedReport] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-training-reports', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: filters.page,
        limit: filters.limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
      });
      const res = await api.get(`/admin/training/reports?${params}`);
      return res.data;
    },
    keepPreviousData: true
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key !== 'page' && { page: 1 }),
    }));
  };

  const toggleExpandReport = (reportId) => {
    setExpandedReport(expandedReport === reportId ? null : reportId);
  };

  const getStatusBadge = (status) => {
    const statusInfo = statusOptions.find(s => s.value === status) || {};
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        status === 'reviewed' ? 'bg-green-100 text-green-800' :
        status === 'rejected' ? 'bg-red-100 text-red-800' :
        status === 'submitted' ? 'bg-blue-100 text-blue-800' :
        'bg-yellow-100 text-yellow-800'
      }`}>
        {statusInfo.icon}
        <span className="ml-1">{statusInfo.label}</span>
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'PPpp');
  };

  if (isLoading) return <div className="flex justify-center p-8">Loading...</div>;
  if (error) return <div className="text-center p-8 text-red-600">Error loading reports</div>;

  const { reports = [] } = data || {};

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Training Reports</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 w-full"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          <select
            className="pr-8"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {reports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No reports found</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {reports.map((report) => (
              <li key={report._id} className="hover:bg-gray-50">
                <div 
                  className="px-4 py-4 cursor-pointer"
                  onClick={() => toggleExpandReport(report._id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center">
                        <p className="font-medium">{report.trainingSession?.title || 'Untitled'}</p>
                        <div className="ml-2">
                          {getStatusBadge(report.submissionStatus || 'pending')}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">
                        {report.trainingSession?.collegeName} • {report.user?.name}
                      </p>
                    </div>
                    <div>
                      {expandedReport === report._id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
                {expandedReport === report._id && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium">Session Details</h3>
                        <p className="text-sm">
                          <span className="text-gray-500">College:</span> {report.trainingSession?.collegeName || 'N/A'}
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-500">Date:</span> {formatDate(report.trainingSession?.scheduledDate)}
                        </p>
                      </div>
                      <div>
                        <h3 className="font-medium">Report Details</h3>
                        <p className="text-sm">
                          <span className="text-gray-500">Submitted by:</span> {report.user?.name || 'Unknown'}
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-500">Submitted on:</span> {formatDate(report.createdAt)}
                        </p>
                      </div>
                    </div>
                    {report.linkedinPostUrl && (
                      <div className="mt-4">
                        <h3 className="font-medium mb-2">LinkedIn Post</h3>
                        <a
                          href={report.linkedinPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline text-sm"
                        >
                          View LinkedIn Post
                        </a>
                      </div>
                    )}
                    {report.photos?.length > 0 && (
                      <div className="mt-4">
                        <h3 className="font-medium mb-2">Photos</h3>
                        <div className="flex flex-wrap gap-2">
                          {report.photos.map((photo, i) => (
                            <img
                              key={i}
                              src={photo.url}
                              alt={`Training ${i + 1}`}
                              className="h-24 w-24 object-cover rounded"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {report.reviewComments && (
                      <div className="mt-4 p-3 bg-gray-50 rounded">
                        <h3 className="font-medium">Review Comments</h3>
                        <p className="text-sm mt-1">{report.reviewComments}</p>
                      </div>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TrainingReports;
