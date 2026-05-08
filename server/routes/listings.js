const express = require('express');
const { ebayGet } = require('../services/ebayClient');

const router = express.Router();

// GET /api/listings — all published offers/listings
router.get('/', async (req, res) => {
  try {
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

    res.json({ offers, total: offers.length });
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// GET /api/listings/:listingId — single listing details
router.get('/:listingId', async (req, res) => {
  try {
    const data = await ebayGet(`/sell/inventory/v1/offer/${req.params.listingId}`);
    res.json(data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
