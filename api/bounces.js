const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Get all bounces
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_bounces')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching bounces:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a bounce record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('email_bounces')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting bounce:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get bounce statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total bounce count
    const { count: totalBounces, error: countError } = await supabase
      .from('email_bounces')
      .select('*', { count: 'exact' });
    
    if (countError) throw countError;
    
    // Get sent count
    const { count: totalSent, error: sentError } = await supabase
      .from('email_activity')
      .select('*', { count: 'exact' })
      .eq('action', 'sent');
    
    if (sentError) throw sentError;
    
    // Get bounce types
    const { data: bounceData, error: typeError } = await supabase
      .from('email_bounces')
      .select('bounce_type');
    
    if (typeError) throw typeError;
    
    // Calculate types
    const bounceTypes = {
      hard: 0,
      soft: 0,
      other: 0
    };
    
    if (bounceData) {
      bounceData.forEach(bounce => {
        if (bounce.bounce_type === 'hard') bounceTypes.hard++;
        else if (bounce.bounce_type === 'soft') bounceTypes.soft++;
        else bounceTypes.other++;
      });
    }
    
    // Calculate bounce rate
    const bounceRate = totalSent > 0 ? (totalBounces / totalSent * 100).toFixed(2) : '0.00';
    
    res.json({
      total_bounces: totalBounces,
      bounce_rate: parseFloat(bounceRate),
      bounce_types: bounceTypes
    });
  } catch (error) {
    console.error('Error fetching bounce stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;