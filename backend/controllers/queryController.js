const { User, LeaveBalance, CompanyPolicy, PayrollData } = require('../models');
const { detectIntent, INTENTS } = require('../utils/nlpEngine');
const { askLLM } = require('../utils/llmClient');

// Helper: format INR
const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

exports.handleQuery = async (req, res) => {
  const { message } = req.body;
  const { user_id, organization_id, first_name } = req.user; // from JWT, never from body

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const { intent, entities } = detectIntent(message);

  try {
    const user = await User.findOne({ user_id, organization_id });
    if (!user) return res.status(404).json({ reply: "I couldn't find your employee record." });

    let reply;

    switch (intent) {
      case INTENTS.GREETING:
        reply = `Hey ${first_name}! I'm ProjectAthena, your HR assistant. Ask me about your leave balance, salary, policies, or profile.`;
        break;

      case INTENTS.EMPLOYEE_ID:
        reply = `Your employee ID is ${user.user_id}.`;
        break;

      case INTENTS.ROLE:
        reply = `Your current role is ${user.role} in the ${user.department} department.`;
        break;

      case INTENTS.MANAGER: {
        if (!user.manager_id) {
          reply = "You don't have a manager assigned (you're at the top of the reporting chain).";
        } else {
          const mgr = await User.findOne({ user_id: user.manager_id, organization_id });
          reply = mgr ? `Your manager is ${mgr.first_name} ${mgr.last_name} (${mgr.role}).` : 'Manager record not found.';
        }
        break;
      }

      case INTENTS.LOOKUP_OTHER_MANAGER: {
        const nameParts = entities.name.split(' ');
        const target = await User.findOne({
          organization_id, // CRITICAL: scoped to caller's own org only
          first_name: { $regex: nameParts[0], $options: 'i' }
        });
        if (!target) {
          reply = `I couldn't find "${entities.name}" in your organization.`;
        } else if (!target.manager_id) {
          reply = `${target.first_name} ${target.last_name} has no manager assigned.`;
        } else {
          const mgr = await User.findOne({ user_id: target.manager_id, organization_id });
          reply = `${target.first_name} ${target.last_name}'s manager is ${mgr.first_name} ${mgr.last_name}.`;
        }
        break;
      }

      case INTENTS.EMAIL:
        reply = `Your official email is ${user.email}.`;
        break;

      case INTENTS.JOIN_DATE:
        reply = `You joined the company on ${user.date_of_joining.toISOString().split('T')[0]}.`;
        break;

      case INTENTS.DEPARTMENT:
        reply = `You're in the ${user.department} department, based in ${user.location}.`;
        break;

      case INTENTS.LEAVE_BALANCE: {
        const where = { user_id, organization_id };
        if (entities.leaveType) where.leave_type = entities.leaveType;
        const balances = await LeaveBalance.find(where);
        if (!balances.length) {
          reply = "I couldn't find any leave records for you.";
        } else {
          reply = balances
            .map((b) => `${b.leave_type}: ${b.total_allotted - b.leaves_taken} of ${b.total_allotted} remaining`)
            .join('\n');
        }
        break;
      }

      case INTENTS.LEAVE_TAKEN: {
        const where = { user_id, organization_id };
        if (entities.leaveType) where.leave_type = entities.leaveType;
        const balances = await LeaveBalance.find(where);
        reply = balances.length
          ? balances.map((b) => `You've taken ${b.leaves_taken} ${b.leave_type}(s).`).join('\n')
          : "No leave records found.";
        break;
      }

      case INTENTS.LEAVE_PENDING: {
        const balances = await LeaveBalance.find({ user_id, organization_id, leaves_pending_approval: { $gt: 0 } });
        reply = balances.length
          ? balances.map((b) => `${b.leaves_pending_approval} ${b.leave_type}(s) pending approval.`).join('\n')
          : 'You have no leaves pending approval.';
        break;
      }

      case INTENTS.POLICY_WFH:
      case INTENTS.POLICY_TRAVEL:
      case INTENTS.POLICY_HOLIDAY:
      case INTENTS.POLICY_SAFETY:
      case INTENTS.POLICY_ATTENDANCE: {
        const categoryKeywordMap = {
          [INTENTS.POLICY_WFH]: 'WFH',
          [INTENTS.POLICY_TRAVEL]: 'travel',
          [INTENTS.POLICY_HOLIDAY]: 'holiday',
          [INTENTS.POLICY_SAFETY]: 'safety',
          [INTENTS.POLICY_ATTENDANCE]: 'attendance'
        };
        const keyword = categoryKeywordMap[intent];
        const policy = await CompanyPolicy.findOne({
          organization_id,
          $or: [
            { keywords: { $regex: keyword, $options: 'i' } },
            { policy_title: { $regex: keyword, $options: 'i' } }
          ]
        });
        reply = policy ? policy.policy_content : `I couldn't find a ${keyword} policy for your organization.`;
        break;
      }

      case INTENTS.ORG_POLICIES_LIST: {
        const policies = await CompanyPolicy.find({ organization_id });
        reply = policies.length
          ? policies.map((p) => `• ${p.policy_title} (${p.policy_category})`).join('\n')
          : 'No policies found for your organization.';
        break;
      }

      case INTENTS.POLICY_GENERAL: {
        const policies = await CompanyPolicy.find({ organization_id }).limit(5);
        reply = policies.length
          ? `Here are some policies I have on file:\n` + policies.map((p) => `• ${p.policy_title}`).join('\n')
          : 'No policies found.';
        break;
      }

      case INTENTS.SALARY_BASE: {
        const payroll = await PayrollData.findOne({ user_id, organization_id });
        reply = payroll ? `Your current base salary is ${inr(payroll.base_salary)}.` : 'No payroll record found.';
        break;
      }

      case INTENTS.SALARY_CTC: {
        const payroll = await PayrollData.findOne({ user_id, organization_id });
        reply = payroll ? `Your CTC (Cost to Company) is ${inr(payroll.ctc)}.` : 'No payroll record found.';
        break;
      }

      case INTENTS.SALARY_PF: {
        const payroll = await PayrollData.findOne({ user_id, organization_id });
        reply = payroll ? `Your PF deduction is ${inr(payroll.pf_deduction)}.` : 'No payroll record found.';
        break;
      }

      case INTENTS.SALARY_HRA: {
        const payroll = await PayrollData.findOne({ user_id, organization_id });
        reply = payroll ? `Your HRA component is ${inr(payroll.HRA)}.` : 'No payroll record found.';
        break;
      }

      case INTENTS.SALARY_TAX: {
        const payroll = await PayrollData.findOne({ user_id, organization_id });
        reply = payroll
          ? `Your professional tax deduction is ${inr(payroll.professional_tax)}.`
          : 'No payroll record found.';
        break;
      }

      case INTENTS.UNKNOWN:
      default: {
        // Optional LLM fallback grounded in the user's own org-scoped data
        const [balances, policies, payroll] = await Promise.all([
          LeaveBalance.find({ user_id, organization_id }),
          CompanyPolicy.find({ organization_id }),
          PayrollData.findOne({ user_id, organization_id })
        ]);
        const llmReply = await askLLM(message, { profile: user.toObject(), balances, policies, payroll });
        reply =
          llmReply ||
          "I'm not sure how to answer that yet. Try asking about your leave balance, salary, manager, or company policies.";
        break;
      }
    }

    res.json({ reply, intent, organization_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error processing query' });
  }
};