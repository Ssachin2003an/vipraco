const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema({
  organization_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true, index: true },
  leave_type: { type: String, required: true }, // Casual Leave | Sick Leave | Earned Leave
  total_allotted: { type: Number, required: true },
  leaves_taken: { type: Number, required: true, default: 0 },
  leaves_pending_approval: { type: Number, required: true, default: 0 },
  last_updated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
