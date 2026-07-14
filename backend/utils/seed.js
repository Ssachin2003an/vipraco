require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Organization, User, LeaveBalance, CompanyPolicy, PayrollData } = require('../models');

async function seed() {
  await connectDB();

  await Promise.all([
    Organization.deleteMany({}),
    User.deleteMany({}),
    LeaveBalance.deleteMany({}),
    CompanyPolicy.deleteMany({}),
    PayrollData.deleteMany({})
  ]);
  console.log('Collections cleared.');

  const demoPasswordHash = await bcrypt.hash('password123', 10);

  await Organization.insertMany([
    { organization_id: 'TECHCORP_IN', org_name: 'TechCorp Innovations Pvt. Ltd.', subscription_plan: 'Basic' },
    { organization_id: 'MGFAB_GLOBAL', org_name: 'Muzaffarpur Global Fabricators', subscription_plan: 'Standard' },
    { organization_id: 'EDU_INST', org_name: 'BMS Education Institute', subscription_plan: 'Enterprise' }
  ]);
  console.log('Organizations seeded.');

  await User.insertMany([
    // TechCorp Innovations
    { user_id: 'TCI_MGR001', organization_id: 'TECHCORP_IN', first_name: 'Ananya', last_name: 'Sharma', email: 'ananya.sharma@techcorp.com', password_hash: demoPasswordHash, role: 'Manager', manager_id: null, date_of_joining: new Date('2020-01-15'), department: 'Engineering', location: 'Bangalore' },
    { user_id: 'TCI_EMP002', organization_id: 'TECHCORP_IN', first_name: 'Rahul', last_name: 'Verma', email: 'rahul.verma@techcorp.com', password_hash: demoPasswordHash, role: 'Employee', manager_id: 'TCI_MGR001', date_of_joining: new Date('2021-03-10'), department: 'Engineering', location: 'Bangalore' },
    { user_id: 'TCI_HR003', organization_id: 'TECHCORP_IN', first_name: 'Priya', last_name: 'Singh', email: 'priya.singh@techcorp.com', password_hash: demoPasswordHash, role: 'Admin', manager_id: null, date_of_joining: new Date('2019-07-20'), department: 'Human Resources', location: 'Bangalore' },
    { user_id: 'TCI_EMP004', organization_id: 'TECHCORP_IN', first_name: 'Amit', last_name: 'Kumar', email: 'amit.kumar@techcorp.com', password_hash: demoPasswordHash, role: 'Employee', manager_id: 'TCI_MGR001', date_of_joining: new Date('2022-06-01'), department: 'Engineering', location: 'Bangalore' },
    // Muzaffarpur Global Fabricators
    { user_id: 'MGF_MGR001', organization_id: 'MGFAB_GLOBAL', first_name: 'Suresh', last_name: 'Kumar', email: 'suresh.kumar@mgfab.com', password_hash: demoPasswordHash, role: 'Manager', manager_id: null, date_of_joining: new Date('2018-05-01'), department: 'Production', location: 'Muzaffarpur, UP' },
    { user_id: 'MGF_EMP002', organization_id: 'MGFAB_GLOBAL', first_name: 'Geeta', last_name: 'Devi', email: 'geeta.devi@mgfab.com', password_hash: demoPasswordHash, role: 'Employee', manager_id: 'MGF_MGR001', date_of_joining: new Date('2022-09-01'), department: 'Quality Control', location: 'Muzaffarpur, UP' }
  ]);
  console.log('Users seeded. Demo password for all users: password123');

  await LeaveBalance.insertMany([
    { organization_id: 'TECHCORP_IN', user_id: 'TCI_EMP002', leave_type: 'Casual Leave', total_allotted: 12, leaves_taken: 5, leaves_pending_approval: 0 },
    { organization_id: 'TECHCORP_IN', user_id: 'TCI_EMP002', leave_type: 'Sick Leave', total_allotted: 8, leaves_taken: 2, leaves_pending_approval: 0 },
    { organization_id: 'TECHCORP_IN', user_id: 'TCI_EMP002', leave_type: 'Earned Leave', total_allotted: 18, leaves_taken: 6, leaves_pending_approval: 2 },
    { organization_id: 'TECHCORP_IN', user_id: 'TCI_MGR001', leave_type: 'Casual Leave', total_allotted: 12, leaves_taken: 3, leaves_pending_approval: 0 },
    { organization_id: 'TECHCORP_IN', user_id: 'TCI_EMP004', leave_type: 'Casual Leave', total_allotted: 12, leaves_taken: 1, leaves_pending_approval: 0 },
    { organization_id: 'MGFAB_GLOBAL', user_id: 'MGF_EMP002', leave_type: 'Casual Leave', total_allotted: 10, leaves_taken: 4, leaves_pending_approval: 0 },
    { organization_id: 'MGFAB_GLOBAL', user_id: 'MGF_EMP002', leave_type: 'Sick Leave', total_allotted: 7, leaves_taken: 1, leaves_pending_approval: 0 }
  ]);
  console.log('Leave balances seeded.');

  await CompanyPolicy.insertMany([
    { organization_id: 'TECHCORP_IN', policy_title: 'Work from Home Policy', policy_category: 'HR General', policy_content: 'Employees are allowed to work from home for up to 2 days a week, with prior manager approval. Ensure stable internet connection and productive environment. This applies to all non-production roles.', last_reviewed: new Date('2024-10-01'), keywords: 'WFH, remote, flexible, home, policy' },
    { organization_id: 'TECHCORP_IN', policy_title: 'Travel & Expense Policy', policy_category: 'Expense', policy_content: 'All business travel expenses must be pre-approved by your manager. Reimbursements require submission of original receipts within 7 days. Daily allowance for domestic travel is INR 1500.', last_reviewed: new Date('2023-11-15'), keywords: 'travel, expense, reimbursement, allowance, policy' },
    { organization_id: 'TECHCORP_IN', policy_title: 'Next Company Holiday', policy_category: 'Calendar', policy_content: 'The next company holiday for all TechCorp employees in Bangalore is Independence Day, August 15, 2025.', last_reviewed: new Date('2025-01-01'), keywords: 'holiday, vacation, August 15, Independence Day' },
    { organization_id: 'MGFAB_GLOBAL', policy_title: 'Attendance & Punctuality Policy', policy_category: 'HR General', policy_content: 'All factory employees must clock in daily using biometric scanners. Lateness will result in a deduction from pay after 3 instances. Strict adherence to shift timings is required.', last_reviewed: new Date('2024-03-01'), keywords: 'attendance, punctuality, clock-in, biometric, policy' },
    { organization_id: 'MGFAB_GLOBAL', policy_title: 'Safety Regulations Policy', policy_category: 'Safety', policy_content: 'All personnel must wear mandatory safety gear (helmets, gloves, safety shoes) in production areas. Report any hazards immediately. Regular safety drills are conducted.', last_reviewed: new Date('2024-01-20'), keywords: 'safety, regulations, PPE, hazards, drills, policy' },
    { organization_id: 'MGFAB_GLOBAL', policy_title: 'Bihar State Holidays 2025', policy_category: 'Calendar', policy_content: 'Upcoming public holidays in UP for 2025 include Diwali (Oct 29), Chhath Puja (Nov 5-6), and Christmas (Dec 25).', last_reviewed: new Date('2025-01-01'), keywords: 'UP, holiday, public holiday, festival' }
  ]);
  console.log('Company policies seeded.');

  await PayrollData.insertMany([
    { organization_id: 'TECHCORP_IN', user_id: 'TCI_MGR001', base_salary: 80000.0, HRA: 40000.0, conveyance_allowance: 8000.0, medical_allowance: 3000.0, pf_deduction: 9600.0, esi_deduction: 0.0, professional_tax: 200.0, ctc: 150000.0 },
    { organization_id: 'TECHCORP_IN', user_id: 'TCI_EMP002', base_salary: 45000.0, HRA: 22500.0, conveyance_allowance: 4500.0, medical_allowance: 1500.0, pf_deduction: 5400.0, esi_deduction: 0.0, professional_tax: 150.0, ctc: 85000.0 },
    { organization_id: 'MGFAB_GLOBAL', user_id: 'MGF_MGR001', base_salary: 60000.0, HRA: 30000.0, conveyance_allowance: 6000.0, medical_allowance: 2000.0, pf_deduction: 7200.0, esi_deduction: 1800.0, professional_tax: 100.0, ctc: 110000.0 },
    { organization_id: 'MGFAB_GLOBAL', user_id: 'MGF_EMP002', base_salary: 30000.0, HRA: 15000.0, conveyance_allowance: 3000.0, medical_allowance: 1000.0, pf_deduction: 3600.0, esi_deduction: 900.0, professional_tax: 50.0, ctc: 55000.0 }
  ]);
  console.log('Payroll data seeded.');

  console.log('\n✅ Seed complete. Demo login (any user email above) password: password123');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});