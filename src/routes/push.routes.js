const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// Setup web-push safely
const isVapidConfigured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

if (isVapidConfigured) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:socasob@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    console.log('[Web Push] VAPID details successfully configured.');
  } catch (err) {
    console.warn('[Web Push] Warning initializing VAPID details:', err.message);
  }
} else {
  console.warn('[Web Push] VAPID keys not provided. Push notification features will be disabled.');
}

// Subscribe endpoint
router.post('/subscribe', async (req, res, next) => {
  try {
    const { robotId, subscription } = req.body;
    if (!robotId || !subscription) {
      return res.status(400).json({ success: false, error: 'robotId dan subscription wajib diisi' });
    }

    // Save or update subscription for this robotId
    // We can allow multiple subscriptions per robotId (e.g. phone + desktop), 
    // so let's match by endpoint to avoid duplicates
    await PushSubscription.findOneAndUpdate(
      { robotId, 'subscription.endpoint': subscription.endpoint },
      { robotId, subscription },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, message: 'Subscription berhasil disimpan' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    next(error);
  }
});

// Broadcast / trigger endpoint (for testing or manual trigger)
router.post('/send', async (req, res, next) => {
  try {
    const { robotId, payload } = req.body;
    let query = {};
    if (robotId) query.robotId = robotId;

    const subscriptions = await PushSubscription.find(query);

    const promises = subscriptions.map(sub => {
      return webpush.sendNotification(sub.subscription, JSON.stringify(payload)).catch(err => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log('Subscription has expired or is no longer valid: ', err);
          return PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error('Push error: ', err);
        }
      });
    });

    await Promise.all(promises);

    res.status(200).json({ success: true, message: `Push notifikasi dikirim ke ${subscriptions.length} perangkat` });
  } catch (error) {
    console.error('Error sending push:', error);
    next(error);
  }
});


// Delayed test endpoint
router.post('/test-delay', async (req, res, next) => {
  try {
    const { robotId, delayMs = 5000 } = req.body;
    if (!robotId) return res.status(400).json({ success: false, error: 'robotId wajib diisi' });

    // Respond immediately
    res.status(200).json({ success: true, message: `Notifikasi akan dikirim dalam ${delayMs / 1000} detik` });

    let remaining = delayMs / 1000;
    console.log(`[Push Test] Memulai countdown ${remaining} detik untuk robotId: ${robotId}...`);
    
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        console.log(`[Push Test] ${remaining}...`);
      }
    }, 1000);

    // Wait and send
    setTimeout(async () => {
      clearInterval(interval);
      console.log(`[Push Test] 🚀 BOOM! Mengirim notifikasi sekarang ke Web Push Server...`);
      try {
        const subscriptions = await PushSubscription.find({ robotId });
        if (subscriptions.length === 0) {
          console.log(`[Push Test] ❌ Tidak ada subscription tersimpan untuk ${robotId}!`);
          return;
        }

        const payload = JSON.stringify({
          title: '⏳ Tes Delay SocaSob',
          body: 'Notifikasi ini dikirim setelah delay. Anda sedang di window lain!',
          icon: '/images/logo-socasob.png',
          url: '/'
        });

        const promises = subscriptions.map(sub => {
          return webpush.sendNotification(sub.subscription, payload).catch(err => {
            if (err.statusCode === 404 || err.statusCode === 410) {
              console.log(`[Push Test] ❌ Subscription expired (404/410), menghapus dari database...`);
              return PushSubscription.deleteOne({ _id: sub._id });
            }
            console.error(`[Push Test] ❌ Error saat mengirim:`, err);
          });
        });
        await Promise.all(promises);
        console.log(`[Push Test] ✅ Sukses mengirim ke ${subscriptions.length} perangkat terdaftar!`);
      } catch (err) {
        console.error('[Push Test] Delayed push error:', err);
      }
    }, delayMs);

  } catch (error) {
    next(error);
  }
});

module.exports = router;
