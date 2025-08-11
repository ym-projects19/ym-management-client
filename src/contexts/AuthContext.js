import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize session using access token only (no refresh)
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      console.log('🔍 Auth initialization - Token exists:', !!token);
      
      try {
        if (token) {
          console.log('🔍 Making request to /auth/me...');
          const response = await api.get('/auth/me');
          console.log('✅ Auth me response:', response.data);
          setUser(response.data.user || response.data);
        } else {
          // Not signed in
          console.log('🔍 No token found, setting user to null');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error.response?.status, error.response?.data || error.message);
        
        // Check if it's a network error (backend not running)
        if (!error.response) {
          console.error('❌ Network error - backend might not be running');
        }
        
        // invalid/expired token; clear
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        console.log('🔍 Auth initialization complete, setting loading to false');
        setLoading(false);
      }
    };
    
    // Add a small delay to prevent rapid re-renders
    const timer = setTimeout(initializeAuth, 100);
    return () => clearTimeout(timer);
  }, []);

  const login = async (email, password) => {
    try {
      console.log('🔍 Attempting login for:', email);
      const response = await api.post('/auth/login', { email, password });
      console.log('✅ Login response:', response.data);
      
      const accessToken = response.data?.accessToken || response.data?.token;
      if (accessToken) {
        localStorage.setItem('token', accessToken);
        console.log('✅ Token saved to localStorage');
      }
      const userData = response.data.user;
      setUser(userData);
      console.log('✅ User set:', userData);
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      console.error('❌ Login error:', error.response?.status, error.response?.data || error.message);
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      // Best-effort server-side logout; backend no longer needs auth to clear server state
      await api.post('/auth/logout');
    } catch (_) {
      // ignore
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const forgotPassword = async (email) => {
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('If the email exists, an OTP has been sent');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send OTP';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      toast.success('Password reset successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Password reset failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const updateProfile = async (userId, data) => {
    try {
      const response = await api.put(`/users/${userId}`, data);
      const updatedUser = response.data.user;
      setUser(updatedUser);
      toast.success('Profile updated successfully!');
      return { success: true, user: updatedUser };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const changePassword = async (userId, currentPassword, newPassword) => {
    try {
      await api.put(`/users/${userId}/password`, { currentPassword, newPassword });
      toast.success('Password changed successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    changePassword,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
