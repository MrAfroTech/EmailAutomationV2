import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// Component imports
import Dashboard from './components/Dashboard';
import SubscriberList from './components/SubscriberList';
import EmailAnalytics from './components/EmailAnalytics';
import BounceManagement from './components/BounceManagement';
import SendCampaign from './components/SendCampaign';
import Settings from './components/Settings';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Supabase Config:', { url: supabaseUrl, key: supabaseKey ? 'Key exists' : 'Key missing' });


function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [campaignStats, setCampaignStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch initial dashboard data
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Get sent email count
        const { count: sentCount, error: sentError } = await supabase
          .from('email_activity')
          .select('*', { count: 'exact' })
          .eq('action', 'sent');
          
        if (sentError) throw sentError;

        // Get opened email count
        const { count: openCount, error: openError } = await supabase
          .from('email_activity')
          .select('*', { count: 'exact' })
          .eq('action', 'opened');
          
        if (openError) throw openError;

        // Get clicked email count
        const { count: clickCount, error: clickError } = await supabase
          .from('email_activity')
          .select('*', { count: 'exact' })
          .eq('action', 'clicked');
          
        if (clickError) throw clickError;

        // Get bounce count
        const { count: bounceCount, error: bounceError } = await supabase
          .from('email_bounces')
          .select('*', { count: 'exact' });
          
        if (bounceError) throw bounceError;

        // Get subscriber count
        const { count: subscriberCount, error: subError } = await supabase
          .from('EmailCampaignClients')
          .select('*', { count: 'exact' });
          
        if (subError) throw subError;

        // Calculate rates
        const openRate = sentCount > 0 ? ((openCount / sentCount) * 100).toFixed(2) : '0.00';
        const clickRate = openCount > 0 ? ((clickCount / openCount) * 100).toFixed(2) : '0.00';
        const bounceRate = sentCount > 0 ? ((bounceCount / sentCount) * 100).toFixed(2) : '0.00';

        setCampaignStats({
          sentCount,
          openCount,
          clickCount,
          bounceCount,
          subscriberCount,
          openRate,
          clickRate,
          bounceRate,
          lastUpdated: new Date().toLocaleString()
        });
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
    
    // Set up real-time subscription for email_activity table
    const activitySubscription = supabase
      .channel('email_activity_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'email_activity' 
      }, payload => {
        console.log('Real-time update:', payload);
        // Refresh data when changes occur
        fetchDashboardData();
      })
      .subscribe();
      
    // Clean up subscription on unmount
    return () => {
      supabase.removeChannel(activitySubscription);
    };
  }, []);

  if (error) {
    return (
      <div className="error-container">
        <h1>Error</h1>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <nav className="sidebar">
          <div className="sidebar-header">
            <h1>EZDrink</h1>
            <p>Email Campaign Manager</p>
          </div>
          <ul className="sidebar-menu">
            <li>
              <Link to="/" className="sidebar-link">
                <i className="icon dashboard-icon"></i> Dashboard
              </Link>
            </li>
            <li>
              <Link to="/subscribers" className="sidebar-link">
                <i className="icon subscribers-icon"></i> Subscribers
              </Link>
            </li>
            <li>
              <Link to="/analytics" className="sidebar-link">
                <i className="icon analytics-icon"></i> Email Analytics
              </Link>
            </li>
            <li>
              <Link to="/bounces" className="sidebar-link">
                <i className="icon bounces-icon"></i> Bounce Management
              </Link>
            </li>
            <li>
              <Link to="/send" className="sidebar-link">
                <i className="icon send-icon"></i> Send Campaign
              </Link>
            </li>
            <li className="sidebar-divider"></li>
            <li>
              <Link to="/settings" className="sidebar-link">
                <i className="icon settings-icon"></i> Settings
              </Link>
            </li>
          </ul>
          <div className="sidebar-footer">
            <p>© 2025 EZDrink</p>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard isLoading={isLoading} stats={campaignStats} supabase={supabase} />} />
            <Route path="/subscribers" element={<SubscriberList supabase={supabase} />} />
            <Route path="/analytics" element={<EmailAnalytics supabase={supabase} />} />
            <Route path="/bounces" element={<BounceManagement supabase={supabase} />} />
            <Route path="/send" element={<SendCampaign supabase={supabase} />} />
            <Route path="/settings" element={<Settings supabase={supabase} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
