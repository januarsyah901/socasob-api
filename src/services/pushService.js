const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

const lastPushTimes = new Map();
const THROTTLE_MS = 60000; // 1 minute throttle for push per robot per type

const sendPushToRobot = async (robotId, title, body, tag, type = 'alert') => {
  const now = Date.now();
  const throttleKey = `${robotId}_${type}`;
  
  if (lastPushTimes.has(throttleKey)) {
    if (now - lastPushTimes.get(throttleKey) < THROTTLE_MS) {
      return; // Throttled
    }
  }
  
  lastPushTimes.set(throttleKey, now);

  try {
    const subscriptions = await PushSubscription.find({ robotId });
    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({
      title,
      body,
      tag,
      icon: '/images/logo-socasob.png'
    });

    const promises = subscriptions.map(sub => {
      return webpush.sendNotification(sub.subscription, payload).catch(err => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          return PushSubscription.deleteOne({ _id: sub._id });
        }
      });
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Push Notification Error:', error);
  }
};

module.exports = {
  sendPushToRobot
};
