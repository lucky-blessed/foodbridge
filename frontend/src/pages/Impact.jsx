/**
 * Impact.jsx - Impact Dashboard
 *
 * Role-specific analytics page for donors, recipients, and admins.
 * Shows lifetime metrics and time-series charts using Chart.js.
 *
 * Donor view:    value donated, kg rescued, meals saved, completion rate
 * Recipient view: value received, kg received, meals received, pickup rate
 * Admin view:    platform-wide totals, top donors, top recipients
 *
 * All views support period toggle: Weekly / Monthly / Yearly
 *
 * @author Lucky Nkwor
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale,
    BarElement, LineElement, PointElement, ArcElement,
    Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import Sidebar from '../components/Sidebar';
import { getCurrentUser } from '../services/auth';
import {
    getDonorImpact,
    getRecipientImpact,
    getAdminImpact
} from '../services/api';

// Register all Chart.js components we use
ChartJS.register(
    CategoryScale, LinearScale,
    BarElement, LineElement, PointElement, ArcElement,
    Title, Tooltip, Legend, Filler
);

// ── Chart colour palette -------------------------
const COLORS = {
    green:       'rgba(64, 145, 108, 0.8)',
    greenBorder: 'rgba(64, 145, 108, 1)',
    coral:       'rgba(231, 111, 81, 0.8)',
    coralBorder: 'rgba(231, 111, 81, 1)',
    mint:        'rgba(82, 183, 136, 0.8)',
    mintBorder:  'rgba(82, 183, 136, 1)',
    blue:        'rgba(41, 128, 185, 0.8)',
    blueBorder:  'rgba(41, 128, 185, 1)',
    palette: [
        'rgba(64,145,108,0.8)',  'rgba(231,111,81,0.8)',
        'rgba(82,183,136,0.8)',  'rgba(41,128,185,0.8)',
        'rgba(243,156,18,0.8)',  'rgba(142,68,173,0.8)',
    ],
};

const chartOptions = (title) => ({
    responsive: true,
    plugins: {
        legend: { display: false },
        title:  { display: !!title, text: title, font: { size: 13 } }
    },
    scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        x: { grid: { display: false } }
    }
});

const doughnutOptions = {
    responsive: true,
    plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } }
    }
};

// ── Reusable stat card ─----─────────────────
const StatCard = ({ label, value, sub, color = 'bg-emerald-50 text-emerald-700' }) => (
    <div className={`p-5 rounded-2xl border border-current border-opacity-20 ${color}`}>
        <p className="text-3xl font-black">{value}</p>
        <p className="text-xs font-bold uppercase tracking-wider opacity-70 mt-1">{label}</p>
        {sub && <p className="text-xs opacity-50 mt-1">{sub}</p>}
    </div>
);

// ── Period toggle --------------─
const PeriodToggle = ({ period, onChange }) => (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {['week', 'month', 'year'].map(p => (
            <button key={p} onClick={() => onChange(p)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                    period === p
                        ? 'bg-fb-dark text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                }`}>
                {p === 'week' ? 'Weekly' : p === 'month' ? 'Monthly' : 'Yearly'}
            </button>
        ))}
    </div>
);

// ═══════════════════════════
// DONOR VIEW
// ═══════════════════════════════════════
const DonorImpact = () => {
    const [data,    setData]    = useState(null);
    const [period,  setPeriod]  = useState('month');
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await getDonorImpact(period);
                setData(res.data);
            } catch {
                setError('Failed to load impact data.');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [period]);

    if (loading) return <div className="text-center text-gray-400 mt-20">Loading impact data...</div>;
    if (error)   return <div className="text-red-500 mt-10">{error}</div>;
    if (!data)   return null;

    const labels = data.chartData.map(d => d.label);

    const donationsChart = {
        labels,
        datasets: [{
            label: 'Listings Posted',
            data:             data.chartData.map(d => d.count),
            backgroundColor:  COLORS.green,
            borderColor:      COLORS.greenBorder,
            borderWidth: 2,
            borderRadius: 6,
        }]
    };

    const valueChart = {
        labels,
        datasets: [{
            label: 'Value Donated (CAD)',
            data:            data.chartData.map(d => d.value),
            borderColor:     COLORS.coralBorder,
            backgroundColor: COLORS.coral,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
        }]
    };

    const kgChart = {
        labels,
        datasets: [{
            label: 'Kg Rescued',
            data:            data.chartData.map(d => d.kg),
            backgroundColor: COLORS.mint,
            borderColor:     COLORS.mintBorder,
            borderWidth: 2,
            borderRadius: 6,
        }]
    };

    const categoryChart = {
        labels:   data.categoryBreakdown.map(c => c.category),
        datasets: [{
            data:            data.categoryBreakdown.map(c => c.count),
            backgroundColor: COLORS.palette,
            borderWidth: 0,
        }]
    };

    return (
        <div className="space-y-8">
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Value Donated"  value={`$${data.totalValue}`}
                    sub="CAD — completed listings" color="bg-emerald-50 text-emerald-700" />
                <StatCard label="Kg of Food Rescued"   value={`${data.kgRescued} kg`}
                    color="bg-blue-50 text-blue-700" />
                <StatCard label="Meals Saved"          value={data.mealsSaved}
                    sub="est. 300g per meal" color="bg-orange-50 text-orange-700" />
                <StatCard label="Completion Rate"      value={`${data.completionRate}%`}
                    sub={`${data.completed} completed / ${data.expired} expired`}
                    color="bg-purple-50 text-purple-700" />
                <StatCard label="Total Listings"       value={data.totalListings}
                    color="bg-gray-50 text-gray-700" />
                <StatCard label="Completed Donations"  value={data.completed}
                    color="bg-emerald-50 text-emerald-700" />
                <StatCard label="Expired Listings"     value={data.expired}
                    color="bg-red-50 text-red-700" />
                <StatCard label="Active Listings"      value={data.active}
                    color="bg-blue-50 text-blue-700" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="font-bold text-fb-dark mb-4 text-sm">Donations Over Time</h4>
                    <Bar data={donationsChart} options={chartOptions()} />
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="font-bold text-fb-dark mb-4 text-sm">Value Donated (CAD)</h4>
                    <Line data={valueChart} options={chartOptions()} />
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="font-bold text-fb-dark mb-4 text-sm">Food Rescued (kg)</h4>
                    <Bar data={kgChart} options={chartOptions()} />
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="font-bold text-fb-dark mb-4 text-sm">Category Breakdown</h4>
                    <div className="max-w-[260px] mx-auto">
                        <Doughnut data={categoryChart} options={doughnutOptions} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════
// RECIPIENT VIEW
// ══════════════════════════════════════════════════════════════
const RecipientImpact = () => {
    const [data,    setData]    = useState(null);
    const [period,  setPeriod]  = useState('month');
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await getRecipientImpact(period);
                setData(res.data);
            } catch {
                setError('Failed to load impact data.');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [period]);

    if (loading) return <div className="text-center text-gray-400 mt-20">Loading impact data...</div>;
    if (error)   return <div className="text-red-500 mt-10">{error}</div>;
    if (!data)   return null;

    const labels = data.chartData.map(d => d.label);

    const claimsChart = {
        labels,
        datasets: [{
            label: 'Claims Made',
            data:             data.chartData.map(d => d.count),
            backgroundColor:  COLORS.blue,
            borderColor:      COLORS.blueBorder,
            borderWidth: 2,
            borderRadius: 6,
        }]
    };

    const valueChart = {
        labels,
        datasets: [{
            label: 'Value Received (CAD)',
            data:            data.chartData.map(d => d.value),
            borderColor:     COLORS.coralBorder,
            backgroundColor: COLORS.coral,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
        }]
    };

    const kgChart = {
        labels,
        datasets: [{
            label: 'Kg Received',
            data:            data.chartData.map(d => d.kg),
            backgroundColor: COLORS.mint,
            borderColor:     COLORS.mintBorder,
            borderWidth: 2,
            borderRadius: 6,
        }]
    };

    const categoryChart = {
        labels:   data.categoryBreakdown.map(c => c.category),
        datasets: [{
            data:            data.categoryBreakdown.map(c => c.count),
            backgroundColor: COLORS.palette,
            borderWidth: 0,
        }]
    };

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Value Received" value={`$${data.totalValue}`}
                    sub="CAD — completed pickups" color="bg-blue-50 text-blue-700" />
                <StatCard label="Kg of Food Received"  value={`${data.kgReceived} kg`}
                    color="bg-emerald-50 text-emerald-700" />
                <StatCard label="Meals Received"       value={data.mealsReceived}
                    sub="est. 300g per meal" color="bg-orange-50 text-orange-700" />
                <StatCard label="Pickup Rate"          value={`${data.pickupRate}%`}
                    sub={`${data.completed} completed / ${data.cancelled} cancelled`}
                    color="bg-purple-50 text-purple-700" />
                <StatCard label="Total Claims"         value={data.totalClaims}
                    color="bg-gray-50 text-gray-700" />
                <StatCard label="Completed Pickups"    value={data.completed}
                    color="bg-emerald-50 text-emerald-700" />
                <StatCard label="Cancelled Claims"     value={data.cancelled}
                    color="bg-red-50 text-red-700" />
                <StatCard label="Active Claims"        value={data.active}
                    color="bg-blue-50 text-blue-700" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="font-bold text-fb-dark mb-4 text-sm">Claims Over Time</h4>
                    <Bar data={claimsChart} options={chartOptions()} />
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="font-bold text-fb-dark mb-4 text-sm">Value Received (CAD)</h4>
                    <Line data={valueChart} options={chartOptions()} />
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="font-bold text-fb-dark mb-4 text-sm">Food Received (kg)</h4>
                    <Bar data={kgChart} options={chartOptions()} />
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="font-bold text-fb-dark mb-4 text-sm">Category Breakdown</h4>
                    <div className="max-w-[260px] mx-auto">
                        <Doughnut data={categoryChart} options={doughnutOptions} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════
// ADMIN VIEW
// ═══════════════════════════════════
const AdminImpact = () => {
    const [data,    setData]    = useState(null);
    const [period,  setPeriod]  = useState('month');
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await getAdminImpact(period);
                setData(res.data);
            } catch {
                setError('Failed to load impact data.');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [period]);

    if (loading) return <div className="text-center text-gray-400 mt-20">Loading impact data...</div>;
    if (error)   return <div className="text-red-500 mt-10">{error}</div>;
    if (!data)   return null;

    const labels = data.chartData.map(d => d.label);

    const activityChart = {
        labels,
        datasets: [{
            label: 'Listings Posted',
            data:             data.chartData.map(d => d.count),
            backgroundColor:  COLORS.green,
            borderColor:      COLORS.greenBorder,
            borderWidth: 2,
            borderRadius: 6,
        }]
    };

    const valueChart = {
        labels,
        datasets: [{
            label: 'Total Value Donated (CAD)',
            data:            data.chartData.map(d => d.value),
            borderColor:     COLORS.coralBorder,
            backgroundColor: COLORS.coral,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
        }]
    };

    const categoryChart = {
        labels:   data.categoryBreakdown.map(c => c.category),
        datasets: [{
            data:            data.categoryBreakdown.map(c => c.count),
            backgroundColor: COLORS.palette,
            borderWidth: 0,
        }]
    };

    return (
        <div className="space-y-8">
            {/* Platform totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Value Donated"  value={`$${data.totalValue}`}
                    sub="CAD platform-wide" color="bg-emerald-50 text-emerald-700" />
                <StatCard label="Total Kg Rescued"     value={`${data.kgRescued} kg`}
                    color="bg-blue-50 text-blue-700" />
                <StatCard label="Total Meals Saved"    value={data.mealsSaved}
                    sub="est. 300g per meal" color="bg-orange-50 text-orange-700" />
                <StatCard label="Platform Completion"  value={`${data.completionRate}%`}
                    sub={`${data.completed} completed / ${data.expired} expired`}
                    color="bg-purple-50 text-purple-700" />
                <StatCard label="Total Listings"       value={data.totalListings}
                    color="bg-gray-50 text-gray-700" />
                <StatCard label="Total Claims"         value={data.totalClaims}
                    color="bg-gray-50 text-gray-700" />
                <StatCard label="Completed Donations"  value={data.completed}
                    color="bg-emerald-50 text-emerald-700" />
                <StatCard label="Expired Listings"     value={data.expired}
                    color="bg-red-50 text-red-700" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="font-bold text-fb-dark mb-4 text-sm">Platform Activity</h4>
                    <Bar data={activityChart} options={chartOptions()} />
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="font-bold text-fb-dark mb-4 text-sm">Community Value Trend (CAD)</h4>
                    <Line data={valueChart} options={chartOptions()} />
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm col-span-full md:col-span-1">
                    <h4 className="font-bold text-fb-dark mb-4 text-sm">Category Distribution</h4>
                    <div className="max-w-[260px] mx-auto">
                        <Doughnut data={categoryChart} options={doughnutOptions} />
                    </div>
                </div>
            </div>

            {/* Leaderboards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top donors */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="font-bold text-fb-dark mb-4 text-sm">Top 5 Donors</h4>
                    <div className="space-y-3">
                        {data.topDonors.map((d, i) => (
                            <div key={d.donorId}
                                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                                <span className="text-lg font-black text-fb-dark w-6">
                                    {i + 1}
                                </span>
                                {d.profilePicUrl ? (
                                    <img src={d.profilePicUrl} alt={d.donorName}
                                        className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-fb-dark
                                                    flex items-center justify-center
                                                    text-white text-xs font-bold">
                                        {d.donorName?.[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-fb-dark text-sm truncate">
                                        {d.donorName}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {d.completed} completed · ${d.totalValue} · {d.kgRescued}kg
                                    </p>
                                </div>
                            </div>
                        ))}
                        {data.topDonors.length === 0 && (
                            <p className="text-gray-400 text-sm italic">No data yet.</p>
                        )}
                    </div>
                </div>

                {/* Top recipients */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="font-bold text-fb-dark mb-4 text-sm">Top 5 Recipients</h4>
                    <div className="space-y-3">
                        {data.topRecipients.map((r, i) => (
                            <div key={r.recipientId}
                                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                                <span className="text-lg font-black text-fb-dark w-6">
                                    {i + 1}
                                </span>
                                {r.profilePicUrl ? (
                                    <img src={r.profilePicUrl} alt={r.recipientName}
                                        className="w-8 h-8 rounded-full object-cover" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-fb-coral
                                                    flex items-center justify-center
                                                    text-white text-xs font-bold">
                                        {r.recipientName?.[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-fb-dark text-sm truncate">
                                        {r.recipientName}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {r.completedPickups} completed pickups
                                    </p>
                                </div>
                            </div>
                        ))}
                        {data.topRecipients.length === 0 && (
                            <p className="text-gray-400 text-sm italic">No data yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ═════════════════════════════════════════════════════
// MAIN IMPACT PAGE — renders the correct view per role
// ══════════════════════════════════════════════════════════════
const Impact = () => {
    const user   = getCurrentUser();
    const role   = user?.role;
    const [period, setPeriod] = useState('month');

    const title = {
        donor:     'Your Impact',
        recipient: 'Your Impact',
        admin:     'Platform Impact',
    }[role] || 'Impact Dashboard';

    const subtitle = {
        donor:     'Track the value and reach of your food donations.',
        recipient: 'See the value of food you have received through FoodBridge.',
        admin:     'Platform-wide analytics and community impact overview.',
    }[role] || '';

    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar />
            <main className="flex-1 p-10 overflow-y-auto">

                {/* Header */}
                <header className="mb-8 flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-fb-dark">{title}</h2>
                        <p className="text-gray-500 mt-1">{subtitle}</p>
                    </div>
                    <PeriodToggle period={period} onChange={setPeriod} />
                </header>

                {/* Role-specific view */}
                {role === 'donor'     && <DonorImpact     key={period} period={period} />}
                {role === 'recipient' && <RecipientImpact key={period} period={period} />}
                {role === 'admin'     && <AdminImpact     key={period} period={period} />}

                {!role && (
                    <div className="text-center text-gray-400 mt-20">
                        Please log in to view your impact.
                    </div>
                )}

            </main>
        </div>
    );
};

export default Impact;