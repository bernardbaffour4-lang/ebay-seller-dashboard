import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import ConnectBanner from './components/ConnectBanner';
import Dashboard from './pages/Dashboard';
import Listings from './pages/Listings';
import Analytics from './pages/Analytics';
import Sales from './pages/Sales';
import Promotions from './pages/Promotions';
import { getAuthStatus } from './api/ebay';

export default function App() {
  const [connected, setConnected] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Handle eBay OAuth callback params
    const params = new URLSearchParams(location.search);
    if (params.get('connected') === 'true') {
      setConnected(true);
      navigate('/', { replace: true });
      return;
    }
    if (params.get('error')) {
      alert(`eBay connection error: ${params.get('error')}`);
      navigate('/', { replace: true });
    }
  }, []);

  useEffect(() => {
    getAuthStatus()
      .then((r) => setConnected(r.data.connected))
      .catch(() => setConnected(false));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar connected={!!connected} />
      <main className="flex-1 overflow-y-auto">
        {connected === null ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : !connected ? (
          <ConnectBanner />
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/listings" element={<Listings />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/promotions" element={<Promotions />} />
          </Routes>
        )}
      </main>
    </div>
  );
}
