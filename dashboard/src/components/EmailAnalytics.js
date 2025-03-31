import React, { useState, useEffect } from 'react';

const EmailAnalytics = ({ supabase }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setIsLoading(true);
        
        // Just fetch basic campaign data first
        const { data: campaignData, error: campaignError } = await supabase
          .from('email_campaigns')
          .select('id, campaign_name, sent_date, status')
          .order('sent_date', { ascending: false });

        if (campaignError) throw campaignError;
        
        setCampaigns(campaignData || []);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        setError('Failed to load email analytics. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaigns();
  }, [supabase]);

  if (isLoading) return <div>Loading analytics data...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="analytics-container">
      <h1>Email Analytics</h1>
      
      {campaigns.length === 0 ? (
        <div className="no-data-message">
          <p>No campaign data available yet.</p>
          <p>Once you send your first campaign, analytics will appear here.</p>
          <div className="info-box">
            <h3>Getting Started</h3>
            <p>To create your first campaign:</p>
            <ol>
              <li>Go to the <strong>Send Campaign</strong> section</li>
              <li>Create a new campaign with a subject and content</li>
              <li>Select your recipients</li>
              <li>Send the campaign</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="analytics-content">
          <div className="campaigns-table-container">
            <h2>Campaign Performance</h2>
            <table className="campaigns-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Sent Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>{campaign.campaign_name}</td>
                    <td>{campaign.sent_date ? new Date(campaign.sent_date).toLocaleDateString() : 'Not sent'}</td>
                    <td>{campaign.status}</td>
                    <td>
                      <button 
                        className="view-details-button"
                        onClick={() => alert('Detailed analytics coming soon!')}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="analytics-summary">
            <h2>Analytics Coming Soon</h2>
            <p>
              Detailed performance metrics including open rates, click rates, 
              and conversion tracking will be available once campaigns are sent
              and data is collected.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailAnalytics;