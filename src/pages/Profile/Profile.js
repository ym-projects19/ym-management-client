import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';

const Profile = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data.user || res.data;
    }
  });

  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
  });

  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const updateProfile = useMutation({
    mutationFn: async (payload) => {
      const res = await api.put('/users/me', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries('me');
    }
  });

  const changePassword = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/users/change-password', payload);
      return res.data;
    }
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries('me');
      alert('Avatar updated');
    },
    onError: () => alert('Failed to upload avatar')
  });

  const removeAvatar = useMutation({
    mutationFn: async () => {
      const res = await api.delete('/users/me/avatar');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries('me');
      setAvatarFile(null);
      setAvatarPreview('');
      alert('Avatar removed');
    },
    onError: () => alert('Failed to remove avatar')
  });

  React.useEffect(() => {
    if (data) {
      setProfileForm({
        name: data.name || '',
        email: data.email || '',
      });
      setAvatarPreview(data.profileImageUrl || '');
    }
  }, [data]);

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
        <p className="text-red-600">Error loading profile.</p>
      </div>
    );
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(String(ev.target?.result || ''));
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = () => {
    if (!avatarFile) {
      alert('Please choose an image first');
      return;
    }
    uploadAvatar.mutate(avatarFile);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>

      {/* Avatar */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Profile Picture</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-600 text-xl">
                  {profileForm.name ? profileForm.name[0].toUpperCase() : 'U'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="form-input"
              />
              <button
                className="btn-primary"
                onClick={handleUploadAvatar}
                disabled={uploadAvatar.isLoading}
              >
                {uploadAvatar.isLoading ? 'Uploading...' : 'Upload'}
              </button>
              {avatarPreview && (
                <button
                  className="btn-secondary"
                  onClick={() => removeAvatar.mutate()}
                  disabled={removeAvatar.isLoading}
                  title="Remove current avatar"
                >
                  {removeAvatar.isLoading ? 'Removing...' : 'Remove'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Your Information</h3>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            updateProfile.mutate(profileForm, {
              onSuccess: () => alert('Profile updated'),
              onError: () => alert('Failed to update'),
            });
          }}
        >
          <div>
            <label className="form-label">Name</label>
            <input
              className="form-input mt-1"
              value={profileForm.name}
              onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input
              className="form-input mt-1"
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
              required
              disabled
              title="Email changes typically require admin"
            />
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" type="submit" disabled={updateProfile.isLoading}>
              {updateProfile.isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!pwdForm.currentPassword || !pwdForm.newPassword) {
              alert('Both fields are required');
              return;
            }
            changePassword.mutate(pwdForm, {
              onSuccess: () => {
                alert('Password changed');
                setPwdForm({ currentPassword: '', newPassword: '' });
              },
              onError: () => alert('Failed to change password'),
            });
          }}
        >
          <div>
            <label className="form-label">Current Password</label>
            <input
              className="form-input mt-1"
              type="password"
              value={pwdForm.currentPassword}
              onChange={(e) => setPwdForm((f) => ({ ...f, currentPassword: e.target.value }))}
              placeholder="Enter current password"
              required
            />
          </div>
          <div>
            <label className="form-label">New Password</label>
            <input
              className="form-input mt-1"
              type="password"
              value={pwdForm.newPassword}
              onChange={(e) => setPwdForm((f) => ({ ...f, newPassword: e.target.value }))}
              placeholder="Enter new password"
              required
            />
          </div>
          <div className="flex justify-end">
            <button className="btn-primary" type="submit" disabled={changePassword.isLoading}>
              {changePassword.isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
