import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';

function useQueryParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const TrainingReports = () => {
  const qp = useQueryParams();
  const sessionIdParam = qp.get('sessionId') || '';
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    sessionId: sessionIdParam,
    linkedinUrl: '',
  });
  const [files, setFiles] = useState([]);

  // List my reports
  const { data, isLoading, error } = useQuery({
    queryKey: ['training-reports'],
    queryFn: async () => {
      const res = await api.get('/training/reports');
      return res.data.reports || res.data;
    }
  });

  // Create a new report
  const createReport = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/training/reports', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['training-reports']);
      alert('Report created/updated.');
    },
  });

  // Upload photos to a report
  const uploadPhotos = useMutation({
    mutationFn: async ({ reportId, files }) => {
      const fd = new FormData();
      for (const f of files) fd.append('photos', f);
      const res = await api.post(`/training/reports/${reportId}/photos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['training-reports']);
      alert('Photos uploaded.');
      setFiles([]);
    },
  });

  // Submit report (finalize)
  const submitReport = useMutation({
    mutationFn: async ({ reportId }) => {
      const res = await api.post(`/training/reports/${reportId}/submit`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['training-reports']);
      alert('Report submitted.');
    },
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.sessionId) {
      alert('Session is required');
      return;
    }
    createReport.mutate({
      sessionId: form.sessionId,
      linkedinPostUrl: form.linkedinUrl || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Training Reports</h1>
        <Link to="/training/sessions" className="btn-secondary">Sessions</Link>
      </div>

      {/* Create/Update Report */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Create / Update Report</h3>
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="form-label">Session ID</label>
            <input
              className="form-input mt-1"
              placeholder="Enter assigned session ID"
              value={form.sessionId}
              onChange={(e) => setForm((f) => ({ ...f, sessionId: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="form-label">LinkedIn Post URL (optional)</label>
            <input
              className="form-input mt-1"
              placeholder="https://www.linkedin.com/..."
              value={form.linkedinUrl}
              onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
            />
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={createReport.isLoading}>
              {createReport.isLoading ? 'Saving...' : 'Save Report'}
            </button>
          </div>
        </form>
      </div>

      {/* My Reports List */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">My Reports</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="spinner w-8 h-8"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">Error loading reports.</p>
          </div>
        ) : (Array.isArray(data) && data.length ? (
          <div className="space-y-4">
            {data.map((r) => (
              <div key={r._id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{r.collegeName || r.session?.collegeName || 'Report'}</p>
                    <p className="text-sm text-gray-600">
                      {r.session ? (r.session.collegeName || r.session.title) : ''} {r.createdAt ? `• ${new Date(r.createdAt).toLocaleString()}` : ''}
                    </p>
                    {r.linkedinPostUrl && (
                      <a
                        href={r.linkedinPostUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 text-sm hover:text-blue-800 underline"
                      >
                        LinkedIn Post
                      </a>
                    )}
                    {!!r.photos?.length && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {r.photos.map((p) => (
                          <img
                            key={p.public_id || p.url}
                            src={p.url}
                            alt="report"
                            className="w-24 h-24 object-cover rounded"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex flex-col gap-2 items-end">
                    <Link to={`/training/reports/${r._id}`} className="btn-secondary w-full text-center">
                      Open
                    </Link>

                    {/* Upload Photos */}
                    <label className="btn-secondary cursor-pointer w-full text-center">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => setFiles(Array.from(e.target.files || []))}
                      />
                      Choose Photos
                    </label>
                    <button
                      className="btn-primary w-full"
                      disabled={!files.length || uploadPhotos.isLoading}
                      onClick={() => uploadPhotos.mutate({ reportId: r._id, files })}
                    >
                      {uploadPhotos.isLoading ? 'Uploading...' : 'Upload Selected'}
                    </button>

                    {/* Submit Report */}
                    <button
                      className="btn-primary w-full"
                      disabled={submitReport.isLoading}
                      onClick={() => submitReport.mutate({ reportId: r._id })}
                    >
                      {submitReport.isLoading ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No reports yet.</p>
        ))}
      </div>
    </div>
  );
};

export default TrainingReports;
