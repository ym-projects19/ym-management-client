import React, { useState, useEffect } from 'react';
import { Search, Filter, X, Calendar as CalendarIcon, Tag, Clock } from 'lucide-react';
import { format, isAfter, isBefore, isToday, addDays, parseISO } from 'date-fns';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

const DIFFICULTY_OPTIONS = [
  { value: 'all', label: 'All Difficulties' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'expired', label: 'Expired' },
  { value: 'completed', label: 'Completed' },
];

const DATE_RANGES = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'Next 7 Days', value: 'next7' },
  { label: 'Next 30 Days', value: 'next30' },
  { label: 'Custom Range', value: 'custom' },
];

const TaskFilters = ({
  searchTerm,
  onSearchChange,
  filters,
  onFilterChange,
  onDateRangeChange,
  onResetFilters,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [isTyping, setIsTyping] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isTyping) {
        onSearchChange(localSearch);
        setIsTyping(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearch, isTyping, onSearchChange]);

  const handleSearchChange = (e) => {
    setLocalSearch(e.target.value);
    setIsTyping(true);
  };

  const handleDateRangeSelect = (ranges) => {
    const { selection } = ranges;
    onDateRangeChange(selection);
  };

  const hasActiveFilters = 
    searchTerm || 
    filters.status !== 'all' || 
    filters.difficulty !== 'all' ||
    filters.dateRange !== 'all';

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search tasks by title or description..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={localSearch}
            onChange={handleSearchChange}
          />
        </div>
        
        {/* Filter Button */}
        <button
          onClick={() => onFilterChange('showFilters', !filters.showFilters)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
              {[searchTerm, filters.status, filters.difficulty, filters.dateRange].filter(Boolean).length}
            </span>
          )}
        </button>
        
        {/* Reset Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </button>
        )}
      </div>
      
      {/* Filter Panel */}
      {filters.showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-gray-500" />
                  Status
                </div>
              </label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={filters.status}
                onChange={(e) => onFilterChange('status', e.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center">
                  <Tag className="h-4 w-4 mr-1 text-gray-500" />
                  Difficulty
                </div>
              </label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={filters.difficulty}
                onChange={(e) => onFilterChange('difficulty', e.target.value)}
              >
                {DIFFICULTY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Date Range Filter */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                  Due Date
                </div>
              </label>
              <select
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={filters.dateRange}
                onChange={(e) => {
                  onFilterChange('dateRange', e.target.value);
                  if (e.target.value !== 'custom') {
                    setShowDatePicker(false);
                  }
                }}
              >
                {DATE_RANGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              {filters.dateRange === 'custom' && (
                <div className="absolute z-10 mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  <DateRange
                    editableDateInputs={true}
                    onChange={handleDateRangeSelect}
                    moveRangeOnFirstSelection={false}
                    ranges={[{
                      startDate: filters.customDateRange.startDate,
                      endDate: filters.customDateRange.endDate,
                      key: 'selection'
                    }]}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Active Filters */}
          <div className="mt-4 flex flex-wrap gap-2">
            {searchTerm && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: {searchTerm}
                <button
                  type="button"
                  className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-blue-200 hover:bg-blue-300"
                  onClick={() => onSearchChange('')}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            
            {filters.status !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Status: {STATUS_OPTIONS.find(s => s.value === filters.status)?.label}
                <button
                  type="button"
                  className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-purple-200 hover:bg-purple-300"
                  onClick={() => onFilterChange('status', 'all')}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            
            {filters.difficulty !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Difficulty: {DIFFICULTY_OPTIONS.find(d => d.value === filters.difficulty)?.label}
                <button
                  type="button"
                  className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-200 hover:bg-green-300"
                  onClick={() => onFilterChange('difficulty', 'all')}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            
            {filters.dateRange !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {filters.dateRange === 'custom' 
                  ? `Custom: ${format(filters.customDateRange.startDate, 'MMM d, yyyy')} - ${format(filters.customDateRange.endDate, 'MMM d, yyyy')}`
                  : DATE_RANGES.find(d => d.value === filters.dateRange)?.label}
                <button
                  type="button"
                  className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-yellow-200 hover:bg-yellow-300"
                  onClick={() => onFilterChange('dateRange', 'all')}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskFilters;
