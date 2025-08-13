import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const ExportButton = ({
  type,
  label,
  onExportStart,
  className = '',
  filters = {},
  format = 'csv' // 'csv' or 'excel'
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;

    setIsExporting(true);
    onExportStart?.();

    try {
      const params = new URLSearchParams({
        format,
        ...filters
      });

      const response = await api.get(`/admin/export/${type}?${params}`, {
        responseType: 'blob',
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      // Set filename based on type and format
      const timestamp = new Date().toISOString().split('T')[0];
      const extension = format === 'excel' ? 'xlsx' : 'csv';
      link.setAttribute('download', `${type}_export_${timestamp}.${extension}`);

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`${label} exported successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export ${label.toLowerCase()}`);
    } finally {
      setIsExporting(false);
    }
  };

  const Icon = format === 'excel' ? FileSpreadsheet : FileText;

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`inline-flex items-center ${className} ${isExporting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
        }`}
    >
      {isExporting ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
      ) : (
        <Icon className="h-4 w-4 mr-2" />
      )}
      {isExporting ? 'Exporting...' : label}
    </button>
  );
};

export default ExportButton;