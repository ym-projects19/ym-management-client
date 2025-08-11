import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Calendar, MapPin, User, Camera, ExternalLink, AlertCircle } from 'lucide-react';
import api from '../../api/client';

const PublicReportView = () => {
  const { sessionId } = useParams();

  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['public-report', sessionId],
    queryFn: async () => {
      const res = await api.get(`/training/sessions/${sessionId}/public-report`);
      return res.data.report;
    },
    enabled: !!sessionId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading report</h3>
          <p className="mt-1 text-sm text-gray-500">{error.message}</p>
          <Link
            to="/training/sessions"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sessions
          </Link>
        </div>
      </div>
    );
  }

  const report = reportData;
  const session = report?.trainingSession;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/training/sessions"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Sessions
        </Link>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {session?.title || 'Training Session'}
              </h1>
              {session?.collegeName && (
                <p className="text-lg text-gray-600 mt-1">{session.collegeName}</p>
              )}
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Public Report
            </span>
          </div>

          {/* Session Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            {session?.scheduledDate && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{new Date(session.scheduledDate).toLocaleDateString()}</span>
              </div>
            )}
            
            {session?.location && (
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{session.location}</span>
              </div>
            )}
            
            {report?.user?.name && (
              <div className="flex items-center">
                <User className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Reported by {report.user.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photos Section */}
      {report?.photos && report.photos.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Camera className="h-5 w-5 mr-2 text-green-600" />
            Training Photos ({report.photos.length})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.photos.map((photo, index) => (
              <div key={index} className="relative group">
                <img
                  src={photo.url}
                  alt={`Training photo ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => window.open(photo.url, '_blank')}
                />
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {photo.uploadedAt ? new Date(photo.uploadedAt).toLocaleDateString() : 'Training Photo'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LinkedIn Post Section */}
      {report?.linkedinPostUrl && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ExternalLink className="h-5 w-5 mr-2 text-blue-600" />
            LinkedIn Post
          </h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                Training session shared on LinkedIn
              </span>
              <a
                href={report.linkedinPostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View Post
              </a>
            </div>
            
            {report.linkedinPreview && (
              <div className="mt-3 text-sm text-blue-800">
                <p className="font-medium">{report.linkedinPreview.title}</p>
                {report.linkedinPreview.description && (
                  <p className="mt-1 text-blue-700">{report.linkedinPreview.description}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Notes Section */}
      {report?.additionalNotes && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Additional Notes
          </h2>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{report.additionalNotes}</p>
          </div>
        </div>
      )}

      {/* Report Info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Report submitted on {new Date(report?.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
};

export default PublicReportView;