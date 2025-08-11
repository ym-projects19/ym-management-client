// Configuration constants
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#6366F1',
  success: '#059669'
};

export const DATE_FORMATS = {
  display: 'MMM dd, yyyy',
  input: 'yyyy-MM-dd',
  datetime: 'MMM dd, yyyy HH:mm'
};

export default {
  API_BASE_URL,
  CHART_COLORS,
  DATE_FORMATS
};