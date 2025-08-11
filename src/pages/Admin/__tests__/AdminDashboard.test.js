import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from '../AdminDashboard';
import '@testing-library/jest-dom';

// Mock the API call
jest.mock('../../utils/api', () => ({
  get: jest.fn(() => Promise.resolve({
    data: {
      usersCount: 10,
      activeUsers: 5,
      activeTasks: 3,
      pendingReports: 2,
      upcomingSessions: 1,
      analytics: {
        userActivity: [
          { _id: '1', name: 'User 1', isActive: true },
          { _id: '2', name: 'User 2', isActive: false },
        ],
        taskCompletion: [
          { _id: '1', title: 'Task 1', totalSubmissions: 10, completedSubmissions: 8 },
          { _id: '2', title: 'Task 2', totalSubmissions: 15, completedSubmissions: 5 },
        ],
        submissionTrends: [
          { date: '2023-01-01', count: 5 },
          { date: '2023-01-02', count: 8 },
        ],
        userGrowth: 10,
        activeUserGrowth: 5,
        taskCompletionRate: 75,
        pendingReportsChange: -2,
      },
      recentSubmissions: [
        { _id: '1', questionNumber: 1, questionTitle: 'Two Sum', language: 'JavaScript', user: { name: 'User 1' }, createdAt: new Date() },
      ],
      recentReports: [
        { _id: '1', session: { collegeName: 'Test College' }, user: { name: 'User 1' }, createdAt: new Date() },
      ],
    },
  })),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      {children}
    </BrowserRouter>
  </QueryClientProvider>
);

describe('AdminDashboard', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(<AdminDashboard />, { wrapper });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('displays dashboard stats after loading', async () => {
    render(<AdminDashboard />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Active Tasks')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Pending Reports')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('displays analytics charts', async () => {
    render(<AdminDashboard />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('Task Completion')).toBeInTheDocument();
      expect(screen.getByText('Submission Trends')).toBeInTheDocument();
      expect(screen.getByText('User Activity')).toBeInTheDocument();
    });
  });

  it('displays recent activity', async () => {
    render(<AdminDashboard />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('Recent Submissions')).toBeInTheDocument();
      expect(screen.getByText('Two Sum')).toBeInTheDocument();
      expect(screen.getByText('Recent Training Reports')).toBeInTheDocument();
      expect(screen.getByText('Test College')).toBeInTheDocument();
    });
  });

  it('handles date range change', async () => {
    render(<AdminDashboard />, { wrapper });
    
    await waitFor(() => {
      const select = screen.getByLabelText('Date Range:');
      expect(select).toBeInTheDocument();
      // Note: Testing the actual change would require mocking the API response
      // for the new date range, which is more complex
    });
  });
});
