const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Get all subscribers
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('EmailCampaignClients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a subscriber
router.post('/', async (req, res) => {
  try {
    const { email, first_name, bar_name, status = 'active' } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const { data, error } = await supabase
      .from('EmailCampaignClients')
      .insert({
        email: email.toLowerCase(),
        first_name,
        bar_name,
        status,
        created_at: new Date().toISOString()
      })
      .select();
    
    if (error) throw error;
    
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error adding subscriber:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a subscriber
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, first_name, bar_name, status } = req.body;
    
    const { data, error } = await supabase
      .from('EmailCampaignClients')
      .update({
        email: email ? email.toLowerCase() : undefined,
        first_name,
        bar_name,
        status
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    if (data.length === 0) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating subscriber:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a subscriber
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('EmailCampaignClients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting subscriber:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;