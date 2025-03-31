import React, { useState, useEffect } from 'react';

const SubscriberList = ({ supabase }) => {
  const [subscribers, setSubscribers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubscribers = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('EmailCampaignClients')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSubscribers(data || []);
      } catch (error) {
        console.error('Error fetching subscribers:', error);
        setError('Failed to load subscribers. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscribers();
  }, [supabase]);

  if (isLoading) return <div>Loading subscribers...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="subscriber-list-container">
      <h1>Subscribers</h1>
      <div className="subscriber-table-container">
        {subscribers.length === 0 ? (
          <p>No subscribers yet.</p>
        ) : (
          <table className="subscriber-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Joined</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((subscriber) => (
                <tr key={subscriber.id}>
                  <td>{subscriber.email}</td>
                  <td>{subscriber.name || 'N/A'}</td>
                  <td>{new Date(subscriber.created_at).toLocaleDateString()}</td>
                  <td>{subscriber.status || 'Active'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SubscriberList;