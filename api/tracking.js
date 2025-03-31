const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Get all tracking events
router.get('/events', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_activity')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching tracking events:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get timeline data
router.get('/timeline', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_activity')
      .select('action, sent_at')
      .order('sent_at', { ascending: true });
    
    if (error) throw error;
    
    // Process data to group by date
    const timeline = {};
    
    data.forEach(record => {
      const date = new Date(record.sent_at).toISOString().split('T')[0];
      
      if (!timeline[date]) {
        timeline[date] = { date, sent: 0, opened: 0, clicked: 0 };
      }
      
      if (record.action === 'sent') timeline[date].sent++;
      else if (record.action === 'opened') timeline[date].opened++;
      else if (record.action === 'clicked') timeline[date].clicked++;
    });
    
    res.json(Object.values(timeline));
  } catch (error) {
    console.error('Error fetching timeline data:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stats by day
router.get('/by-day', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_activity')
      .select('day, action');
    
    if (error) throw error;
    
    // Process data to group by day
    const dayStats = {};
    
    data.forEach(record => {
      const day = record.day || 'unknown';
      
      if (!dayStats[day]) {
        dayStats[day] = { day, sent: 0, opens: 0, clicks: 0 };
      }
      
      if (record.action === 'sent') dayStats[day].sent++;
      else if (record.action === 'opened') dayStats[day].opens++;
      else if (record.action === 'clicked') dayStats[day].clicks++;
    });
    
    // Calculate rates
    Object.values(dayStats).forEach(stat => {
      stat.open_rate = stat.sent > 0 ? (stat.opens / stat.sent * 100).toFixed(2) : '0.00';
      stat.click_rate = stat.opens > 0 ? (stat.clicks / stat.opens * 100).toFixed(2) : '0.00';
    });
    
    res.json(Object.values(dayStats));
  } catch (error) {
    console.error('Error fetching stats by day:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;