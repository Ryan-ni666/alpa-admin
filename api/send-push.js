import jwt from 'jsonwebtoken';
import https from 'https';

const TEAM_ID = 'Q4DWG34M7G';
const KEY_ID = '9Y2L7H8ZS4';
const BUNDLE_ID = 'com.dakaola.alpa';
const SUPABASE_URL = 'https://rbeuqiargwkrphxxudkt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || 'sb_publishable_qwe9gPxpOq9B4jv773SiNA_yLdw1AIn';
const APNS_KEY = process.env.APNS_PRIVATE_KEY; // .p8 content stored as env var

function getAPNsToken() {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iss: TEAM_ID, iat: now },
    APNS_KEY,
    { algorithm: 'ES256', header: { alg: 'ES256', kid: KEY_ID } }
  );
}

function sendAPNs(deviceToken, title, body, apnsToken) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      aps: {
        alert: { title, body },
        sound: 'default',
        badge: 1
      }
    });

    const options = {
      hostname: 'api.push.apple.com', // production
      port: 443,
      path: `/3/device/${deviceToken}`,
      method: 'POST',
      headers: {
        'authorization': `bearer ${apnsToken}`,
        'apns-topic': BUNDLE_ID,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, token: deviceToken }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple auth check
  const authHeader = req.headers['x-admin-key'];
  if (authHeader !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, body: messageBody } = req.body;
  if (!title || !messageBody) {
    return res.status(400).json({ error: 'title and body required' });
  }

  if (!APNS_KEY) {
    return res.status(500).json({ error: 'APNS_PRIVATE_KEY not configured' });
  }

  try {
    // Fetch all device tokens from Supabase
    const tokensRes = await fetch(`${SUPABASE_URL}/rest/v1/devices?select=device_token`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    const devices = await tokensRes.json();

    if (!devices.length) {
      return res.status(200).json({ sent: 0, message: 'No devices registered' });
    }

    const apnsToken = getAPNsToken();
    const results = await Promise.allSettled(
      devices.map(d => sendAPNs(d.device_token, title, messageBody, apnsToken))
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
    const failed = results.length - sent;

    return res.status(200).json({ sent, failed, total: devices.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
