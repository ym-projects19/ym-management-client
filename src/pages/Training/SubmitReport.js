import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, Loader2, MapPin, Link, Camera, Save, Send } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import api from '../../api/client';

const SubmitReport = () => {
  const { sessionId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    linkedinUrl: '',
    description: '',
    photos: [],
    location: {
      latitude: null,
      longitude: null,
      address: ''
    },
    sessionId: sessionId || '',
    status: 'draft' // draft, submitted
  });
  const [uploading, setUploading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [existingReport, setExistingReport] = useState(null);

  // Fetch session details if sessionId is provided
  const { data: session, error: sessionError } = useQuery({
    queryKey: ['training-session', sessionId],
    queryFn: async () => {
      console.log('Fetching session data for sessionId:', sessionId);
      const res = await api.get(`/training/sessions/${sessionId}`);
      console.log('Session response:', res.data);
      return res.data.session;
    },
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 5,
    onSuccess: (data) => {
      console.log('Session data loaded:', data);
    },
    onError: (error) => {
      console.error('Session loading error:', error);
    }
  });

  // Check for existing report (disable for now until backend is ready)
  const { data: existingReportData, error: reportError, isLoading: reportLoading } = useQuery({
    queryKey: ['training-report', sessionId],
    queryFn: async () => {
      try {
        console.log('Frontend: Fetching report for sessionId:', sessionId);
        const res = await api.get(`/training/reports/session/${sessionId}`);
        console.log('Frontend: Report API response:', res.data);
        return res.data.report;
      } catch (error) {
        // Return null if report doesn't exist yet (404 is expected)
        if (error.response?.status === 404) {
          console.log('Frontend: No report found (404) - this is normal for new reports');
          return null;
        }
        console.error('Frontend: Error fetching existing report:', error);
        throw error;
      }
    },
    enabled: !!sessionId,
    retry: false, // Don't retry on 404
    onSuccess: (data) => {
      console.log('Frontend: Query onSuccess called with data:', data);
      if (data) {
        console.log('Frontend: Loading existing report data:', {
          id: data._id,
          photos: data.photos?.length || 0,
          linkedinUrl: data.linkedinPostUrl,
          status: data.submissionStatus
        });
        setExistingReport(data);
        setFormData(prev => ({
          ...prev,
          linkedinUrl: data.linkedinPostUrl || '',
          description: data.additionalNotes || '',
          photos: data.photos || [],
          location: data.location || { latitude: null, longitude: null, address: '' },
          sessionId: sessionId || '',
          status: data.submissionStatus || 'draft'
        }));
        console.log('Frontend: Form data updated');
      } else {
        console.log('Frontend: No existing report found for session:', sessionId);
      }
    },
    onError: (error) => {
      console.error('Frontend: Report query error:', error);
    }
  });

  // Manual effect to load existing report data when it becomes available
  useEffect(() => {
    if (existingReportData) {
      console.log('useEffect: Loading report data into form:', existingReportData);
      setExistingReport(existingReportData);
      setFormData(prev => ({
        ...prev,
        linkedinUrl: existingReportData.linkedinPostUrl || '',
        description: existingReportData.additionalNotes || '',
        photos: existingReportData.photos || [],
        location: existingReportData.location || { latitude: null, longitude: null, address: '' },
        status: existingReportData.submissionStatus || 'draft'
      }));
    }
  }, [existingReportData]);

  // Get current location
  const getCurrentLocation = () => {
    setGettingLocation(true);

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Use coordinates as address for now (can be enhanced later with geocoding service)
        const address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

        setFormData(prev => ({
          ...prev,
          location: { latitude, longitude, address }
        }));

        toast.success('Location captured successfully');

        setGettingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('Unable to get your location. Please enable location services.');
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (data) => {
      const payload = {
        trainingSessionId: sessionId,
        linkedinPostUrl: data.linkedinUrl,
        additionalNotes: data.description,
        photos: formData.photos.map(photo => ({
          url: photo.url,
          publicId: photo.public_id,
          geoLocation: photo.geoLocation || null
        }))
      };

      return await api.post('/training/reports', payload);
    },
    onSuccess: (response) => {
      toast.success('Draft saved successfully');
      setExistingReport(response.data.report);
      queryClient.invalidateQueries(['training-report', sessionId]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error saving draft');
    }
  });

  // Submit report mutation
  const submitReportMutation = useMutation({
    mutationFn: async (data) => {
      // First create/update the report
      const payload = {
        trainingSessionId: sessionId,
        linkedinPostUrl: data.linkedinUrl,
        additionalNotes: data.description,
        photos: formData.photos.map(photo => ({
          url: photo.url,
          publicId: photo.public_id,
          geoLocation: photo.geoLocation || null
        }))
      };

      let reportResponse;
      if (existingReport) {
        // Update existing report
        reportResponse = await api.post('/training/reports', payload);
      } else {
        // Create new report
        reportResponse = await api.post('/training/reports', payload);
      }

      const reportId = reportResponse.data.report._id;

      // Photos are already uploaded individually, so we just need to associate them with the report
      // This would require updating the backend to handle photo association, for now we'll skip this step

      // Then submit the report
      await api.post(`/training/reports/${reportId}/submit`);

      return reportResponse;
    },
    onSuccess: () => {
      toast.success('Report submitted successfully!');
      queryClient.invalidateQueries(['training-reports']);
      navigate('/training/sessions');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error submitting report');
    }
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 10,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length + formData.photos.length > 10) {
        toast.error('You can upload a maximum of 10 photos');
        return;
      }

      setUploading(true);
      const uploadedPhotos = [];

      try {
        // Upload photos immediately for better UX
        for (const file of acceptedFiles) {
          const uploadFormData = new FormData();
          uploadFormData.append('file', file);

          try {
            const res = await api.post('/training/upload/training-photo', uploadFormData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });

            uploadedPhotos.push({
              url: res.data.url,
              public_id: res.data.public_id,
              width: null,
              height: null,
              uploadedAt: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error uploading photo:', error);
            toast.error(`Failed to upload ${file.name}`);
          }
        }

        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, ...uploadedPhotos]
        }));

        toast.success(`${acceptedFiles.length} photo(s) selected successfully`);

      } catch (error) {
        console.error('Error uploading photos:', error);
        toast.error('Error uploading some photos. Please try again.');
      } finally {
        setUploading(false);
      }
    },
  });

  const removePhoto = async (index) => {
    const photoToRemove = formData.photos[index];
    const newPhotos = [...formData.photos];
    newPhotos.splice(index, 1);

    setFormData(prev => ({
      ...prev,
      photos: newPhotos
    }));

    // Photo removed from preview

    // Optionally delete from Cloudinary
    if (photoToRemove.public_id) {
      try {
        await api.delete(`/upload/photo/${photoToRemove.public_id}`);
      } catch (error) {
        console.warn('Could not delete photo from cloud storage:', error);
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveDraft = () => {
    saveDraftMutation.mutate(formData);
  };

  const handleSubmitReport = (e) => {
    e.preventDefault();

    if (formData.photos.length === 0 && !formData.linkedinUrl) {
      toast.error('Please upload at least one photo or provide a LinkedIn post URL');
      return;
    }

    submitReportMutation.mutate(formData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {session ? `Training Report: ${session.title}` : 'Submit Training Report'}
              </h1>
              {session && (
                <p className="text-sm text-gray-600 mt-1">
                  {session.collegeName && `${session.collegeName} • `}
                  {session.location && `${session.location} • `}
                  {session.scheduledDate && new Date(session.scheduledDate).toLocaleDateString()}
                </p>
              )}
            </div>
            {existingReport && (
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${existingReport.submissionStatus === 'submitted'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
                  }`}>
                  {existingReport.submissionStatus === 'submitted' ? 'Submitted' : 'Draft'}
                </span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmitReport} className="p-6 space-y-8">
          {/* Location Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                Location Information
              </h3>
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {gettingLocation ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4 mr-2" />
                )}
                {gettingLocation ? 'Getting Location...' : 'Get Current Location'}
              </button>
            </div>

            {formData.location.latitude && (
              <div className="bg-white rounded-md p-3 border border-gray-200">
                <p className="text-sm text-gray-600">
                  <strong>Address:</strong> {formData.location.address}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Coordinates: {formData.location.latitude}, {formData.location.longitude}
                </p>
              </div>
            )}
          </div>

          {/* Photos Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Camera className="h-5 w-5 mr-2 text-green-600" />
              Training Photos
            </h3>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
                }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              {uploading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>Uploading photos...</span>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {isDragActive ? 'Drop photos here' : 'Upload Training Photos'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Drag and drop photos here, or click to select files
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Maximum 10 photos • JPG, PNG, GIF up to 10MB each
                  </p>
                </div>
              )}
            </div>

            {/* Photo Preview Grid */}
            {formData.photos.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Uploaded Photos ({formData.photos.length}/10)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {formData.photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo.url}
                        alt={`Training photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                          {new Date(photo.uploadedAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* LinkedIn Post Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Link className="h-5 w-5 mr-2 text-blue-600" />
              LinkedIn Post (Optional)
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LinkedIn Post URL
                </label>
                <input
                  type="url"
                  name="linkedinUrl"
                  value={formData.linkedinUrl}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="https://www.linkedin.com/posts/your-post-url"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Share the link to your LinkedIn post about this training session
                </p>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Share your experience, key learnings, or any additional details about the training session..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saveDraftMutation.isLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saveDraftMutation.isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Draft
              </button>

              <button
                type="submit"
                disabled={submitReportMutation.isLoading || (formData.photos.length === 0 && !formData.linkedinUrl)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitReportMutation.isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Report
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitReport;
