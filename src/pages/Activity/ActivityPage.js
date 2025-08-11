import React from 'react';
import { Layout } from 'antd';
import ActivitySummary from '../../components/ActivitySummary/ActivitySummary';
import AppHeader from '../../components/common/AppHeader';
import AppSidebar from '../../components/common/AppSidebar';
import './ActivityPage.css';

const { Content } = Layout;

const ActivityPage = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* <AppSidebar /> */}
      <Layout className="site-layout">
        <AppHeader />
        <Content style={{ margin: '16px' }}>
          <div className="activity-page-container">
            <ActivitySummary />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default ActivityPage;
