import React, { useState } from 'react';
import {
  Tabs,
  Card,
  Typography,
  Alert,
  Button,
  Empty
} from 'antd';
import {
  BarChartOutlined,
  SettingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import './ActivitySummary.css';

const { Title } = Typography;

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error in ActivitySummary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          message="Something went wrong"
          description={this.state.error?.message || 'An unexpected error occurred'}
          type="error"
          showIcon
        />
      );
    }

    return this.props.children;
  }
}

const ActivitySummary = () => {
  const [activeTab, setActiveTab] = useState('weekly');

  const renderNotImplemented = () => {
    return (
      <div className="not-implemented-container">
        <Card className="not-implemented-card">
          <div className="not-implemented-content">
            <BarChartOutlined className="not-implemented-icon" />
            <Title level={3} className="not-implemented-title">
              Activity Summary
            </Title>
            <p className="not-implemented-description">
              The activity summary feature is not yet implemented. This section will display:
            </p>
            <ul className="not-implemented-features">
              <li>Training session statistics</li>
              <li>User activity metrics</li>
              <li>Task completion rates</li>
              <li>Performance analytics</li>
              <li>Export functionality</li>
            </ul>
            <Alert
              message="Backend Implementation Required"
              description="Activity tracking endpoints need to be implemented on the backend to display real data."
              type="info"
              icon={<InfoCircleOutlined />}
              showIcon
              className="not-implemented-alert"
            />
          </div>
        </Card>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div className="activity-summary">
        <div className="page-header">
          <div className="page-title-section">
            <Title level={2} className="page-title">
              Activity Summary
            </Title>
          </div>
          <Button type="primary" icon={<SettingOutlined />} disabled>
            Configure Analytics
          </Button>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="summary-tabs"
          items={[
            {
              key: 'weekly',
              label: 'Weekly Summary',
              children: renderNotImplemented()
            },
            {
              key: 'monthly',
              label: 'Monthly Summary',
              children: renderNotImplemented()
            }
          ]}
        />
      </div>
    </ErrorBoundary>
  );
};

export default ActivitySummary;
