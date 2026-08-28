const mongoose = require('mongoose');

const PushSubscriptionSchema = new mongoose.Schema({
  robotId: {
    type: String,
    required: true,
    index: true
  },
  subscription: {
    type: Object,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PushSubscription', PushSubscriptionSchema);
