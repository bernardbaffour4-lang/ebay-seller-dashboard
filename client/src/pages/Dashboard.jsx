import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';
import { getSales, getTrafficData, getListings } from '../api/ebay';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const pct = (n) => `${(n * 100).toFixed(2)}%`;

export default function Dashboard() {
  const [sales, setSales] = useState(null);
  const [traffic, setTraffic] = useState(null);
  const [listings, setListings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, trafficRes, listingsRes] = await Promise.all([
        getSales(30),
        getTrafficData(30),
        getListings(),
      ]);
      setSales(salesRes.data);
      setTraffic(trafficRes.data);
      setListings(listingsRes.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  const avgCTR = traffic?.data?.length
    ? traffic.data.reduce((s, d) => s + d.clickThroughRate, 0) / traffic.data.length
    : 0;

  const avgConv = traffic?.data?.length
    ? traffic.data.reduce((s, d) => s + d.salesConversionRate, 0) / traffic.data.length
    : 0;

  // Top 5 listings by transactions from traffic data
  const topByTraffic = [...(traffic?.data || [])]
    .sort((a, b) => b.transactions - a.transactions)
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Last 30 days overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Revenue (30d)"
          value={fmt(sales?.summary?.totalRevenue || 0)}
          sub={`${sales?.summary?.totalOrders || 0} orders`}
          color="blue"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Active Listings"
          value={listings?.total ?? '—'}
          sub="Published on eBay"
          color="green"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard
          label="Avg. Click-Through Rate"
          value={pct(avgCTR)}
          sub="Across all listings"
          color="yellow"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>}
        />
        <StatCard
          label="Avg. Conversion Rate"
          value={pct(avgConv)}
          sub="Sales per listing click"
          color="purple"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue — Last 30 Days</h2>
        {sales?.daily?.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={sales.daily} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0064D2" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0064D2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => [`$${v.toFixed(2)}`, 'Revenue']} labelStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#0064D2" fill="url(#revGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">No sales data for this period.</p>
        )}
      </div>

      {/* Traffic summary chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Top Listings — Page Views vs Transactions (30d)</h2>
        {topByTraffic.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topByTraffic} layout="vertical" margin={{ top: 4, right: 16, left: 40, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="listingId" type="category" tick={{ fontSize: 10 }} width={80}
                tickFormatter={(id) => id.length > 10 ? id.slice(0, 10) + '…' : id} />
              <Tooltip labelStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="pageViews" name="Page Views" fill="#0064D2" radius={[0, 4, 4, 0]} />
              <Bar dataKey="transactions" name="Transactions" fill="#86B817" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">No traffic data available.</p>
        )}
      </div>

      {/* Units sold */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Units Sold — Last 30 Days</h2>
        {sales?.daily?.length ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sales.daily} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip labelStyle={{ fontSize: 12 }} />
              <Bar dataKey="units" name="Units Sold" fill="#86B817" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">No data.</p>
        )}
      </div>
    </div>
  );
}
