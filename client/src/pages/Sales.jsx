import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { getSales, getTopSellers } from '../api/ebay';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const HIGHLIGHT_COLORS = ['#F5AF02', '#0064D2', '#86B817', '#E53238', '#6366f1'];

export default function Sales() {
  const [days, setDays] = useState(90);
  const [sales, setSales] = useState(null);
  const [topSellers, setTopSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [salesRes, topRes] = await Promise.all([
        getSales(days),
        getTopSellers(365),
      ]);
      setSales(salesRes.data);
      setTopSellers(topRes.data.topSellers || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [days]);

  if (loading) return <LoadingSpinner message="Loading sales history..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  const top10 = topSellers.slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
          <p className="text-sm text-gray-500 mt-0.5">Historical performance & best-selling listings</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Period:</span>
          {[30, 90, 180, 365].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                days === d ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {d === 365 ? '1yr' : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={fmt(sales?.summary?.totalRevenue || 0)} sub={`${days} day period`} color="blue" />
        <StatCard label="Total Orders" value={sales?.summary?.totalOrders?.toLocaleString() ?? '—'} sub="Completed orders" color="green" />
        <StatCard label="Units Sold" value={sales?.summary?.totalUnits?.toLocaleString() ?? '—'} sub="Items shipped" color="yellow" />
        <StatCard label="Avg Order Value" value={fmt(sales?.summary?.avgOrderValue || 0)} sub="Per order" color="purple" />
      </div>

      {/* Revenue trend */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue Trend</h2>
        {sales?.daily?.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={sales.daily} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0064D2" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0064D2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v, n) => [n === 'revenue' ? fmt(v) : v, n === 'revenue' ? 'Revenue' : 'Orders']}
                labelStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#0064D2" fill="url(#revGrad2)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">No sales data for this period.</p>
        )}
      </div>

      {/* All-time best sellers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Best-Selling Listings — All Time (up to 1yr)</h2>
          <span className="badge-yellow">Top {top10.length}</span>
        </div>
        {top10.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={top10} layout="vertical" margin={{ top: 4, right: 60, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <YAxis dataKey="listingId" type="category" tick={{ fontSize: 10 }} width={80}
                tickFormatter={(id) => id.length > 10 ? id.slice(0, 10) + '…' : id} />
              <Tooltip formatter={(v, n) => [n === 'revenue' ? fmt(v) : v, n === 'revenue' ? 'Revenue' : 'Units']}
                labelStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="revenue" radius={[0, 4, 4, 0]}>
                {top10.map((_, i) => (
                  <Cell key={i} fill={HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">No top seller data available.</p>
        )}
      </div>

      {/* Best sellers table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Best Sellers Detail</h2>
          <span className="text-xs text-gray-400">Ranked by revenue</span>
        </div>
        {topSellers.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header w-8">#</th>
                  <th className="table-header">Title</th>
                  <th className="table-header">Listing ID</th>
                  <th className="table-header text-right">Units</th>
                  <th className="table-header text-right">Orders</th>
                  <th className="table-header text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topSellers.map((item, i) => (
                  <tr key={item.listingId} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell text-center">
                      {i < 3 ? (
                        <span className="font-bold" style={{ color: HIGHLIGHT_COLORS[i] }}>#{i + 1}</span>
                      ) : (
                        <span className="text-gray-400">{i + 1}</span>
                      )}
                    </td>
                    <td className="table-cell max-w-xs">
                      <p className="truncate font-medium text-gray-800">{item.title}</p>
                    </td>
                    <td className="table-cell font-mono text-xs text-blue-600">{item.listingId}</td>
                    <td className="table-cell text-right">{item.units.toLocaleString()}</td>
                    <td className="table-cell text-right">{item.orders.toLocaleString()}</td>
                    <td className="table-cell text-right font-semibold text-gray-900">{fmt(item.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">No sales data found.</p>
        )}
      </div>
    </div>
  );
}
