import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';

const ReportDetails = () => {
  const { reportId } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['training-report', reportId],
    queryFn: async () => {
      const res = await api.get(`/training/reports/${reportId}`);
      return res.data.report || res.data;
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
        <p className="text-red-600">Error loading report details.</p>
      </div>
    );
  }

  const r = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Report Details</h1>

      <div className="card">
        <div className="space-y-2">
          <p className="text-gray-900 font-medium">
            {r.session?.collegeName || r.collegeName || 'Training Report'}
          </p>
          <p className="text-sm text-gray-600">
            {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
          </p>

          {r.linkedinPostUrl && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-1">LinkedIn Post</p>
              <a href={r.linkedinPostUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 underline">
                {r.linkedinPostUrl}
              </a>
            </div>
          )}

          {!!r.photos?.length && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-2">Photos</p>
              <div className="flex flex-wrap gap-2">
                {r.photos.map((p) => (
                  <img
                    key={p.public_id || p.url}
                    src={p.url}
                    alt="report"
                    className="w-28 h-28 object-cover rounded"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="mt-2">
            <p className="text-sm text-gray-600">
              Status: {r.status || 'draft'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDetails;
