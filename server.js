// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Log environment status
console.log('Environment Check:');
console.log(`- SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Defined' : 'MISSING'}`);
console.log(`- SUPABASE_KEY: ${process.env.SUPABASE_KEY ? 'Defined' : 'MISSING'}`);
console.log(`- PORT: ${PORT}`);
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

// Initialize Supabase client with error handling
let supabase = null;
try {
  if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL is missing in environment variables');
  if (!process.env.SUPABASE_KEY) throw new Error('SUPABASE_KEY is missing in environment variables');
  
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );
  
  console.log('Supabase client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Supabase client:', error.message);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase: supabase ? 'connected' : 'disconnected'
  });
});

// Email tracking endpoints
app.get('/track-open/:id', async (req, res) => {
  try {
    const trackingId = req.params.id;
    console.log(`[TRACK-OPEN] Tracking pixel loaded: ${trackingId}`);
    
    if (supabase) {
      // Record open in email_activity table
      await supabase.from('email_activity').insert({
        action: 'opened',
        email_id: trackingId,
        sent_at: new Date().toISOString()
      });
    }
    
    // Return 1x1 transparent pixel
    res.set('Content-Type', 'image/gif');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  } catch (error) {
    console.error('[TRACK-OPEN] Error:', error);
    // Still return pixel to avoid breaking email
    res.set('Content-Type', 'image/gif');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  }
});

app.get('/track-click/:id', async (req, res) => {
  try {
    const trackingId = req.params.id;
    const redirectUrl = req.query.url || '/';
    console.log(`[TRACK-CLICK] Link clicked: ${trackingId}, redirecting to ${redirectUrl}`);
    
    if (supabase) {
      // Record click in email_activity table
      await supabase.from('email_activity').insert({
        action: 'clicked',
        email_id: trackingId,
        sent_at: new Date().toISOString()
      });
    }
    
    // Redirect to destination URL
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('[TRACK-CLICK] Error:', error);
    // Still redirect to avoid breaking user experience
    res.redirect(req.query.url || '/');
  }
});

// API routes (commented out initially to avoid errors)
// Uncomment these when the corresponding files are properly set up
/*
app.use('/api/subscribers', require('./api/subscribers'));
app.use('/api/campaigns', require('./api/campaigns'));
app.use('/api/bounces', require('./api/bounces'));
app.use('/api/tracking', require('./api/tracking'));
*/

// Serve the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dashboard/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard/build', 'index.html'));
  });
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at: http://localhost:${PORT}/api`);
  console.log(`Dashboard UI (in development): http://localhost:3000`);
});