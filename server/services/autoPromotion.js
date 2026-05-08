const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { ebayGet, ebayPost } = require('./ebayClient');

const SETTINGS_FILE = path.join(__dirname, '../promotion-settings.json');
const TRACKING_FILE = path.join(__dirname, '../listing-tracking.json');

const DEFAULT_SETTINGS = {
  enabled: false,
  daysThreshold: 30,
  adRate: 2.0,
  campaignId: null,
  lastRun: null,
};

function loadSettings() {
  if (fs.existsSync(SETTINGS_FILE)) {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
  return DEFAULT_SETTINGS;
}

function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function loadTracking() {
  if (fs.existsSync(TRACKING_FILE)) {
    return JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'));
  }
  return {};
}

function saveTracking(data) {
  fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2));
}

async function getOrCreateAutoCampaign(settings) {
  const adRate = settings.adRate.toFixed(1);

  // Check if we have a stored campaign that still exists
  if (settings.campaignId) {
    try {
      await ebayGet(`/sell/marketing/v1/ad_campaign/${settings.campaignId}`);
      return settings.campaignId;
    } catch {
      // Campaign no longer exists, create a new one
    }
  }

  // List campaigns to find an existing auto-promo one
  const campaignList = await ebayGet('/sell/marketing/v1/ad_campaign', { limit: 200 });
  const existing = campaignList.campaigns?.find(
    (c) => c.campaignName === 'Auto-Promotion (30-day)' && c.campaignStatus !== 'ENDED'
  );
  if (existing) {
    const updated = { ...settings, campaignId: existing.campaignId };
    saveSettings(updated);
    return existing.campaignId;
  }

  // Create new campaign
  const today = new Date().toISOString().split('T')[0];
  const campaign = await ebayPost('/sell/marketing/v1/ad_campaign', {
    campaignName: 'Auto-Promotion (30-day)',
    campaignStatus: 'RUNNING',
    startDate: today,
    fundingStrategy: {
      bidPercentage: adRate,
      fundingModel: 'COST_PER_SALE',
    },
    marketplaceId: process.env.EBAY_MARKETPLACE_ID || 'EBAY_US',
  });

  const updated = { ...settings, campaignId: campaign.campaignId };
  saveSettings(updated);
  return campaign.campaignId;
}

async function getExistingAdListingIds(campaignId) {
  try {
    const ads = await ebayGet(`/sell/marketing/v1/ad_campaign/${campaignId}/ad`, { limit: 500 });
    return new Set(ads.ads?.map((a) => a.listingId) || []);
  } catch {
    return new Set();
  }
}

async function getSoldListingIds(daysBack) {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const soldIds = new Set();
  let offset = 0;

  while (true) {
    const orders = await ebayGet('/sell/fulfillment/v1/order', {
      filter: `creationdate:[${since}..]`,
      limit: 200,
      offset,
    });

    orders.orders?.forEach((order) => {
      order.lineItems?.forEach((item) => {
        if (item.listingId) soldIds.add(item.listingId);
      });
    });

    if (!orders.orders || orders.orders.length < 200) break;
    offset += 200;
  }

  return soldIds;
}

async function runAutoPromotion() {
  const settings = loadSettings();
  if (!settings.enabled) return;

  console.log('[AutoPromotion] Running auto-promotion check...');

  try {
    const tracking = loadTracking();
    const now = new Date();
    const thresholdMs = settings.daysThreshold * 24 * 60 * 60 * 1000;

    // Fetch all published offers
    let offers = [];
    let offset = 0;
    while (true) {
      const page = await ebayGet('/sell/inventory/v1/offer', {
        status: 'PUBLISHED',
        limit: 200,
        offset,
      });
      if (!page.offers?.length) break;
      offers = offers.concat(page.offers);
      if (page.offers.length < 200) break;
      offset += 200;
    }

    // Update tracking: record when each listing was first seen
    const updatedTracking = { ...tracking };
    offers.forEach((offer) => {
      const id = offer.offerId;
      if (!updatedTracking[id]) {
        updatedTracking[id] = { firstSeen: now.toISOString(), listingId: offer.listingId };
      }
    });
    saveTracking(updatedTracking);

    // Find listings older than threshold days
    const soldIds = await getSoldListingIds(settings.daysThreshold);
    const toPromote = offers.filter((offer) => {
      const tracked = updatedTracking[offer.offerId];
      if (!tracked) return false;
      const age = now - new Date(tracked.firstSeen);
      return age >= thresholdMs && !soldIds.has(offer.listingId);
    });

    if (!toPromote.length) {
      console.log('[AutoPromotion] No listings qualify for promotion.');
      settings.lastRun = now.toISOString();
      saveSettings(settings);
      return;
    }

    const campaignId = await getOrCreateAutoCampaign(settings);
    const alreadyPromoted = await getExistingAdListingIds(campaignId);
    const newPromotions = toPromote.filter((o) => !alreadyPromoted.has(o.listingId));

    if (!newPromotions.length) {
      console.log('[AutoPromotion] All qualifying listings are already promoted.');
    } else {
      const adBatch = newPromotions.map((o) => ({
        bidPercentage: settings.adRate.toFixed(1),
        listingId: o.listingId,
      }));

      await ebayPost(`/sell/marketing/v1/ad_campaign/${campaignId}/bulk_create_ads_by_listing_id`, {
        requests: adBatch,
      });
      console.log(`[AutoPromotion] Promoted ${newPromotions.length} listing(s) at ${settings.adRate}%`);
    }

    settings.lastRun = now.toISOString();
    saveSettings(settings);
  } catch (err) {
    console.error('[AutoPromotion] Error:', err.response?.data || err.message);
  }
}

function startAutoPromotion() {
  // Run daily at 2 AM
  cron.schedule('0 2 * * *', runAutoPromotion);
  console.log('[AutoPromotion] Scheduler started — runs daily at 2 AM');
}

module.exports = { startAutoPromotion, runAutoPromotion, loadSettings, saveSettings };
