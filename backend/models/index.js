const Organization = require('./Organization');
const User = require('./User');
const LeaveBalance = require('./LeaveBalance');
const CompanyPolicy = require('./CompanyPolicy');
const PayrollData = require('./PayrollData');

// No formal joins in Mongo — relationships are resolved in application code
// (e.g. User.manager_id -> User.user_id) via simple find() calls, always
// scoped by organization_id for tenant isolation.

module.exports = {
  Organization,
  User,
  LeaveBalance,
  CompanyPolicy,
  PayrollData
};
