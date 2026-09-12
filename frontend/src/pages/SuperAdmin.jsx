import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';
import { Link } from 'react-router-dom';

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

export default function SuperAdmin() {
    const { user, logout } = useAuth();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeOrg, setActiveOrg] = useState('ALL');

    const fetchOverview = async () => {
        setLoading(true);
        setError('');
        try {
        const res = await axios.get('/api/admin/super-overview');
        setData(res.data);
        } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load platform data.');
        } finally {
        setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverview();
    }, []);

    const filterByOrg = (arr) =>
        activeOrg === 'ALL' ? arr : arr.filter((r) => r.organization_id === activeOrg);

    return (
        <div className="min-h-screen bg-gray-100">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
            <h2 className="font-semibold text-gray-900">ProjectAthena Super Admin</h2>
            <p className="text-xs text-gray-400">All organizations · platform-wide view</p>
            </div>
            <div className="flex items-center gap-4">
            <button
                onClick={fetchOverview}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
                Refresh
            </button>
            <Link to="/" className="text-xs text-brand-600 hover:underline">Back to chat</Link>
            <button onClick={logout} className="text-xs text-gray-400 hover:text-red-600">Sign out</button>
            </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
            {loading && <p className="text-sm text-gray-400">Loading live data…</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}

            {data && (
            <>
                <p className="text-xs text-gray-400">
                Fetched from DB at {new Date(data.fetched_at).toLocaleString()} ·
                {' '}{data.counts.organizations} orgs · {data.counts.users} users ·
                {' '}{data.counts.leaveBalances} leave records · {data.counts.policies} policies ·
                {' '}{data.counts.payroll} payroll records
                </p>

                <div className="flex flex-wrap gap-2">
                <OrgTab label="All companies" active={activeOrg === 'ALL'} onClick={() => setActiveOrg('ALL')} />
                {data.organizations.map((o) => (
                    <OrgTab
                    key={o.organization_id}
                    label={o.org_name}
                    active={activeOrg === o.organization_id}
                    onClick={() => setActiveOrg(o.organization_id)}
                    />
                ))}
                </div>

                <Section title="Organizations">
                <Table
                    columns={['Org ID', 'Name', 'Plan']}
                    rows={data.organizations
                    .filter((o) => activeOrg === 'ALL' || o.organization_id === activeOrg)
                    .map((o) => [o.organization_id, o.org_name, o.subscription_plan])}
                />
                </Section>

                <Section title="Employees">
                <Table
                    columns={['Org', 'Name', 'Role', 'Department', 'Email', 'Manager ID']}
                    rows={filterByOrg(data.users).map((u) => [
                    u.organization_id,
                    `${u.first_name} ${u.last_name}`,
                    u.role,
                    u.department,
                    u.email,
                    u.manager_id || '—'
                    ])}
                />
                </Section>

                <Section title="Leave Balances">
                <Table
                    columns={['Org', 'User ID', 'Type', 'Allotted', 'Taken', 'Pending']}
                    rows={filterByOrg(data.leaveBalances).map((l) => [
                    l.organization_id,
                    l.user_id,
                    l.leave_type,
                    l.total_allotted,
                    l.leaves_taken,
                    l.leaves_pending_approval
                    ])}
                />
                </Section>

                <Section title="Company Policies">
                <Table
                    columns={['Org', 'Title', 'Category']}
                    rows={filterByOrg(data.policies).map((p) => [p.organization_id, p.policy_title, p.policy_category])}
                />
                </Section>

                <Section title="Payroll">
                <Table
                    columns={['Org', 'User ID', 'Base Salary', 'HRA', 'PF', 'CTC']}
                    rows={filterByOrg(data.payroll).map((p) => [
                    p.organization_id,
                    p.user_id,
                    inr(p.base_salary),
                    inr(p.HRA),
                    inr(p.pf_deduction),
                    inr(p.ctc)
                    ])}
                />
                </Section>
            </>
            )}
        </main>
        </div>
    );
}

function OrgTab({ label, active, onClick }) {
    return (
        <button
        onClick={onClick}
        className={`text-xs px-3 py-1.5 rounded-full border transition ${
            active
            ? 'bg-brand-600 border-brand-600 text-white'
            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
        }`}
        >
        {label}
        </button>
    );
}

function Section({ title, children }) {
    return (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-3">{title}</h3>
        {children}
        </section>
    );
}

function Table({ columns, rows }) {
    if (!rows.length) return <p className="text-sm text-gray-400">No records.</p>;
    return (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
            <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
                {columns.map((c) => (
                <th key={c} className="py-2 pr-4 font-medium">{c}</th>
                ))}
            </tr>
            </thead>
            <tbody>
            {rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 text-gray-700">
                {row.map((cell, j) => (
                    <td key={j} className="py-2 pr-4">{cell}</td>
                ))}
                </tr>
            ))}
            </tbody>
        </table>
        </div>
    );
}