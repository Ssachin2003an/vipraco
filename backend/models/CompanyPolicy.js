const mongoose = require('mongoose');

const companyPolicySchema = new mongoose.Schema({
  organization_id: { type: String, required: true, index: true },
  policy_title: { type: String, required: true },
  policy_category: { type: String }, // Leave | Expense | IT | HR General | Safety | Calendar
  policy_content: { type: String, required: true },
  last_reviewed: { type: Date },
  keywords: { type: String } // comma-separated, used for simple text matching
});

module.exports = mongoose.model('CompanyPolicy', companyPolicySchema);
