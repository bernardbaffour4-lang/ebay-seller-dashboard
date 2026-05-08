const express = require('express');
const { ebayGet } = require('../services/ebayClient');

const router = express.Router();

function formatDate(d) {
  return d.toISOString().split('T')[0].replace(/-/g, '');
}

// Normalize the eBay traffic report into a flat array per listing
function parseTrafficReport(report) {
  if (!report?.records) return [];

  const metricHeaders = report.header?.metricHeaders?.map((h) => h.metricKey) || [];

  return report.records.map((record) => {
    const listingId = record.dimensionValues?.[0]?.value || 'unknown';
    const metrics = {};
    record.metricValues?.forEach((mv, i) => {
      metrics[metricHeaders[i] || i] = parseFloat(mv.value) || 0;
    });

    return {
      listingId,
      pageViews: metrics['PAGE_VIEW_IMPRESSION_COUNT'] || 0,
      clickThroughRate: metrics['CLICK_THROUGH_RATE'] || 0,
      salesConversionRate: metrics['SALES_CONVERSION_RATE'] || 0,
      transactions: metrics['TRANSACTION'] || 0,
      impressionsTotal: metrics['LISTING_IMPRESSION_TOTAL'] || 0,
    };
  });
}

// GET /api/analytics/traffic?days=30&listing_ids=id1,id2
router.get('/traffic', async (req, res) => {
  try {
    const { days = 30, listing_ids } = req.query;
    const end = new Date();
    const start = new Date(end - days * 24 * 60 * 60 * 1000);

    let filter = `date_range:[${formatDate(start)}..${formatDate(end)}]`;
    if (listing_ids) {
      const ids = listing_ids.split(',').join('|');
      filter += `,listing_ids:{${ids}}`;
    }

    const report = await ebayGet('/sell/analytics/v1/traffic_report', {
      dimension: 'LISTING',
      filter,
      metric: [
        'PAGE_VIEW_IMPRESSION_COUNT',
        'CLICK_THROUGH_RATE',
        'SALES_CONVERSION_RATE',
        'TRANSACTION',
        'LISTING_IMPRESSION_TOTAL',
      ].join(','),
    });

    res.json({
      period: { start: start.toISOString(), end: end.toISOString(), days: Number(days) },
      data: parseTrafficReport(report),
    });
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// GET /api/analytics/traffic/daily?days=30 — day-by-day aggregated traffic
router.get('/traffic/daily', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const end = new Date();
    const start = new Date(end - days * 24 * 60 * 60 * 1000);

    const filter = `date_range:[${formatDate(start)}..${formatDate(end)}]`;

    const report = await ebayGet('/sell/analytics/v1/traffic_report', {
      dimension: 'DAY',
      filter,
      metric: [
        'PAGE_VIEW_IMPRESSION_COUNT',
        'CLICK_THROUGH_RATE',
        'SALES_CONVERSION_RATE',
        'TRANSACTION',
      ].join(','),
    });

    const metricHeaders = report.header?.metricHeaders?.map((h) => h.metricKey) || [];
    const daily = report.records?.map((record) => {
      const date = record.dimensionValues?.[0]?.value || '';
      const metrics = {};
      record.metricValues?.forEach((mv, i) => {
        metrics[metricHeaders[i] || i] = parseFloat(mv.value) || 0;
      });
      return {
        date,
        pageViews: metrics['PAGE_VIEW_IMPRESSION_COUNT'] || 0,
        clickThroughRate: +(metrics['CLICK_THROUGH_RATE'] * 100).toFixed(2) || 0,
        salesConversionRate: +(metrics['SALES_CONVERSION_RATE'] * 100).toFixed(2) || 0,
        transactions: metrics['TRANSACTION'] || 0,
      };
    }) || [];

    res.json({ daily });
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
