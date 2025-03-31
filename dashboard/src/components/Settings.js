import React, { useState, useEffect } from 'react';

const SendCampaign = ({ supabase }) => {
  const [formData, setFormData] = useState({
    campaignName: '',
    subject: '',
    content: '',
    senderName: '',
    senderEmail: '',
    recipientList: 'all', // 'all' or 'segment'
    segment: ''
  });
  
  const [subscribers, setSubscribers] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubscribers = async () => {
      try {
        const { data, error } = await supabase
          .from('EmailCampaignClients')
          .select('id, email, name, status')
          .eq('status', 'active');

        if (error) throw error;
        setSubscribers(data || []);
      } catch (error) {
        console.error('Error fetching subscribers:', error);
        setError('Failed to load subscribers. Please try again.');
      }
    };

    fetchSubscribers();
  }, [supabase]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSending(true);
      setError(null);
      
      // Validate form
      if (!formData.campaignName || !formData.subject || !formData.content || !formData.senderEmail) {
        throw new Error('Please fill in all required fields');
      }
      
      // Create campaign record
      const { data: campaignData, error: campaignError } = await supabase
        .from('email_campaigns')
        .insert([
          {
            campaign_name: formData.campaignName,
            subject: formData.subject,
            content: formData.content,
            sender_name: formData.senderName,
            sender_email: formData.senderEmail,
            status: 'scheduled',
            sent_date: new Date().toISOString()
          }
        ])
        .select();
      
      if (campaignError) throw campaignError;
      
      // In a real app, this would trigger an email sending service
      // Here we'll just simulate it with a success message
      
      setSuccessMessage('Campaign scheduled successfully! Emails will be sent shortly.');
      setFormData({
        campaignName: '',
        subject: '',
        content: '',
        senderName: '',
        senderEmail: '',
        recipientList: 'all',
        segment: ''
      });
      
    } catch (error) {
      console.error('Error sending campaign:', error);
      setError(error.message || 'Failed to send campaign. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="send-campaign-container">
      <h1>Send Email Campaign</h1>
      
      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="campaign-form">
        <div className="form-group">
          <label htmlFor="campaignName">Campaign Name</label>
          <input
            type="text"
            id="campaignName"
            name="campaignName"
            value={formData.campaignName}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="subject">Email Subject</label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="content">Email Content</label>
          <textarea
            id="content"
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows="10"
            required
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="senderName">Sender Name</label>
            <input
              type="text"
              id="senderName"
              name="senderName"
              value={formData.senderName}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="senderEmail">Sender Email</label>
            <input
              type="email"
              id="senderEmail"
              name="senderEmail"
              value={formData.senderEmail}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Recipients</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="recipientList"
                value="all"
                checked={formData.recipientList === 'all'}
                onChange={handleChange}
              />
              All Subscribers ({subscribers.length})
            </label>
            
            <label>
              <input
                type="radio"
                name="recipientList"
                value="segment"
                checked={formData.recipientList === 'segment'}
                onChange={handleChange}
              />
              Segment
            </label>
          </div>
          
          {formData.recipientList === 'segment' && (
            <select
              name="segment"
              value={formData.segment}
              onChange={handleChange}
              required={formData.recipientList === 'segment'}
            >
              <option value="">Select a segment</option>
              <option value="new">New subscribers (last 30 days)</option>
              <option value="engaged">Engaged (opened last campaign)</option>
              <option value="inactive">Inactive (no opens in 90 days)</option>
            </select>
          )}
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="primary-button"
            disabled={isSending}
          >
            {isSending ? 'Sending...' : 'Send Campaign'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SendCampaign;