const express = require('express');
const axios = require('axios');
const { saveTokens, loadTokens, EBAY_AUTH_URL } = require('../services/ebayClient');

const router = express.Router();

const SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.analytics.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.marketing',
  'https://api.ebay.com/oauth/api_scope/sell.marketing.readonly',
].join(' ');

router.get('/connect', (req, res) => {
  const authUrl =
    `${EBAY_AUTH_URL}/oauth2/authorize` +
    `?client_id=${process.env.EBAY_CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(process.env.EBAY_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}`;
  res.json({ authUrl });
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('http://localhost:5173?error=no_code');

  const credentials = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString('base64');

  try {
    const response = await axios.post(
      `${EBAY_AUTH_URL}/identity/v1/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.EBAY_REDIRECT_URI,
      }),
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    saveTokens({
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_at: Date.now() + response.data.expires_in * 1000,
    });

    res.redirect('http://localhost:5173?connected=true');
  } catch (err) {
    console.error('Auth error:', err.response?.data || err.message);
    res.redirect('http://localhost:5173?error=auth_failed');
  }
});

router.get('/status', (req, res) => {
  const tokens = loadTokens();
  res.json({ connected: !!(tokens?.access_token) });
});

router.post('/disconnect', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const tokenFile = path.join(__dirname, '../tokens.json');
  if (fs.existsSync(tokenFile)) fs.unlinkSync(tokenFile);
  res.json({ success: true });
});

module.exports = router;
