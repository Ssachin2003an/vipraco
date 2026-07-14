const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  organization_id: { type: String, required: true, unique: true }, // e.g. TECHCORP_IN
  org_name: { type: String, required: true },
  subscription_plan: { type: String }, // 'Enterprise' | 'Standard' | 'Basic'
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Organization', organizationSchema);
