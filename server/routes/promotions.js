const express = require('express');
const { ebayGet, ebayPost } = require('../services/ebayClient');
const { loadSettings, saveSettings, runAutoPromotion } = require('../services/autoPromotion');

const router = express.Router();

// GET /api/promotions — list all ad campaigns + auto-promo settings
router.get('/', async (req, res) => {
  try {
    const settings = loadSettings();
    const campaignList = await ebayGet('/sell/marketing/v1/ad_campaign', { limit: 200 });

    let activeAds = [];
    if (settings.campaignId) {
      try {
        const ads = await ebayGet(
          `/sell/marketing/v1/ad_campaign/${settings.campaignId}/ad`,
          { limit: 500 }
        );
        activeAds = ads.ads || [];
      } catch {
        // campaign may have been deleted
      }
    }

    res.json({
      settings,
      campaigns: campaignList.campaigns || [],
      activeAds,
    });
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// GET /api/promotions/settings
router.get('/settings', (req, res) => {
  res.json(loadSettings());
});

// PUT /api/promotions/settings
router.put('/settings', (req, res) => {
  const current = loadSettings();
  const { enabled, daysThreshold, adRate } = req.body;
  const updated = {
    ...current,
    ...(enabled !== undefined && { enabled: Boolean(enabled) }),
    ...(daysThreshold !== undefined && { daysThreshold: Number(daysThreshold) }),
    ...(adRate !== undefined && { adRate: Number(adRate) }),
  };
  saveSettings(updated);
  res.json(updated);
});

// POST /api/promotions/run-now — manually trigger auto-promotion check
router.post('/run-now', async (req, res) => {
  try {
    await runAutoPromotion();
    res.json({ success: true, message: 'Auto-promotion check completed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/promotions/promote/:listingId — manually promote a single listing
router.post('/promote/:listingId', async (req, res) => {
  try {
    const settings = loadSettings();
    const { adRate = settings.adRate } = req.body;
    const { listingId } = req.params;

    // Ensure we have a campaign
    const { getOrCreateAutoCampaign } = require('../services/autoPromotion');

    // Get or create campaign - simplified inline version
    let campaignId = settings.campaignId;
    if (!campaignId) {
      const { runAutoPromotion: _, loadSettings: __, saveSettings: ___, ...rest } = require('../services/autoPromotion');
      // Fallback: use existing logic
      const campaign = await ebayPost('/sell/marketing/v1/ad_campaign', {
        campaignName: 'Auto-Promotion (30-day)',
        campaignStatus: 'RUNNING',
        startDate: new Date().toISOString().split('T')[0],
        fundingStrategy: {
          bidPercentage: String(adRate),
          fundingModel: 'COST_PER_SALE',
        },
        marketplaceId: process.env.EBAY_MARKETPLACE_ID || 'EBAY_US',
      });
      campaignId = campaign.campaignId;
      saveSettings({ ...settings, campaignId });
    }

    const result = await ebayPost(
      `/sell/marketing/v1/ad_campaign/${campaignId}/bulk_create_ads_by_listing_id`,
      {
        requests: [{ bidPercentage: String(adRate), listingId }],
      }
    );

    res.json({ success: true, result });
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
