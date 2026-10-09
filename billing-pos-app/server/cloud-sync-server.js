const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 4000);
const DATA_FILE = path.join(__dirname, 'cloud-sync-data.json');

function ensureStoreFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ devices: [], syncRecords: [] }, null, 2));
  }
}

function loadStore() {
  ensureStoreFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { devices: [], syncRecords: [] };
  }
}

function saveStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { success: true, status: 'ok', service: 'vendexa-cloud-sync' });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/auth/device') {
      const body = await readBody(req);
      const store = loadStore();
      const existing = store.devices.find((d) => d.deviceId === body.deviceId);
      if (!existing) {
        store.devices.push({
          deviceId: body.deviceId,
          businessId: body.businessId,
          registeredAt: new Date().toISOString(),
        });
      }
      saveStore(store);
      sendJson(res, 201, { success: true, message: 'Device authenticated', deviceId: body.deviceId, businessId: body.businessId });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/sync') {
      const body = await readBody(req);
      const store = loadStore();
      store.syncRecords.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        receivedAt: new Date().toISOString(),
        ...body,
      });
      saveStore(store);
      sendJson(res, 200, { success: true, message: 'Sync accepted', recordCount: store.syncRecords.length });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/status') {
      const store = loadStore();
      sendJson(res, 200, { success: true, deviceCount: store.devices.length, syncRecordCount: store.syncRecords.length });
      return;
    }

    sendJson(res, 404, { success: false, error: 'Not found' });
  } catch (error) {
    sendJson(res, 400, { success: false, error: error.message || 'Bad request' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Cloud sync server listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
