import { getAuthUrl } from '../api/ebay';

export default function ConnectBanner() {
  async function handleConnect() {
    const { data } = await getAuthUrl();
    window.location.href = data.authUrl;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full py-32 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">Connect Your eBay Account</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Authorize this dashboard to access your eBay seller data — listings, traffic, sales, and promotions.
        </p>
      </div>
      <button onClick={handleConnect} className="btn-primary px-6 py-2.5 text-base">
        Connect with eBay
      </button>
    </div>
  );
}
