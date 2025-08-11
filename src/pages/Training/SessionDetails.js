import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';

const SessionDetails = () => {
  const { sessionId } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['training-session', sessionId],
    queryFn: async () => {
      const res = await api.get(`/training/sessions/${sessionId}`);
      return res.data.session || res.data; // support either shape
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-8 h-8"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading session details.</p>
      </div>
    );
  }

  const s = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{s.title || s.collegeName || 'Session Details'}</h1>
          <p className="text-gray-600">
            {s.collegeName} {s.location ? `• ${s.location}` : ''} {s.scheduledDate ? `• ${new Date(s.scheduledDate).toLocaleString()}` : ''}
          </p>
        </div>
        <Link to="/training/reports" className="btn-secondary">My Reports</Link>
      </div>

      <div className="card">
        <div className="space-y-2">
          {s.description && <p className="text-gray-800">{s.description}</p>}
          {s.assignedUsers?.length ? (
            <p className="text-sm text-gray-600">Assigned: {s.assignedUsers.map(u => u.name || u.email).join(', ')}</p>
          ) : null}
          <p className="text-sm text-gray-600">Status: {s.status || 'Scheduled'}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Link to={`/training/reports?sessionId=${s._id}`} className="btn-primary">
          Create / View Report
        </Link>
      </div>
    </div>
  );
};

export default SessionDetails;
