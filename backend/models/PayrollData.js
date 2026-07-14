const mongoose = require('mongoose');

const payrollDataSchema = new mongoose.Schema({
  organization_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true, index: true },
  base_salary: { type: Number, required: true },
  HRA: { type: Number },
  conveyance_allowance: { type: Number },
  medical_allowance: { type: Number },
  pf_deduction: { type: Number },
  esi_deduction: { type: Number },
  professional_tax: { type: Number },
  ctc: { type: Number, required: true }
});

module.exports = mongoose.model('PayrollData', payrollDataSchema);
