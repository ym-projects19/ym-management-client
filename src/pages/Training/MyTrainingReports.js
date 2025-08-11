import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Search, Filter, CheckCircle, Clock, XCircle, ChevronDown, Upload, 
  Camera, ExternalLink, MapPin, Calendar, Eye, Edit, Trash2, 
  ZoomIn, X, ChevronLeft, ChevronRight 
} from 'lucide-react';
import api from '../../api/client';

const statusOptions = [
  { value: 'draft', label: 'Draft', icon: <Clock className="h-4 w-4 text-yellow-500" />, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'submitted', label: 'Submitted', icon: <CheckCircle className="h-4 w-4 text-blue-500" />, color: 'bg-blue-100 text-blue-800' },
  { value: 'reviewed', label: 'Reviewed', icon: <CheckCircle className="h-4 w-4 text-green-500" />, color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Rejected', icon: <XCircle className="h-4 w-4 text-red-500" />, color: 'bg-red-100 text-red-800' },
];

const MyTrainingReports = () => {
  const [filters, setFilters] = useState({ search: '', status: '', page: 1, limit: 10 });
  const [expandedReport, setExpandedReport] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-training-reports', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: filters.page,
        limit: filters.limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
      });
      const res = await api.get(`/training/reports?${params}`);
      return {
        reports: res.data.reports || [],
        total: res.data.pagination?.total || 0
      };
    },
    keepPreviousData: true
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, ...(key !== 'page' && { page: 1 }) }));
  };

  const openPhotoModal = (photos, startIndex = 0) => {
    setSelectedPhotos(photos);
    setCurrentPhotoIndex(startIndex);
    setShowPhotoModal(true);
  };

  const closePhotoModal = () => {
    setShowPhotoModal(false);
    setSelectedPhotos([]);
    setCurrentPhotoIndex(0);
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % selectedPhotos.length);
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + selectedPhotos.length) % selectedPhotos.length);
  };

  const getStatusBadge = (status) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    if (!statusOption) return null;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusOption.color}`}>
        {statusOption.icon}
        <span className="ml-1">{statusOption.label}</span>
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading reports</h3>
        <p className="mt-1 text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  const reports = data?.reports || [];
  const totalPages = Math.ceil((data?.total || 0) / filters.limit);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Training Reports</h1>
        <p className="mt-2 text-gray-600">
          View and manage your training session reports
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-48">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="text-center py-12">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.search || filters.status 
              ? 'No reports match your current filters.'
              : 'You haven\'t submitted any training reports yet.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => (
            <div key={report._id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {report.trainingSession?.title || report.trainingSession?.collegeName || 'Training Report'}
                    </h3>
                    {report.trainingSession && (
                      <div className="mt-1 space-y-1">
                        {report.trainingSession.collegeName && report.trainingSession.title && (
                          <p className="text-sm text-gray-600">{report.trainingSession.collegeName}</p>
                        )}
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{format(new Date(report.createdAt), 'MMM dd, yyyy')}</span>
                          {report.trainingSession.location && (
                            <>
                              <span className="mx-2">•</span>
                              <MapPin className="h-4 w-4 mr-1" />
                              <span>{report.trainingSession.location}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(report.status)}
                    <button
                      onClick={() => setExpandedReport(expandedReport === report._id ? null : report._id)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <ChevronDown className={`h-5 w-5 transform transition-transform ${
                        expandedReport === report._id ? 'rotate-180' : ''
                      }`} />
                    </button>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                  {report.photos && report.photos.length > 0 && (
                    <div className="flex items-center">
                      <Camera className="h-4 w-4 mr-1" />
                      <span>{report.photos.length} photos</span>
                    </div>
                  )}
                  {report.linkedinPostUrl && (
                    <div className="flex items-center">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      <span>LinkedIn post</span>
                    </div>
                  )}
                  {report.location && report.location.address && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>Location tagged</span>
                    </div>
                  )}
                </div>

                {/* Photo Preview */}
                {report.photos && report.photos.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                      {report.photos.slice(0, 4).map((photo, index) => (
                        <div key={index} className="relative flex-shrink-0">
                          <img
                            src={photo.url}
                            alt={`Report photo ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
                            onClick={() => openPhotoModal(report.photos, index)}
                          />
                          {index === 3 && report.photos.length > 4 && (
                            <div 
                              className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center cursor-pointer"
                              onClick={() => openPhotoModal(report.photos, index)}
                            >
                              <span className="text-white text-sm font-medium">
                                +{report.photos.length - 4}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                      {report.photos.length > 4 && (
                        <button
                          onClick={() => openPhotoModal(report.photos, 0)}
                          className="flex-shrink-0 w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
                        >
                          <Eye className="h-6 w-6" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded Content */}
                {expandedReport === report._id && (
                  <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                    {report.description && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Description</h4>
                        <p className="text-sm text-gray-700">{report.description}</p>
                      </div>
                    )}

                    {report.linkedinPostUrl && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">LinkedIn Post</h4>
                        <a
                          href={report.linkedinPostUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View LinkedIn Post
                        </a>
                      </div>
                    )}

                    {report.location && report.location.address && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Location</h4>
                        <p className="text-sm text-gray-700">{report.location.address}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                      {report.status === 'draft' && (
                        <Link
                          to={`/training/sessions/${report.trainingSession._id}/submit-report`}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit Report
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((filters.page - 1) * filters.limit) + 1} to {Math.min(filters.page * filters.limit, data?.total || 0)} of {data?.total || 0} reports
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleFilterChange('page', Math.max(1, filters.page - 1))}
              disabled={filters.page === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              Page {filters.page} of {totalPages}
            </span>
            <button
              onClick={() => handleFilterChange('page', Math.min(totalPages, filters.page + 1))}
              disabled={filters.page === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {showPhotoModal && selectedPhotos.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={closePhotoModal}
              className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75"
            >
              <X className="h-6 w-6" />
            </button>
            
            <img
              src={selectedPhotos[currentPhotoIndex].url}
              alt={`Photo ${currentPhotoIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            
            {selectedPhotos.length > 1 && (
              <>
                <button
                  onClick={prevPhoto}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={nextPhoto}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  {currentPhotoIndex + 1} / {selectedPhotos.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTrainingReports;