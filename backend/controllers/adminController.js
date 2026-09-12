const { Organization, User, LeaveBalance, CompanyPolicy, PayrollData } = require('../models');

// Everything below is scoped to req.user.organization_id (from JWT) —
// same tenant-isolation rule as queryController.js. Admin sees all
// records for their own org, never other orgs.
exports.getOverview = async (req, res) => {
    const { organization_id } = req.user;

    try {
        const [users, leaveBalances, policies, payroll] = await Promise.all([
        User.find({ organization_id }).select('-password_hash').sort({ role: 1, first_name: 1 }),
        LeaveBalance.find({ organization_id }),
        CompanyPolicy.find({ organization_id }),
        PayrollData.find({ organization_id })
        ]);

        res.json({
        organization_id,
        fetched_at: new Date().toISOString(),
        counts: {
            users: users.length,
            leaveBalances: leaveBalances.length,
            policies: policies.length,
            payroll: payroll.length
        },
        users,
        leaveBalances,
        policies,
        payroll
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching admin overview' });
    }
};

// SuperAdmin only — no organization_id filter. Deliberate exception to
// tenant isolation, gated by requireSuperAdmin middleware in routes/admin.js.
exports.getSuperOverview = async (req, res) => {
    try {
        const [orgs, users, leaveBalances, policies, payroll] = await Promise.all([
        Organization.find({}),
        User.find({}).select('-password_hash').sort({ organization_id: 1, role: 1, first_name: 1 }),
        LeaveBalance.find({}),
        CompanyPolicy.find({}),
        PayrollData.find({})
        ]);

        res.json({
        fetched_at: new Date().toISOString(),
        counts: {
            organizations: orgs.length,
            users: users.length,
            leaveBalances: leaveBalances.length,
            policies: policies.length,
            payroll: payroll.length
        },
        organizations: orgs,
        users,
        leaveBalances,
        policies,
        payroll
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching super admin overview' });
    }
};