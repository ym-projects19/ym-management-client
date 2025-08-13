import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Users, FileText, Camera, ExternalLink, AlertCircle } from 'lucide-react';
import api from '../../api/client';

const TrainingSessions = () => {
  const [filter, setFilter] = useState('all'); // all, upcoming, completed, my-reports

  const { data, isLoading, error } = useQuery({
    queryKey: ['training-sessions'],
    queryFn: async () => {
      const res = await api.get('/training/sessions');
      return res.data.sessions || res.data;
    }
  });

  // Fetch user's reports to show submission status
  const { data: userReports = [] } = useQuery({
    queryKey: ['my-training-reports'],
    queryFn: async () => {
      try {
        const res = await api.get('/training/reports');
        return res.data.reports || [];
      } catch (error) {
        // Return empty array if endpoint doesn't exist yet
        return [];
      }
    }
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
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading sessions</h3>
        <p className="mt-1 text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  const sessions = Array.isArray(data) ? data : [];
  
  // Create a map of session reports for quick lookup
  const reportsBySession = userReports.reduce((acc, report) => {
    if (report.trainingSession) {
      acc[report.trainingSession._id || report.trainingSession] = report;
    }
    return acc;
  }, {});

  const getSessionStatus = (session) => {
    // For public sessions, they should always be considered as 'public' status
    if (session.isPublic) {
      return 'public';
    }

    const now = new Date();
    const sessionDate = new Date(session.scheduledDate);
    const report = reportsBySession[session._id];
    
    if (report) {
      // Check the correct field name - submissionStatus instead of status
      return report.submissionStatus === 'submitted' ? 'completed' : 'draft';
    }
    
    return sessionDate > now ? 'upcoming' : 'pending';
  };

  const filteredSessions = sessions.filter(session => {
    const status = getSessionStatus(session);
    if (filter === 'all') return true;
    if (filter === 'upcoming') return status === 'upcoming';
    if (filter === 'completed') return status === 'completed';
    if (filter === 'pending') return status === 'pending';
    if (filter === 'public') return status === 'public';
    return true;
  });

  const getStatusBadge = (status) => {
    const badges = {
      upcoming: { color: 'bg-blue-100 text-blue-800', text: 'Upcoming' },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Report Pending' },
      draft: { color: 'bg-orange-100 text-orange-800', text: 'Draft Saved' },
      completed: { color: 'bg-green-100 text-green-800', text: 'Completed' }
    };
    
    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Training Sessions</h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600">
          View your assigned training sessions, submit reports, and explore public sessions
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex overflow-x-auto scrollbar-hide">
            <div className="flex space-x-2 sm:space-x-8 min-w-max px-1">
              {[
                { key: 'all', label: 'All Sessions', count: sessions.length },
                { key: 'upcoming', label: 'Upcoming', count: sessions.filter(s => getSessionStatus(s) === 'upcoming').length },
                { key: 'pending', label: 'Pending Reports', count: sessions.filter(s => getSessionStatus(s) === 'pending').length },
                { key: 'completed', label: 'Completed', count: sessions.filter(s => getSessionStatus(s) === 'completed').length },
                { key: 'public', label: 'Public Sessions', count: sessions.filter(s => getSessionStatus(s) === 'public').length }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                    filter === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  {tab.count > 0 && (
                    <span className={`ml-1 sm:ml-2 py-0.5 px-1.5 sm:px-2 rounded-full text-xs ${
                      filter === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
              </button>
            ))}
            </div>
          </nav>
        </div>
      </div>

      {filteredSessions.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filter === 'all' 
              ? 'No training sessions have been assigned to you yet.'
              : `No ${filter} sessions found.`
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredSessions.map((session) => {
            const status = getSessionStatus(session);
            const report = reportsBySession[session._id];
            const sessionDate = new Date(session.scheduledDate);
            const isUpcoming = sessionDate > new Date();
            
            return (
              <div key={session._id} className={`bg-white rounded-lg shadow-sm border transition-shadow ${
                session.isPublic 
                  ? 'border-blue-200 hover:shadow-lg hover:border-blue-300' 
                  : 'border-gray-200 hover:shadow-md'
              }`}>
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {session.title || session.collegeName}
                        </h3>
                        {session.isPublic && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Public
                          </span>
                        )}
                      </div>
                      {session.collegeName && session.title && (
                        <p className="text-sm text-gray-600">{session.collegeName}</p>
                      )}
                    </div>
                    {!session.isPublic && getStatusBadge(status)}
                  </div>

                  {/* Session Details */}
                  <div className="space-y-2 mb-4">
                    {session.scheduledDate && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{sessionDate.toLocaleDateString()} at {sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    
                    {session.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{session.location}</span>
                      </div>
                    )}
                    
                    {session.assignedUsers && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{session.assignedUsers.length} participants</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {session.description && (
                    <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                      {session.description}
                    </p>
                  )}

                  {/* Report Status */}
                  {report && !session.isPublic && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Report Status: {report.submissionStatus === 'submitted' ? 'Submitted' : 'Draft'}
                        </span>
                        {report.photos && report.photos.length > 0 && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Camera className="h-3 w-3 mr-1" />
                            {report.photos.length} photos
                          </div>
                        )}
                      </div>
                      {report.linkedinPostUrl && (
                        <div className="flex items-center mt-1 text-xs text-gray-500">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          LinkedIn post shared
                        </div>
                      )}
                    </div>
                  )}

                  {/* Public Session Info */}
                  {session.isPublic && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900">
                          Public Session - View completed training report
                        </span>
                        <div className="flex items-center text-xs text-blue-700">
                          <Camera className="h-3 w-3 mr-1" />
                          Photos & LinkedIn post available
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <Link
                      to={`/training/sessions/${session._id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View Details
                    </Link>
                    
                    <div className="flex items-center space-x-2">
                      {!session.isPublic && !isUpcoming && (
                        <Link
                          to={`/training/sessions/${session._id}/submit-report`}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          {report ? 'Edit Report' : 'Submit Report'}
                        </Link>
                      )}
                      {session.isPublic && (
                        <Link
                          to={`/training/sessions/${session._id}/public-report`}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Camera className="h-3 w-3 mr-1" />
                          View Public Report
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrainingSessions;