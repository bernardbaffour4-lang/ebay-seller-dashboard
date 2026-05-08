import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { getTrafficData, getDailyTraffic } from '../api/ebay';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const pct = (n) => `${(n * 100).toFixed(2)}%`;

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState([]);
  const [daily, setDaily] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState({ key: 'pageViews', dir: 'desc' });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [trafficRes, dailyRes] = await Promise.all([
        getTrafficData(days),
        getDailyTraffic(days),
      ]);
      setData(trafficRes.data.data || []);
      setDaily(dailyRes.data.daily || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [days]);

  function toggleSort(key) {
    setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
  }

  const sorted = [...data].sort((a, b) => {
    const v = sort.dir === 'desc' ? b[sort.key] - a[sort.key] : a[sort.key] - b[sort.key];
    return v;
  });

  const SortIcon = ({ col }) => (
    <span className="ml-1 text-gray-400">
      {sort.key === col ? (sort.dir === 'desc' ? '↓' : '↑') : '↕'}
    </span>
  );

  if (loading) return <LoadingSpinner message="Fetching traffic data..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Traffic Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Per-listing CTR, page views, and conversion rates</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Period:</span>
          {[7, 14, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                days === d ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Daily CTR & Conversion Line Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Daily CTR & Conversion Rate (%)</h2>
        {daily.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={daily} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => [`${v}%`]} labelStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="clickThroughRate" name="CTR %" stroke="#0064D2" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="salesConversionRate" name="Conversion %" stroke="#86B817" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">No daily data for this period.</p>
        )}
      </div>

      {/* Page Views Bar Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Page Views by Listing (Top 15)</h2>
        {sorted.slice(0, 15).length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sorted.slice(0, 15)} layout="vertical" margin={{ top: 4, right: 16, left: 60, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="listingId" type="category" tick={{ fontSize: 10 }} width={70}
                tickFormatter={(id) => id.length > 10 ? id.slice(0, 10) + '…' : id} />
              <Tooltip labelStyle={{ fontSize: 12 }} />
              <Bar dataKey="pageViews" name="Page Views" fill="#0064D2" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">No data.</p>
        )}
      </div>

      {/* Per-listing table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">All Listings — Traffic Metrics</h2>
        </div>
        {sorted.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Listing ID</th>
                  <th className="table-header cursor-pointer hover:text-gray-700" onClick={() => toggleSort('pageViews')}>
                    Page Views <SortIcon col="pageViews" />
                  </th>
                  <th className="table-header cursor-pointer hover:text-gray-700" onClick={() => toggleSort('impressionsTotal')}>
                    Impressions <SortIcon col="impressionsTotal" />
                  </th>
                  <th className="table-header cursor-pointer hover:text-gray-700" onClick={() => toggleSort('clickThroughRate')}>
                    CTR <SortIcon col="clickThroughRate" />
                  </th>
                  <th className="table-header cursor-pointer hover:text-gray-700" onClick={() => toggleSort('salesConversionRate')}>
                    Conv. Rate <SortIcon col="salesConversionRate" />
                  </th>
                  <th className="table-header cursor-pointer hover:text-gray-700" onClick={() => toggleSort('transactions')}>
                    Transactions <SortIcon col="transactions" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((row) => (
                  <tr key={row.listingId} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-mono text-xs text-blue-600">{row.listingId}</td>
                    <td className="table-cell font-medium">{row.pageViews.toLocaleString()}</td>
                    <td className="table-cell">{row.impressionsTotal.toLocaleString()}</td>
                    <td className="table-cell">
                      <span className={`font-medium ${row.clickThroughRate > 0.03 ? 'text-green-600' : row.clickThroughRate > 0.01 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {pct(row.clickThroughRate)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`font-medium ${row.salesConversionRate > 0.05 ? 'text-green-600' : row.salesConversionRate > 0.02 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {pct(row.salesConversionRate)}
                      </span>
                    </td>
                    <td className="table-cell font-medium">{row.transactions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">No traffic data available for this period.</p>
        )}
      </div>
    </div>
  );
}
