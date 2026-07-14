/**
 * VipraCo NLP Engine
 * Lightweight, dependency-free intent recognition using keyword/regex matching.
 * Designed to be swapped for a real LLM call later (see llmClient.js) without
 * changing the controller contract: detectIntent(text) -> { intent, entities }
 */

const INTENTS = {
  EMPLOYEE_ID: 'EMPLOYEE_ID',
  ROLE: 'ROLE',
  MANAGER: 'MANAGER',
  EMAIL: 'EMAIL',
  JOIN_DATE: 'JOIN_DATE',
  DEPARTMENT: 'DEPARTMENT',
  LEAVE_BALANCE: 'LEAVE_BALANCE',
  LEAVE_TAKEN: 'LEAVE_TAKEN',
  LEAVE_PENDING: 'LEAVE_PENDING',
  POLICY_WFH: 'POLICY_WFH',
  POLICY_TRAVEL: 'POLICY_TRAVEL',
  POLICY_HOLIDAY: 'POLICY_HOLIDAY',
  POLICY_SAFETY: 'POLICY_SAFETY',
  POLICY_ATTENDANCE: 'POLICY_ATTENDANCE',
  POLICY_GENERAL: 'POLICY_GENERAL',
  SALARY_BASE: 'SALARY_BASE',
  SALARY_CTC: 'SALARY_CTC',
  SALARY_PF: 'SALARY_PF',
  SALARY_HRA: 'SALARY_HRA',
  SALARY_TAX: 'SALARY_TAX',
  LOOKUP_OTHER_MANAGER: 'LOOKUP_OTHER_MANAGER',
  ORG_POLICIES_LIST: 'ORG_POLICIES_LIST',
  GREETING: 'GREETING',
  UNKNOWN: 'UNKNOWN'
};

const LEAVE_TYPE_MAP = {
  casual: 'Casual Leave',
  sick: 'Sick Leave',
  earned: 'Earned Leave'
};

function detectLeaveType(text) {
  for (const key of Object.keys(LEAVE_TYPE_MAP)) {
    if (text.includes(key)) return LEAVE_TYPE_MAP[key];
  }
  return null;
}

function detectIntent(rawText) {
  const text = rawText.toLowerCase().trim();

  // Greeting
  if (/^(hi|hello|hey|good morning|good afternoon)\b/.test(text)) {
    return { intent: INTENTS.GREETING, entities: {} };
  }

  // Personal info & profile
  if (/employee id/.test(text)) return { intent: INTENTS.EMPLOYEE_ID, entities: {} };
  if (/(role|designation)/.test(text) && !/manager'?s? role/.test(text)) {
    return { intent: INTENTS.ROLE, entities: {} };
  }
  if (/who is my manager|manager'?s name/.test(text)) {
    return { intent: INTENTS.MANAGER, entities: {} };
  }
  // "Who is X's manager?" — cross-employee lookup within same org
  const otherManagerMatch = rawText.match(/who is ([a-zA-Z]+ ?[a-zA-Z]*)'s manager/i);
  if (otherManagerMatch) {
    return { intent: INTENTS.LOOKUP_OTHER_MANAGER, entities: { name: otherManagerMatch[1].trim() } };
  }
  if (/(official )?email address|what is my email/.test(text)) {
    return { intent: INTENTS.EMAIL, entities: {} };
  }
  if (/join(ed)? the company|date of joining|when did i join/.test(text)) {
    return { intent: INTENTS.JOIN_DATE, entities: {} };
  }
  if (/which department|what department/.test(text)) {
    return { intent: INTENTS.DEPARTMENT, entities: {} };
  }

  // Leave management
  if (/(pending approval|leaves pending)/.test(text)) {
    return { intent: INTENTS.LEAVE_PENDING, entities: { leaveType: detectLeaveType(text) } };
  }
  if (/(taken|used).*(leave|sick)/.test(text)) {
    return { intent: INTENTS.LEAVE_TAKEN, entities: { leaveType: detectLeaveType(text) } };
  }
  if (/(leave|leaves|balance).*(left|remaining|balance)|how many .*leave/.test(text)) {
    return { intent: INTENTS.LEAVE_BALANCE, entities: { leaveType: detectLeaveType(text) } };
  }

  // Company policies
  if (/work.?from.?home|wfh/.test(text)) return { intent: INTENTS.POLICY_WFH, entities: {} };
  if (/travel|expense|reimbursement/.test(text)) return { intent: INTENTS.POLICY_TRAVEL, entities: {} };
  if (/holiday|vacation|festival/.test(text)) return { intent: INTENTS.POLICY_HOLIDAY, entities: {} };
  if (/safety|hazard|ppe/.test(text)) return { intent: INTENTS.POLICY_SAFETY, entities: {} };
  if (/attendance|punctuality|clock.?in|biometric/.test(text)) {
    return { intent: INTENTS.POLICY_ATTENDANCE, entities: {} };
  }
  if (/(all|list|current).*polic(y|ies)/.test(text)) {
    return { intent: INTENTS.ORG_POLICIES_LIST, entities: {} };
  }
  if (/polic(y|ies)/.test(text)) return { intent: INTENTS.POLICY_GENERAL, entities: {} };

  // Payroll & compensation
  if (/base salary/.test(text)) return { intent: INTENTS.SALARY_BASE, entities: {} };
  if (/\bctc\b|cost to company/.test(text)) return { intent: INTENTS.SALARY_CTC, entities: {} };
  if (/pf deduction|provident fund/.test(text)) return { intent: INTENTS.SALARY_PF, entities: {} };
  if (/\bhra\b|house rent/.test(text)) return { intent: INTENTS.SALARY_HRA, entities: {} };
  if (/professional tax|tax deducted/.test(text)) return { intent: INTENTS.SALARY_TAX, entities: {} };

  return { intent: INTENTS.UNKNOWN, entities: {} };
}

module.exports = { detectIntent, INTENTS };
