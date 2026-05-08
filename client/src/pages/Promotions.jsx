import { useEffect, useState } from 'react';
import { getPromotions, updatePromotionSettings, runAutoPromotion } from '../api/ebay';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

export default function Promotions() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState({ enabled: false, daysThreshold: 30, adRate: 2.0 });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await getPromotions();
      setData(res.data);
      setSettings({
        enabled: res.data.settings.enabled,
        daysThreshold: res.data.settings.daysThreshold,
        adRate: res.data.settings.adRate,
      });
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await updatePromotionSettings(settings);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRunNow() {
    setRunning(true);
    try {
      const res = await runAutoPromotion();
      alert(res.data.message);
      await load();
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setRunning(false);
    }
  }

  if (loading) return <LoadingSpinner message="Loading promotions..." />;
  if (error) return <ErrorMessage message={error} onRetry={load} />;

  const { campaigns = [], activeAds = [], settings: savedSettings } = data;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
        <p className="text-sm text-gray-500 mt-0.5">Auto-promotion settings and active promoted listings</p>
      </div>

      {/* Auto-Promotion Settings Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Auto-Promotion Rule</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Automatically promote listings that haven't sold after the threshold
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.enabled}
              onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Days Before Auto-Promote
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={settings.daysThreshold}
                onChange={(e) => setSettings((s) => ({ ...s, daysThreshold: Number(e.target.value) }))}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">days without a sale</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Ad Rate (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={20}
                step={0.1}
                value={settings.adRate}
                onChange={(e) => setSettings((s) => ({ ...s, adRate: Number(e.target.value) }))}
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">% of sale price (eBay CPS)</span>
            </div>
          </div>
        </div>

        {/* Status info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-5 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-gray-600">
            <span>
              Status: <span className={`font-semibold ${savedSettings?.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                {savedSettings?.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </span>
            <span>Threshold: <span className="font-semibold">{savedSettings?.daysThreshold} days</span></span>
            <span>Ad rate: <span className="font-semibold">{savedSettings?.adRate}%</span></span>
            <span>Last run: <span className="font-semibold">{savedSettings?.lastRun ? new Date(savedSettings.lastRun).toLocaleString() : 'Never'}</span></span>
            <span>Campaign ID: <span className="font-mono text-xs text-blue-600">{savedSettings?.campaignId || 'Not yet created'}</span></span>
          </div>
          <p className="text-xs text-gray-400 mt-2">Runs automatically every night at 2 AM.</p>
        </div>

        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          <button onClick={handleRunNow} disabled={running} className="btn-secondary">
            {running ? 'Running…' : 'Run Now'}
          </button>
        </div>
      </div>

      {/* Active Promoted Listings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Currently Promoted Listings</h2>
          <span className="badge-blue">{activeAds.length} ads</span>
        </div>
        {activeAds.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Ad ID</th>
                  <th className="table-header">Listing ID</th>
                  <th className="table-header">Bid %</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeAds.map((ad) => (
                  <tr key={ad.adId} className="hover:bg-gray-50">
                    <td className="table-cell font-mono text-xs">{ad.adId}</td>
                    <td className="table-cell font-mono text-xs text-blue-600">{ad.listingId}</td>
                    <td className="table-cell font-semibold">{ad.bidPercentage}%</td>
                    <td className="table-cell">
                      <span className={ad.adStatus === 'RUNNING' ? 'badge-green' : 'badge-yellow'}>
                        {ad.adStatus || 'UNKNOWN'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">No active promoted listings.</p>
            <p className="text-xs text-gray-300 mt-1">Enable auto-promotion or promote listings manually from the Listings page.</p>
          </div>
        )}
      </div>

      {/* All Campaigns */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">All eBay Ad Campaigns</h2>
        </div>
        {campaigns.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Campaign Name</th>
                  <th className="table-header">ID</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Start Date</th>
                  <th className="table-header">Bid %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaigns.map((c) => (
                  <tr key={c.campaignId} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{c.campaignName}</td>
                    <td className="table-cell font-mono text-xs">{c.campaignId}</td>
                    <td className="table-cell">
                      <span className={c.campaignStatus === 'RUNNING' ? 'badge-green' : c.campaignStatus === 'PAUSED' ? 'badge-yellow' : 'badge-red'}>
                        {c.campaignStatus}
                      </span>
                    </td>
                    <td className="table-cell">{c.startDate?.split('T')[0] || '—'}</td>
                    <td className="table-cell">{c.fundingStrategy?.bidPercentage ? `${c.fundingStrategy.bidPercentage}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10">No campaigns found.</p>
        )}
      </div>
    </div>
  );
}
