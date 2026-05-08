import { useEffect, useState } from 'react';
import { getListings, getTrafficData, promoteListingManually } from '../api/ebay';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const pct = (n) => `${(n * 100).toFixed(2)}%`;

export default function Listings() {
  const [listings, setListings] = useState([]);
  const [traffic, setTraffic] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [promoting, setPromoting] = useState(null);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [listingsRes, trafficRes] = await Promise.all([
        getListings(),
        getTrafficData(30),
      ]);
      setListings(listingsRes.data.offers || []);

      // Index traffic data by listingId
      const trafficMap = {};
      (trafficRes.data.data || []).forEach((d) => {
        trafficMap[d.listingId] = d;
      });
      setTraffic(trafficMap);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handlePromote(listingId) {
    setPromoting(listingId);
    try {
      await promoteListingManually(listingId, 2.0);
      alert(`Listing ${listingId} promoted at 2% ad rate.`);
    } catch (e) {
      alert(`Failed to promote: ${e.response?.data?.error || e.message}`);
    } finally {
      setPromoting(null);
    }
  }

  const filtered = listings.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.sku?.toLowerCase().includes(q) ||
      l.offerId?.toLowerCase().includes(q) ||
      l.listingDescription?.toLowerCase().includes(q)
    );
  });

  if (loading) return <LoadingSpinner message="Loading listings..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Active Listings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{listings.length} published listings with 30-day traffic</p>
        </div>
        <input
          type="text"
          placeholder="Search SKU or listing ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">SKU / Offer ID</th>
                  <th className="table-header">Price</th>
                  <th className="table-header">Qty</th>
                  <th className="table-header">Page Views (30d)</th>
                  <th className="table-header">CTR (30d)</th>
                  <th className="table-header">Conv. Rate (30d)</th>
                  <th className="table-header">Transactions (30d)</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((listing) => {
                  const t = traffic[listing.listingId] || {};
                  return (
                    <tr key={listing.offerId} className="hover:bg-gray-50 transition-colors">
                      <td className="table-cell">
                        <p className="font-medium text-gray-800 font-mono text-xs">{listing.sku || listing.offerId}</p>
                        {listing.listingId && (
                          <p className="text-xs text-blue-500 mt-0.5">{listing.listingId}</p>
                        )}
                      </td>
                      <td className="table-cell font-medium">
                        {fmt(listing.pricingSummary?.price?.value || 0)}
                      </td>
                      <td className="table-cell">
                        {listing.availableQuantity ?? '—'}
                      </td>
                      <td className="table-cell font-medium">
                        {t.pageViews != null ? t.pageViews.toLocaleString() : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="table-cell">
                        {t.clickThroughRate != null ? (
                          <span className={`font-medium ${t.clickThroughRate > 0.03 ? 'text-green-600' : t.clickThroughRate > 0.01 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {pct(t.clickThroughRate)}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="table-cell">
                        {t.salesConversionRate != null ? (
                          <span className={`font-medium ${t.salesConversionRate > 0.05 ? 'text-green-600' : t.salesConversionRate > 0.02 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {pct(t.salesConversionRate)}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="table-cell font-medium">
                        {t.transactions != null ? t.transactions : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => handlePromote(listing.listingId)}
                          disabled={promoting === listing.listingId || !listing.listingId}
                          className="text-xs px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors disabled:opacity-40"
                        >
                          {promoting === listing.listingId ? '…' : 'Promote 2%'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-12">
            {search ? 'No listings match your search.' : 'No active listings found.'}
          </p>
        )}
      </div>
    </div>
  );
}
