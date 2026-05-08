const express = require('express');
const { ebayGet } = require('../services/ebayClient');

const router = express.Router();

// Fetch all orders within a date range, handling pagination
async function fetchOrders(since) {
  let orders = [];
  let offset = 0;

  while (true) {
    const page = await ebayGet('/sell/fulfillment/v1/order', {
      filter: `creationdate:[${since}..]`,
      limit: 200,
      offset,
    });
    if (!page.orders?.length) break;
    orders = orders.concat(page.orders);
    if (page.orders.length < 200) break;
    offset += 200;
  }
  return orders;
}

// Aggregate orders by day
function groupByDay(orders) {
  const map = {};
  orders.forEach((order) => {
    const day = order.creationDate?.split('T')[0];
    if (!day) return;
    if (!map[day]) map[day] = { date: day, revenue: 0, orders: 0, units: 0 };
    map[day].orders += 1;
    map[day].units += order.lineItems?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
    map[day].revenue += parseFloat(order.pricingSummary?.total?.value || 0);
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

// Aggregate by listing to find best sellers
function groupByListing(orders) {
  const map = {};
  orders.forEach((order) => {
    order.lineItems?.forEach((item) => {
      const id = item.listingId || item.legacyItemId || 'unknown';
      if (!map[id]) {
        map[id] = {
          listingId: id,
          title: item.title || 'Unknown',
          revenue: 0,
          units: 0,
          orders: 0,
          imageUrl: item.image?.imageUrl || null,
        };
      }
      map[id].units += item.quantity || 0;
      map[id].orders += 1;
      map[id].revenue += parseFloat(item.lineItemCost?.value || 0) * (item.quantity || 1);
    });
  });
  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}

// GET /api/sales?days=90
router.get('/', async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || 90, 730);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const orders = await fetchOrders(since);
    const daily = groupByDay(orders);

    const totalRevenue = orders.reduce(
      (s, o) => s + parseFloat(o.pricingSummary?.total?.value || 0),
      0
    );
    const totalUnits = orders.reduce(
      (s, o) => s + (o.lineItems?.reduce((si, i) => si + (i.quantity || 0), 0) || 0),
      0
    );

    res.json({
      summary: {
        totalOrders: orders.length,
        totalRevenue: +totalRevenue.toFixed(2),
        totalUnits,
        avgOrderValue: orders.length ? +(totalRevenue / orders.length).toFixed(2) : 0,
      },
      daily,
      orders: orders.slice(0, 100), // recent 100 raw orders
    });
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

// GET /api/sales/top-sellers?days=365
router.get('/top-sellers', async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || 365, 730);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const orders = await fetchOrders(since);
    const byListing = groupByListing(orders);

    res.json({
      period: { days },
      topSellers: byListing.slice(0, 50),
    });
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
});

module.exports = router;
