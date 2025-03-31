const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Configure email transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: true
});

// Get campaign statistics
router.get('/stats', async (req, res) => {
  try {
    // Get email sent count
    const { count: sentCount, error: sentError } = await supabase
      .from('email_activity')
      .select('email', { count: 'exact' })
      .eq('action', 'sent');
    
    if (sentError) throw sentError;

    // Get email opens count
    const { count: openCount, error: openError } = await supabase
      .from('email_activity')
      .select('email', { count: 'exact' })
      .eq('action', 'opened');
    
    if (openError) throw openError;

    // Get email clicks count
    const { count: clickCount, error: clickError } = await supabase
      .from('email_activity')
      .select('email', { count: 'exact' })
      .eq('action', 'clicked');
    
    if (clickError) throw clickError;

    // Get bounces count
    const { count: bounceCount, error: bounceError } = await supabase
      .from('email_bounces')
      .select('id', { count: 'exact' });
    
    if (bounceError) throw bounceError;

    // Get total subscriber count
    const { count: subscriberCount, error: subError } = await supabase
      .from('EmailCampaignClients')
      .select('*', { count: 'exact' });
    
    if (subError) throw subError;

    // Calculate rates
    const openRate = sentCount > 0 ? (openCount / sentCount * 100).toFixed(2) : '0.00';
    const clickRate = openCount > 0 ? (clickCount / openCount * 100).toFixed(2) : '0.00';
    const bounceRate = sentCount > 0 ? (bounceCount / sentCount * 100).toFixed(2) : '0.00';

    res.json({
      total_sent: sentCount,
      total_opens: openCount,
      total_clicks: clickCount,
      total_bounces: bounceCount,
      total_subscribers: subscriberCount,
      open_rate: parseFloat(openRate),
      click_rate: parseFloat(clickRate),
      bounce_rate: parseFloat(bounceRate)
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Run a campaign to send emails
router.post('/run', async (req, res) => {
  try {
    const { day = 1, batchSize = 50 } = req.body;
    
    // Logic to find eligible subscribers
    let query = supabase
      .from('EmailCampaignClients')
      .select('*')
      .eq('status', 'active');
    
    if (day === 1) {
      // Day 1: Find subscribers who haven't received any emails
      query = query.is('last_email_sent', null);
    } else {
      // Other days: Find subscribers on the previous day
      query = query.eq('current_day', day - 1);
    }
    
    // Limit to batch size
    query = query.limit(batchSize);
    
    const { data: subscribers, error } = await query;
    
    if (error) throw error;
    
    if (!subscribers || subscribers.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No eligible subscribers found', 
        count: 0 
      });
    }
    
    // Template names by day
    const templates = {
      1: 'cash-finder.html',
      2: 'cash-finder-plus.html',
      3: 'risk-reduction.html',
      4: 'customer-loyalty.html',
      5: 'operational-efficiency.html',
      6: 'crew-cash-finder.html',
      7: 'bar-never-sleeps.html',
      8: 'final-call-to-action.html'
    };
    
    // Email subjects by day
    const subjects = {
      1: "Unlock $21K+ in Profits in 30 Seconds",
      2: "The Cash Finder Report that's shocking bar owners...",
      3: "Your bar is leaking $7,400/month (here's how to plug it)",
      4: "This loyalty trick brings 34% more repeat customers",
      5: "Bar owners who work 65+ hours: Read immediately",
      6: "How your bartenders can generate an extra $657K yearly",
      7: "Your bar makes money while you sleep (here's how)",
      8: "LAST DAY: Your EZDrink discount vanishes at midnight"
    };
    
    // Read template
    const templatePath = path.join(__dirname, '..', 'templates', templates[day]);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ 
        success: false, 
        error: `Template for day ${day} not found` 
      });
    }
    
    const template = fs.readFileSync(templatePath, 'utf8');
    
    // Results tracking
    const results = {
      total: subscribers.length,
      sent: 0,
      failed: 0,
      bounced: 0
    };
    
    // Send emails
    for (const subscriber of subscribers) {
      try {
        // Create email content
        let emailContent = template
          .replace(/{{email}}/g, subscriber.email)
          .replace(/{{first_name}}/g, subscriber.first_name || 'there')
          .replace(/{{bar_name}}/g, subscriber.bar_name || 'your bar')
          .replace(/{{base_url}}/g, process.env.BASE_URL)
          .replace(/{{unsubscribe_url}}/g, `${process.env.BASE_URL}/unsubscribe?email=${subscriber.email}&token=${subscriber.email}`);
        
        // Generate tracking ID
        const trackingId = `track-${subscriber.id}-${day}-${Date.now()}`;
        
        // Add tracking pixel
        const trackingPixel = `<img src="${process.env.BASE_URL}/track-open/${trackingId}" width="1" height="1" alt="" style="display:none;">`;
        emailContent = emailContent.replace('</body>', `${trackingPixel}</body>`);
        
        // Replace links with tracking links
        const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi;
        emailContent = emailContent.replace(linkRegex, (match, url, text) => {
          if (url.includes('/unsubscribe') || url.includes('/privacy')) {
            return match;
          }
          const trackingUrl = `${process.env.BASE_URL}/track-click/${trackingId}?url=${encodeURIComponent(url)}`;
          return `<a href="${trackingUrl}">${text}</a>`;
        });
        
        // Send email
        await transporter.sendMail({
          from: `"EZDrink" <${process.env.EMAIL_FROM}>`,
          to: subscriber.email,
          subject: subjects[day],
          html: emailContent
        });
        
        // Record email activity
        await supabase.from('email_activity').insert({
          subscriber_id: subscriber.id,
          email: subscriber.email,
          day: day,
          action: 'sent',
          email_id: trackingId,
          sent_at: new Date().toISOString()
        });
        
        // Update subscriber
        await supabase
          .from('EmailCampaignClients')
          .update({
            current_day: day,
            last_email_sent: new Date().toISOString()
          })
          .eq('id', subscriber.id);
        
        results.sent++;
      } catch (error) {
        console.error(`Error sending to ${subscriber.email}:`, error);
        
        // Check if it's a bounce
        if (error.message.includes('bounce') || 
            error.message.includes('rejected') ||
            error.message.includes('invalid')) {
          
          // Record bounce
          await supabase.from('email_bounces').insert({
            email: subscriber.email,
            bounce_type: 'hard',
            bounce_reason: error.message.substring(0, 255),
            timestamp: new Date().toISOString()
          });
          
          // Update subscriber status
          await supabase
            .from('EmailCampaignClients')
            .update({ status: 'bounced' })
            .eq('id', subscriber.id);
          
          results.bounced++;
        }
        
        results.failed++;
      }
    }
    
    res.json({
      success: true,
      message: `Campaign ${day} sent successfully`,
      results
    });
  } catch (error) {
    console.error('Error running campaign:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;