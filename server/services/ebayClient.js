const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TOKEN_FILE = path.join(__dirname, '../tokens.json');

const EBAY_BASE_URL = process.env.EBAY_ENVIRONMENT === 'sandbox'
  ? 'https://api.sandbox.ebay.com'
  : 'https://api.ebay.com';

const EBAY_AUTH_URL = process.env.EBAY_ENVIRONMENT === 'sandbox'
  ? 'https://auth.sandbox.ebay.com'
  : 'https://auth.ebay.com';

function loadTokens() {
  if (fs.existsSync(TOKEN_FILE)) {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  }
  return null;
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

async function refreshAccessToken() {
  const tokens = loadTokens();
  if (!tokens?.refresh_token) throw new Error('No refresh token — please reconnect your eBay account.');

  const credentials = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString('base64');

  const response = await axios.post(
    `${EBAY_AUTH_URL}/identity/v1/oauth2/token`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const newTokens = {
    ...tokens,
    access_token: response.data.access_token,
    expires_at: Date.now() + response.data.expires_in * 1000,
  };
  saveTokens(newTokens);
  return newTokens.access_token;
}

async function getAccessToken() {
  const tokens = loadTokens();
  if (!tokens) throw new Error('Not authenticated. Please connect your eBay account.');
  if (Date.now() >= tokens.expires_at - 60000) return refreshAccessToken();
  return tokens.access_token;
}

async function ebayGet(endpoint, params = {}, extraHeaders = {}) {
  const token = await getAccessToken();
  const response = await axios.get(`${EBAY_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': process.env.EBAY_MARKETPLACE_ID || 'EBAY_US',
      ...extraHeaders,
    },
    params,
  });
  return response.data;
}

async function ebayPost(endpoint, data = {}, extraHeaders = {}) {
  const token = await getAccessToken();
  const response = await axios.post(`${EBAY_BASE_URL}${endpoint}`, data, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-EBAY-C-MARKETPLACE-ID': process.env.EBAY_MARKETPLACE_ID || 'EBAY_US',
      ...extraHeaders,
    },
  });
  return response.data;
}

async function ebayDelete(endpoint, extraHeaders = {}) {
  const token = await getAccessToken();
  const response = await axios.delete(`${EBAY_BASE_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': process.env.EBAY_MARKETPLACE_ID || 'EBAY_US',
      ...extraHeaders,
    },
  });
  return response.data;
}

module.exports = {
  ebayGet,
  ebayPost,
  ebayDelete,
  getAccessToken,
  loadTokens,
  saveTokens,
  EBAY_BASE_URL,
  EBAY_AUTH_URL,
};
