const axios = require('axios');

const BASE = process.env.DELHIVERY_MODE === 'production'
  ? 'https://track.delhivery.com'
  : 'https://staging-express.delhivery.com';

const TOKEN = process.env.DELHIVERY_API_TOKEN;
const PICKUP_LOCATION = process.env.DELHIVERY_PICKUP_NAME;

const assertConfigured = () => {
  if (!TOKEN || TOKEN === 'undefined') {
    throw new Error('DELHIVERY_API_TOKEN is missing. Set it in your environment.');
  }
  if (!PICKUP_LOCATION || PICKUP_LOCATION === 'undefined') {
    throw new Error('DELHIVERY_PICKUP_NAME is missing. Set the Delhivery pickup location name in your environment.');
  }
};

const client = axios.create({
  baseURL: BASE,
  headers: {
    Authorization: `Token ${TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

const getFirstItem = (value) => {
  if (Array.isArray(value)) return value[0];
  if (value && typeof value === 'object') return value;
  return null;
};

const normalizePackage = (data) => {
  if (data === true || data === 'true') return null;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (err) { return null; }
  }
  if (!data || typeof data !== 'object') return null;

  return getFirstItem(data.packages)
    || getFirstItem(data.data?.packages)
    || getFirstItem(data.package)
    || getFirstItem(data.data?.package)
    || getFirstItem(data.Response?.Packages?.Package)
    || getFirstItem(data.response?.Packages?.Package)
    || getFirstItem(data.Response?.Package)
    || getFirstItem(data.response?.Package)
    || getFirstItem(data.data?.Response?.Packages?.Package)
    || getFirstItem(data.data?.response?.Packages?.Package)
    || getFirstItem(data.data?.Response?.Package)
    || getFirstItem(data.data?.response?.Package)
    || null;
};

const normalizeShipmentData = (data) => {
  return data?.ShipmentData?.length ? data.ShipmentData
    : data?.shipmentData?.length ? data.shipmentData
    : data?.data?.ShipmentData?.length ? data.data.ShipmentData
    : data?.data?.shipmentData?.length ? data.data.shipmentData
    : null;
};

const cleanPayload = (obj) => Object.entries(obj).reduce((acc, [key, value]) => {
  if (value === undefined || value === null || value === '') return acc;
  if (Array.isArray(value) && value.length === 0) return acc;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const nested = cleanPayload(value);
    if (Object.keys(nested).length === 0) return acc;
    acc[key] = nested;
    return acc;
  }
  acc[key] = value;
  return acc;
}, {});

// ── Create shipment (generate AWB) ───────────────────────────────────────────
const createShipment = async (order) => {
  assertConfigured();

  // Use today's date — Delhivery staging does NOT accept nested date/time objects
  const pickupDate = process.env.DELHIVERY_PICKUP_DATE || new Date().toISOString().split('T')[0];

  const shipment = {
    name: order.full_name,
    add: order.address,
    pin: String(order.pincode),
    city: order.city,
    state: order.state,
    country: 'India',
    phone: String(order.mobile),
    order: order.order_id,
    payment_mode: order.payment_status === 'paid' ? 'Prepaid' : 'COD',
    return_pin: process.env.DELHIVERY_RETURN_PINCODE || '392001',
    return_city: process.env.DELHIVERY_RETURN_CITY || 'BHARUCH',
    return_phone: process.env.DELHIVERY_RETURN_PHONE || '7984626447',
    return_name: 'NOREN',
    return_add: process.env.DELHIVERY_RETURN_ADDRESS || 'NOREN, BHARUCH, GUJARAT, 392001',
    return_state: process.env.DELHIVERY_RETURN_STATE || 'GUJARAT',
    return_country: 'India',
    products_desc: order.items?.map(i => i.title).join(', ') || 'Clothing',
    cod_amount: order.payment_status === 'paid' ? '0' : String(order.total),
    order_date: new Date(order.created_at).toISOString().split('T')[0],
    total_amount: String(order.total),
    seller_add: process.env.DELHIVERY_RETURN_ADDRESS || 'NOREN, BHARUCH, GUJARAT, 392001',
    seller_name: 'NOREN',
    seller_inv: order.order_id,
    quantity: String(order.items?.reduce((s, i) => s + i.quantity, 0) || 1),
    weight: '0.500',
    shipment_width: '15',
    shipment_height: '10',
    shipment_length: '20',
    shipping_mode: 'Surface',
    address_type: 'home',
    pickup_location: PICKUP_LOCATION,
  };

  // Only attach GST if it's a valid 15-char GSTIN — invalid values crash Delhivery's API
  const gst = (process.env.DELHIVERY_GST || '').trim();
  if (gst && gst.length === 15) {
    shipment.seller_gst_tin = gst;
  }

  const dataObj = {
    shipments: [shipment],
    pickup_location: { name: PICKUP_LOCATION },  // production expects an object, not a plain string
  };

  const cleanedData = cleanPayload(dataObj);
  const form = new URLSearchParams();
  form.set('format', 'json');
  form.set('data', JSON.stringify(cleanedData));

  // Log exact payload for debugging
  console.log('[Delhivery] Sending data:', JSON.stringify(cleanedData, null, 2));

  const res = await client.post('/api/cmu/create.json', form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  // Log raw response for debugging
  console.log('[Delhivery] Raw response:', JSON.stringify(res.data, null, 2));

  const pkg = normalizePackage(res.data);
  if (!pkg) {
    const messageParts = [];
    if (res.data === true || res.data === 'true') {
      messageParts.push('Unexpected boolean response from Delhivery');
    }
    if (res.data?.rmk) messageParts.push(res.data.rmk);
    if (res.data?.Error) messageParts.push(res.data.Error);
    if (res.data?.error && typeof res.data.error === 'string') messageParts.push(res.data.error);
    if (!messageParts.length) messageParts.push(JSON.stringify(res.data || {}));
    throw new Error(`No package returned from Delhivery: ${messageParts.join(' | ')}`);
  }
  if (pkg.status === 'Error' || pkg.status === 'error') {
    throw new Error(pkg.error_message || pkg.error || 'Delhivery error');
  }

  return {
    awb: pkg.waybill || pkg.waybill_number || pkg.awb || pkg.barcode,
    courier: 'Delhivery',
    status: 'processing',
  };
};

// ── Track shipment ────────────────────────────────────────────────────────────
const trackShipment = async (awb) => {
  assertConfigured();
  const res = await client.get(`/api/v1/packages/json/?waybill=${encodeURIComponent(awb)}&verbose=true`);
  const data = res.data;
  const shipmentData = normalizeShipmentData(data);
  if (!shipmentData) return null;

  const shipment = shipmentData[0].Shipment;
  const scans = shipment?.Scans || [];

  return {
    awb,
    status: shipment?.Status?.Status || shipment?.Status || 'processing',
    statusCode: shipment?.Status?.StatusCode || '',
    location: shipment?.Status?.StatusLocation || '',
    estimatedDelivery: shipment?.ExpectedDeliveryDate || null,
    scans: (scans || []).map(s => ({
      status: s.ScanDetail?.Scan || '',
      location: s.ScanDetail?.ScannedLocation || '',
      timestamp: s.ScanDetail?.ScanDateTime || '',
      instructions: s.ScanDetail?.Instructions || '',
    })).reverse(),
  };
};

// ── Cancel shipment ───────────────────────────────────────────────────────────
const cancelShipment = async (awb) => {
  assertConfigured();
  const form = new URLSearchParams();
  form.set('waybill', awb);
  form.set('cancellation', 'true');
  const res = await client.post('/api/p/edit', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
};

// ── Map Delhivery status to our internal stages ───────────────────────────────
const mapStatus = (delhiveryStatus) => {
  const s = (delhiveryStatus || '').toLowerCase();
  if (s.includes('delivered')) return 'delivered';
  if (s.includes('out for delivery') || s.includes('ofd')) return 'shipped';
  if (s.includes('in transit') || s.includes('transit')) return 'shipped';
  if (s.includes('picked up') || s.includes('pickup')) return 'processing';
  if (s.includes('manifested') || s.includes('booked')) return 'processing';
  if (s.includes('rto') || s.includes('return')) return 'refunded';
  if (s.includes('cancelled') || s.includes('cancel')) return 'cancelled';
  return 'processing';
};

module.exports = { createShipment, trackShipment, cancelShipment, mapStatus };
