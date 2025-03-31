import React, { useState, useEffect } from 'react';

const BounceManagement = ({ supabase }) => {
  const [bounces, setBounces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBounces = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('email_bounces')
          .select('*, EmailCampaignClients(email, name)')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBounces(data || []);
      } catch (error) {
        console.error('Error fetching bounces:', error);
        setError('Failed to load bounce data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBounces();
  }, [supabase]);

  const handleRemoveSubscriber = async (id) => {
    try {
      const { error } = await supabase
        .from('EmailCampaignClients')
        .update({ status: 'unsubscribed' })
        .eq('id', id);

      if (error) throw error;
      
      // Refresh bounce list
      const { data, error: bounceError } = await supabase
        .from('email_bounces')
        .select('*, EmailCampaignClients(email, name)')
        .order('created_at', { ascending: false });
      
      if (bounceError) throw bounceError;
      setBounces(data || []);
      
    } catch (error) {
      console.error('Error updating subscriber status:', error);
      setError('Failed to update subscriber. Please try again.');
    }
  };

  if (isLoading) return <div>Loading bounce data...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="bounce-management-container">
      <h1>Bounce Management</h1>
      
      {bounces.length === 0 ? (
        <p>No bounces recorded.</p>
      ) : (
        <div className="bounce-table-container">
          <table className="bounce-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Bounce Type</th>
                <th>Reason</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bounces.map((bounce) => (
                <tr key={bounce.id}>
                  <td>{bounce.EmailCampaignClients?.email || 'Unknown'}</td>
                  <td>{bounce.bounce_type || 'Unknown'}</td>
                  <td>{bounce.reason || 'Not specified'}</td>
                  <td>{new Date(bounce.created_at).toLocaleDateString()}</td>
                  <td>
                    <button 
                      className="action-button"
                      onClick={() => handleRemoveSubscriber(bounce.subscriber_id)}
                    >
                      Remove from list
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BounceManagement;