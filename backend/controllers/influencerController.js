'use strict';

const { pool, logAudit } = require('../config/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { fetchGeoLocation } = require('../services/sessionService');

// ── Helpers ────────────────────────────────────────────────────────────────
function getIP(req) {
  const cf   = req.headers['cf-connecting-ip'];
  const fwd  = req.headers['x-forwarded-for'];
  const real = req.headers['x-real-ip'];
  let ip = cf || (fwd ? fwd.split(',')[0].trim() : null) || real || req.socket?.remoteAddress || '';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  return ip.slice(0, 60);
}

function parseUA(ua = '') {
  let device_type = 'desktop';
  if (/tablet|ipad/i.test(ua))                    device_type = 'tablet';
  else if (/mobile|android|iphone|ipod/i.test(ua)) device_type = 'mobile';
  let device_model = null;
  const iphoneM = ua.match(/iPhone OS ([0-9_]+)/i);
  if (iphoneM) {
    const maj = parseInt(iphoneM[1]);
    device_model = maj >= 17 ? 'iPhone 15/16' : maj >= 16 ? 'iPhone 14/15' : maj >= 15 ? 'iPhone 13/14' : 'iPhone';
  } else if (/iPad/i.test(ua))   { device_model = 'iPad'; }
  else if (/Windows/i.test(ua))  { device_model = 'Windows PC'; }
  else if (/Macintosh/i.test(ua)){ device_model = 'Mac'; }
  let browser = 'Other';
  for (const [n, re] of [['Edge',/Edg\//i],['Chrome',/Chrome\//i],['Firefox',/Firefox\//i],['Safari',/Version\/.*Safari/i],['Samsung',/SamsungBrowser\//i]]) {
    if (re.test(ua)) { browser = n; break; }
  }
  let os = 'Unknown';
  if (/Windows NT 10/i.test(ua))    os = 'Windows 10/11';
  else if (/Windows/i.test(ua))     os = 'Windows';
  else if (/Android ([0-9]+)/i.test(ua)) os = `Android ${ua.match(/Android ([0-9]+)/i)[1]}`;
  else if (/iPhone OS/i.test(ua))   os = 'iOS';
  else if (/Mac OS X/i.test(ua))    os = 'macOS';
  else if (/Linux/i.test(ua))       os = 'Linux';
  return { device_type, device_model, browser, os };
}

function genUID(prefix='') { return prefix + crypto.randomBytes(10).toString('hex'); }
function genSlug()  { return crypto.randomBytes(6).toString('hex'); } // 12 chars
function genRef()   { return 'INF' + crypto.randomBytes(8).toString('hex').toUpperCase().slice(0,9); }

// Decimal-safe multiply — avoids floating point drift
function calcCommission(total, type, rate) {
  const T = Math.round(parseFloat(total) * 100);
  const R = parseFloat(rate);
  if (type === 'fixed') return Math.round(R * 100) / 100;
  return Math.round(T * R) / 10000;
}

async function infAudit(db, actorId, actorRole, action, resourceType, resourceId, ip, ua, before, after, reqId) {
  await db.query(
    `INSERT INTO src_inf_audit_logs
       (actor_id, actor_role, action, resource_type, resource_id, ip_address, user_agent, before_value, after_value, request_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [actorId||null, actorRole||null, action, resourceType||null, resourceId ? String(resourceId) : null,
     ip||null, (ua||'').slice(0,300), before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, reqId||null]
  ).catch(e => console.error('infAudit err:', e.message));
}


// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN: Influencer CRUD
// ══════════════════════════════════════════════════════════════════════════════

const createInfluencer = async (req, res) => {
  const {
    name, email, phone, username, password, display_name, category, niche, location, bio,
    commission_type='percentage', commission_rate=0, status='active', agreement_status='pending',
    contract_start_date, contract_end_date, notes, admin_notes,
    payment_method, payment_details={}, tax_info={},
    social_profiles=[], assigned_campaigns=[]
  } = req.body;

  if (!name || !email || !password) return res.status(400).json({ message: 'name, email and password are required' });
  const ip = getIP(req); const ua = req.headers['user-agent'] || '';
  const reqId = genUID();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const exists = await client.query('SELECT id FROM src_users WHERE email=$1', [email]);
    if (exists.rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'Email already registered' }); }

    // If username provided, check uniqueness
    if (username) {
      const uCheck = await client.query('SELECT id FROM src_inf_profiles WHERE username=$1', [username]);
      if (uCheck.rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'Username already taken' }); }
    }

    const hash = await bcrypt.hash(password, 12);
    const userRes = await client.query(
      `INSERT INTO src_users (name, email, password, phone, role) VALUES ($1,$2,$3,$4,'influencer') RETURNING id, name, email, role`,
      [name, email, hash, phone || null]
    );
    const user = userRes.rows[0];

    const profile_photo = req.file?.path || null;

    const profRes = await client.query(
      `INSERT INTO src_inf_profiles
         (user_id, display_name, username, category, niche, location, bio, profile_photo,
          commission_type, commission_rate, status, agreement_status,
          contract_start_date, contract_end_date, notes, admin_notes,
          payment_method, payment_details, tax_info, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [user.id, display_name||name, username||null, category||null, niche||null,
       location||null, bio||null, profile_photo,
       commission_type, commission_rate, status, agreement_status,
       contract_start_date||null, contract_end_date||null,
       notes||null, admin_notes||null, payment_method||null,
       JSON.stringify(payment_details), JSON.stringify(tax_info), req.user.id]
    );
    const profile = profRes.rows[0];

    // Social profiles
    for (const sp of social_profiles) {
      if (!sp.platform) continue;
      await client.query(
        `INSERT INTO src_inf_social_profiles (influencer_id, platform, handle, url, followers_count)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (influencer_id, platform) DO UPDATE SET handle=$3, url=$4, followers_count=$5`,
        [profile.id, sp.platform, sp.handle||null, sp.url||null, sp.followers_count||0]
      );
    }

    // Campaign assignments
    for (const cid of assigned_campaigns) {
      await client.query(
        `INSERT INTO src_inf_campaign_influencers (campaign_id, influencer_id, assigned_by)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [cid, profile.id, req.user.id]
      );
    }

    await client.query('COMMIT');

    await infAudit(pool, req.user.id, req.user.role, 'INFLUENCER_CREATED', 'influencer', profile.id, ip, ua, null, { user_id: user.id, email, name }, reqId);

    res.status(201).json({ message: 'Influencer created', user, profile });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createInfluencer:', err.message);
    res.status(500).json({ message: err.message });
  } finally { client.release(); }
};


const listInfluencers = async (req, res) => {
  const { page=1, limit=20, search, status, fraud_status, sort='newest' } = req.query;
  const offset = (page-1) * limit;
  const conds = []; const vals = []; let idx = 1;
  if (search) {
    conds.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR p.username ILIKE $${idx} OR p.display_name ILIKE $${idx})`);
    vals.push(`%${search}%`); idx++;
  }
  if (status) { conds.push(`p.status=$${idx}`); vals.push(status); idx++; }
  if (fraud_status) { conds.push(`p.fraud_status=$${idx}`); vals.push(fraud_status); idx++; }
  const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
  const orderMap = { newest:'p.created_at DESC', oldest:'p.created_at ASC', revenue:'p.total_revenue DESC', orders:'p.total_orders DESC' };
  const orderBy = orderMap[sort] || 'p.created_at DESC';
  vals.push(limit, offset);
  try {
    const { rows } = await pool.query(
      `SELECT p.*, u.name, u.email, u.phone, u.is_banned, u.created_at as user_created_at,
              (SELECT json_agg(json_build_object('platform',sp.platform,'handle',sp.handle,'url',sp.url))
               FROM src_inf_social_profiles sp WHERE sp.influencer_id=p.id) as social_profiles
       FROM src_inf_profiles p
       JOIN src_users u ON u.id=p.user_id
       ${where}
       ORDER BY ${orderBy} LIMIT $${idx} OFFSET $${idx+1}`,
      vals
    );
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_inf_profiles p JOIN src_users u ON u.id=p.user_id ${where}`,
      vals.slice(0, -2)
    );
    res.json({ influencers: rows, total: parseInt(countRes.rows[0].count), page: Number(page), limit: Number(limit) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getInfluencer = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, u.name, u.email, u.phone, u.is_banned, u.avatar_url, u.created_at as user_created_at,
              (SELECT json_agg(json_build_object('platform',sp.platform,'handle',sp.handle,'url',sp.url,'followers_count',sp.followers_count))
               FROM src_inf_social_profiles sp WHERE sp.influencer_id=p.id) as social_profiles,
              (SELECT json_agg(json_build_object('id',c.id,'name',c.name,'status',c.status,'commission_type',ci.commission_type,'commission_rate',ci.commission_rate))
               FROM src_inf_campaign_influencers ci
               JOIN src_inf_campaigns c ON c.id=ci.campaign_id
               WHERE ci.influencer_id=p.id AND ci.status='active') as campaigns
       FROM src_inf_profiles p
       JOIN src_users u ON u.id=p.user_id
       WHERE p.id=$1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Influencer not found' });
    // Strip payment_details for non-super-admins if needed
    const prof = rows[0];
    if (req.user.role !== 'super_admin') delete prof.payment_details;
    res.json(prof);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateInfluencer = async (req, res) => {
  const ip = getIP(req); const ua = req.headers['user-agent']||''; const reqId = genUID();
  const { id } = req.params;
  const {
    display_name, username, category, niche, location, bio,
    commission_type, commission_rate, status, agreement_status,
    contract_start_date, contract_end_date, notes, admin_notes,
    payment_method, payment_details, tax_info, social_profiles, reason
  } = req.body;

  if (!reason) return res.status(400).json({ message: 'A reason is required for updates' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT * FROM src_inf_profiles WHERE id=$1', [id]);
    if (!existing.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Influencer not found' }); }
    const before = existing.rows[0];

    if (username && username !== before.username) {
      const uCheck = await client.query('SELECT id FROM src_inf_profiles WHERE username=$1 AND id!=$2', [username, id]);
      if (uCheck.rows.length) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'Username taken' }); }
    }

    const profile_photo = req.file?.path || before.profile_photo;
    const fields = []; const vals = []; let idx = 1;
    const set = (f, v) => { if (v !== undefined) { fields.push(`${f}=$${idx++}`); vals.push(v); } };
    set('display_name', display_name); set('username', username); set('category', category);
    set('niche', niche); set('location', location); set('bio', bio);
    set('commission_type', commission_type); set('commission_rate', commission_rate);
    set('status', status); set('agreement_status', agreement_status);
    set('contract_start_date', contract_start_date||null); set('contract_end_date', contract_end_date||null);
    set('notes', notes); set('admin_notes', admin_notes);
    set('payment_method', payment_method);
    if (payment_details !== undefined) { fields.push(`payment_details=$${idx++}`); vals.push(JSON.stringify(payment_details)); }
    if (tax_info !== undefined) { fields.push(`tax_info=$${idx++}`); vals.push(JSON.stringify(tax_info)); }
    set('profile_photo', profile_photo);
    fields.push(`updated_at=NOW()`);

    if (fields.length > 1) {
      vals.push(id);
      await client.query(`UPDATE src_inf_profiles SET ${fields.join(',')} WHERE id=$${idx}`, vals);
    }

    if (social_profiles) {
      for (const sp of social_profiles) {
        if (!sp.platform) continue;
        await client.query(
          `INSERT INTO src_inf_social_profiles (influencer_id, platform, handle, url, followers_count)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (influencer_id, platform) DO UPDATE SET handle=$3, url=$4, followers_count=$5`,
          [id, sp.platform, sp.handle||null, sp.url||null, sp.followers_count||0]
        );
      }
    }

    // Update user ban status if status changed to suspended
    if (status === 'suspended') {
      await client.query('UPDATE src_users SET is_banned=TRUE WHERE id=(SELECT user_id FROM src_inf_profiles WHERE id=$1)', [id]);
    } else if (status === 'active') {
      await client.query('UPDATE src_users SET is_banned=FALSE WHERE id=(SELECT user_id FROM src_inf_profiles WHERE id=$1)', [id]);
    }

    await client.query('COMMIT');
    await infAudit(pool, req.user.id, req.user.role, 'INFLUENCER_UPDATED', 'influencer', id, ip, ua, before, { status, commission_rate, reason }, reqId);
    res.json({ message: 'Influencer updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally { client.release(); }
};


// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN: Campaign CRUD
// ══════════════════════════════════════════════════════════════════════════════

const createCampaign = async (req, res) => {
  const { name, description, status='draft', start_date, end_date, budget, commission_type='percentage',
          commission_rate=0, target_product_ids=[], target_category_ids=[], terms, notes, influencer_ids=[] } = req.body;
  if (!name) return res.status(400).json({ message: 'Campaign name is required' });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,200) + '-' + genSlug();
  const ip = getIP(req); const ua = req.headers['user-agent']||''; const reqId = genUID();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO src_inf_campaigns
         (name, slug, description, status, start_date, end_date, budget, commission_type, commission_rate,
          target_product_ids, target_category_ids, terms, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [name, slug, description||null, status, start_date||null, end_date||null, budget||null,
       commission_type, commission_rate, target_product_ids, target_category_ids,
       terms||null, notes||null, req.user.id]
    );
    const camp = rows[0];
    for (const iid of influencer_ids) {
      await client.query(
        `INSERT INTO src_inf_campaign_influencers (campaign_id, influencer_id, assigned_by)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [camp.id, iid, req.user.id]
      );
    }
    await client.query('COMMIT');
    await infAudit(pool, req.user.id, req.user.role, 'CAMPAIGN_CREATED', 'campaign', camp.id, ip, ua, null, { name, status }, reqId);
    res.status(201).json({ message: 'Campaign created', campaign: camp });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally { client.release(); }
};

const listCampaigns = async (req, res) => {
  const { page=1, limit=20, search, status } = req.query;
  const offset = (page-1)*limit;
  const conds = []; const vals = []; let idx = 1;
  if (search) { conds.push(`c.name ILIKE $${idx}`); vals.push(`%${search}%`); idx++; }
  if (status) { conds.push(`c.status=$${idx}`); vals.push(status); idx++; }
  const where = conds.length ? 'WHERE '+conds.join(' AND ') : '';
  vals.push(limit, offset);
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM src_inf_campaign_influencers ci WHERE ci.campaign_id=c.id AND ci.status='active') as influencer_count,
              (SELECT COUNT(*) FROM src_inf_links l WHERE l.campaign_id=c.id AND l.deleted_at IS NULL) as link_count,
              (SELECT COALESCE(SUM(total_clicks),0) FROM src_inf_links l WHERE l.campaign_id=c.id) as total_clicks,
              (SELECT COALESCE(SUM(total_orders),0) FROM src_inf_links l WHERE l.campaign_id=c.id) as total_orders,
              (SELECT COALESCE(SUM(total_revenue),0) FROM src_inf_links l WHERE l.campaign_id=c.id) as total_revenue
       FROM src_inf_campaigns c ${where} ORDER BY c.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
      vals
    );
    const cnt = await pool.query(`SELECT COUNT(*) FROM src_inf_campaigns c ${where}`, vals.slice(0,-2));
    res.json({ campaigns: rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getCampaign = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
              (SELECT json_agg(json_build_object('id',p.id,'name',u.name,'email',u.email,'status',ci.status))
               FROM src_inf_campaign_influencers ci
               JOIN src_inf_profiles p ON p.id=ci.influencer_id
               JOIN src_users u ON u.id=p.user_id
               WHERE ci.campaign_id=c.id) as influencers
       FROM src_inf_campaigns c WHERE c.id=$1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Campaign not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateCampaign = async (req, res) => {
  const { name, description, status, start_date, end_date, budget, commission_type, commission_rate,
          target_product_ids, target_category_ids, terms, notes, reason } = req.body;
  if (!reason) return res.status(400).json({ message: 'Reason required' });
  const ip = getIP(req); const ua = req.headers['user-agent']||''; const reqId = genUID();
  try {
    const existing = await pool.query('SELECT * FROM src_inf_campaigns WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Campaign not found' });
    const before = existing.rows[0];
    const fields = []; const vals = []; let idx = 1;
    const set = (f,v) => { if (v!==undefined){fields.push(`${f}=$${idx++}`);vals.push(v);} };
    set('name',name); set('description',description); set('status',status);
    set('start_date',start_date||null); set('end_date',end_date||null); set('budget',budget);
    set('commission_type',commission_type); set('commission_rate',commission_rate);
    if (target_product_ids) { fields.push(`target_product_ids=$${idx++}`); vals.push(target_product_ids); }
    if (target_category_ids) { fields.push(`target_category_ids=$${idx++}`); vals.push(target_category_ids); }
    set('terms',terms); set('notes',notes);
    fields.push('updated_at=NOW()');
    vals.push(req.params.id);
    await pool.query(`UPDATE src_inf_campaigns SET ${fields.join(',')} WHERE id=$${idx}`, vals);
    await infAudit(pool, req.user.id, req.user.role, 'CAMPAIGN_UPDATED', 'campaign', req.params.id, ip, ua, before, { status, reason }, reqId);
    res.json({ message: 'Campaign updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};


// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN: Tracking Links
// ══════════════════════════════════════════════════════════════════════════════

const createLink = async (req, res) => {
  const { influencer_id, campaign_id, name, destination, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = req.body;
  if (!influencer_id || !name || !destination) return res.status(400).json({ message: 'influencer_id, name and destination are required' });
  const ip = getIP(req); const ua = req.headers['user-agent']||''; const reqId = genUID();
  try {
    // Verify influencer exists
    const infCheck = await pool.query('SELECT id FROM src_inf_profiles WHERE id=$1', [influencer_id]);
    if (!infCheck.rows.length) return res.status(404).json({ message: 'Influencer not found' });

    // Build destination with UTM params
    let dest = destination.trim();
    try {
      const url = new URL(dest);
      if (utm_source)   url.searchParams.set('utm_source',   utm_source);
      if (utm_medium)   url.searchParams.set('utm_medium',   utm_medium);
      if (utm_campaign) url.searchParams.set('utm_campaign', utm_campaign);
      if (utm_content)  url.searchParams.set('utm_content',  utm_content);
      if (utm_term)     url.searchParams.set('utm_term',     utm_term);
      dest = url.toString();
    } catch {}

    let slug, ref_code, attempts = 0;
    // Ensure unique slug and ref_code
    while (attempts < 10) {
      slug = genSlug(); ref_code = genRef();
      const check = await pool.query('SELECT id FROM src_inf_links WHERE slug=$1 OR ref_code=$2', [slug, ref_code]);
      if (!check.rows.length) break;
      attempts++;
    }

    const { rows } = await pool.query(
      `INSERT INTO src_inf_links
         (influencer_id, campaign_id, name, slug, destination, utm_source, utm_medium, utm_campaign, utm_content, utm_term, ref_code, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [influencer_id, campaign_id||null, name, slug, dest,
       utm_source||null, utm_medium||null, utm_campaign||null, utm_content||null, utm_term||null,
       ref_code, req.user.id]
    );
    await infAudit(pool, req.user.id, req.user.role, 'UTM_LINK_CREATED', 'link', rows[0].id, ip, ua, null, { influencer_id, name, slug, ref_code }, reqId);
    res.status(201).json({ link: rows[0] });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const listLinks = async (req, res) => {
  const { page=1, limit=50, influencer_id, campaign_id, search, is_active } = req.query;
  const offset = (page-1)*limit;
  const conds = ['l.deleted_at IS NULL']; const vals = []; let idx = 1;
  if (influencer_id) { conds.push(`l.influencer_id=$${idx}`); vals.push(influencer_id); idx++; }
  if (campaign_id)   { conds.push(`l.campaign_id=$${idx}`);   vals.push(campaign_id);   idx++; }
  if (search)        { conds.push(`l.name ILIKE $${idx}`);     vals.push(`%${search}%`); idx++; }
  if (is_active !== undefined) { conds.push(`l.is_active=$${idx}`); vals.push(is_active === 'true'); idx++; }
  const where = 'WHERE ' + conds.join(' AND ');
  vals.push(limit, offset);
  try {
    const { rows } = await pool.query(
      `SELECT l.*, p.display_name as influencer_name, u.email as influencer_email,
              c.name as campaign_name
       FROM src_inf_links l
       JOIN src_inf_profiles p ON p.id=l.influencer_id
       JOIN src_users u ON u.id=p.user_id
       LEFT JOIN src_inf_campaigns c ON c.id=l.campaign_id
       ${where} ORDER BY l.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
      vals
    );
    const cnt = await pool.query(
      `SELECT COUNT(*) FROM src_inf_links l JOIN src_inf_profiles p ON p.id=l.influencer_id JOIN src_users u ON u.id=p.user_id LEFT JOIN src_inf_campaigns c ON c.id=l.campaign_id ${where}`,
      vals.slice(0,-2)
    );
    res.json({ links: rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const toggleLink = async (req, res) => {
  const ip = getIP(req); const ua = req.headers['user-agent']||''; const reqId = genUID();
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ message: 'Reason required' });
  try {
    const { rows } = await pool.query('SELECT * FROM src_inf_links WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Link not found' });
    const newActive = !rows[0].is_active;
    await pool.query('UPDATE src_inf_links SET is_active=$1, updated_at=NOW() WHERE id=$2', [newActive, req.params.id]);
    await infAudit(pool, req.user.id, req.user.role, newActive ? 'LINK_ENABLED' : 'LINK_DISABLED', 'link', req.params.id, ip, ua, rows[0], { is_active: newActive, reason }, reqId);
    res.json({ message: `Link ${newActive ? 'enabled' : 'disabled'}`, is_active: newActive });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteLink = async (req, res) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ message: 'Reason required' });
  const ip = getIP(req); const ua = req.headers['user-agent']||''; const reqId = genUID();
  try {
    const { rows } = await pool.query('SELECT id FROM src_inf_links WHERE id=$1 AND deleted_at IS NULL', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Link not found' });
    await pool.query('UPDATE src_inf_links SET deleted_at=NOW(), is_active=FALSE WHERE id=$1', [req.params.id]);
    await infAudit(pool, req.user.id, req.user.role, 'LINK_DELETED', 'link', req.params.id, ip, ua, null, { reason }, reqId);
    res.json({ message: 'Link archived' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};


// ══════════════════════════════════════════════════════════════════════════════
//  PUBLIC: Click/Event Tracking
// ══════════════════════════════════════════════════════════════════════════════

// GET /inf/r/:refCode — redirect + track
const trackRedirect = async (req, res) => {
  const { refCode } = req.params;
  try {
    const linkRes = await pool.query(
      `SELECT l.*, p.fraud_status FROM src_inf_links l
       JOIN src_inf_profiles p ON p.id=l.influencer_id
       WHERE l.ref_code=$1 AND l.deleted_at IS NULL`,
      [refCode]
    );
    if (!linkRes.rows.length || !linkRes.rows[0].is_active) {
      return res.redirect('https://www.norenfashion.shop/');
    }
    const link = linkRes.rows[0];
    if (link.fraud_status === 'blocked') return res.redirect('https://www.norenfashion.shop/');

    // Redirect immediately
    res.redirect(302, link.destination);

    // Track asynchronously
    const ip = getIP(req);
    const ua = (req.headers['user-agent'] || '').slice(0, 500);
    const referer = (req.headers['referer'] || req.headers['referrer'] || '').slice(0, 500);
    const { device_type, device_model, browser, os } = parseUA(ua);
    const landing_page = link.destination.split('?')[0];

    // Unique check by IP per link (last 24h)
    const prevClick = await pool.query(
      `SELECT id FROM src_inf_clicks WHERE link_id=$1 AND ip_address=$2 AND clicked_at > NOW()-INTERVAL '24 hours' LIMIT 1`,
      [link.id, ip]
    );
    const isUnique = prevClick.rows.length === 0;

    // Session token — 30d window
    const attributionWindowDays = 30;
    const sessionToken = genUID('sess_');
    const expiresAt = new Date(Date.now() + attributionWindowDays * 86400000);

    // Upsert session (last-click attribution: update if same IP within window)
    await pool.query(
      `INSERT INTO src_inf_sessions
         (session_token, link_id, influencer_id, campaign_id, ip_address, attribution_model, attribution_window_days, expires_at)
       VALUES ($1,$2,$3,$4,$5,'last_click',$6,$7)
       ON CONFLICT DO NOTHING`,
      [sessionToken, link.id, link.influencer_id, link.campaign_id||null, ip, attributionWindowDays, expiresAt]
    ).catch(() => {});

    // Expire old sessions from same IP and set new one
    await pool.query(
      `UPDATE src_inf_sessions SET expires_at=$1, link_id=$2, influencer_id=$3, campaign_id=$4, updated_at=NOW()
       WHERE ip_address=$5 AND expires_at > NOW() AND converted=FALSE`,
      [expiresAt, link.id, link.influencer_id, link.campaign_id||null, ip]
    ).catch(() => {});

    // Insert click record
    await pool.query(
      `INSERT INTO src_inf_clicks
         (link_id, influencer_id, campaign_id, session_token, ip_address, is_unique, landing_page, referer, device_type, device_model, browser, os, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [link.id, link.influencer_id, link.campaign_id||null, sessionToken, ip, isUnique, landing_page, referer, device_type, device_model, browser, os, ua.slice(0,300)]
    ).catch(() => {});

    // Update link counters
    pool.query(
      `UPDATE src_inf_links SET total_clicks=total_clicks+1, unique_clicks=unique_clicks+$1, updated_at=NOW() WHERE id=$2`,
      [isUnique ? 1 : 0, link.id]
    ).catch(() => {});

    // Update influencer aggregate counters
    pool.query(
      `UPDATE src_inf_profiles SET total_clicks=total_clicks+1, total_unique_visitors=total_unique_visitors+$1 WHERE id=$2`,
      [isUnique ? 1 : 0, link.influencer_id]
    ).catch(() => {});

    // Geo enrichment
    fetchGeoLocation(ip).then(geo => {
      pool.query(
        `UPDATE src_inf_clicks SET city=$1, region=$2, country=$3
         WHERE link_id=$4 AND ip_address=$5 ORDER BY clicked_at DESC LIMIT 1`,
        [geo.city, geo.region, geo.country, link.id, ip]
      ).catch(() => {});
    }).catch(() => {});

    // Fraud detection: >200 clicks from same IP in 1h
    pool.query(
      `SELECT COUNT(*) FROM src_inf_clicks WHERE link_id=$1 AND ip_address=$2 AND clicked_at > NOW()-INTERVAL '1 hour'`,
      [link.id, ip]
    ).then(r => {
      if (parseInt(r.rows[0].count) > 200) {
        pool.query(
          `INSERT INTO src_inf_fraud_events (influencer_id, link_id, event_type, severity, description, metadata)
           VALUES ($1,$2,'high_click_volume','high','Over 200 clicks from same IP in 1 hour',$3)`,
          [link.influencer_id, link.id, JSON.stringify({ ip, count: r.rows[0].count })]
        ).catch(() => {});
        pool.query(
          `UPDATE src_inf_profiles SET fraud_status=CASE WHEN fraud_status='normal' THEN 'review' ELSE fraud_status END WHERE id=$1`,
          [link.influencer_id]
        ).catch(() => {});
      }
    }).catch(() => {});

  } catch (err) {
    console.error('inf trackRedirect:', err.message);
    res.redirect('https://www.norenfashion.shop/');
  }
};

// POST /api/inf/track/event — server-side funnel event
const trackEvent = async (req, res) => {
  const { event_type, product_id, order_id, value } = req.body;
  if (!event_type) return res.status(400).json({ message: 'event_type required' });

  const ip = getIP(req);
  const ua = (req.headers['user-agent'] || '').slice(0, 200);
  const sessionToken = req.headers['x-inf-session'] || req.body.session_token;

  try {
    // Resolve session
    let sess = null;
    if (sessionToken) {
      const sRes = await pool.query(
        `SELECT * FROM src_inf_sessions WHERE session_token=$1 AND expires_at > NOW()`, [sessionToken]
      );
      sess = sRes.rows[0] || null;
    }
    if (!sess) {
      // Try IP-based session
      const sRes = await pool.query(
        `SELECT * FROM src_inf_sessions WHERE ip_address=$1 AND expires_at > NOW() ORDER BY updated_at DESC LIMIT 1`, [ip]
      );
      sess = sRes.rows[0] || null;
    }
    if (!sess) return res.status(200).json({ tracked: false, reason: 'no_session' });

    const userId = req.user?.id || null;

    await pool.query(
      `INSERT INTO src_inf_events
         (session_token, link_id, influencer_id, campaign_id, user_id, event_type, product_id, order_id, value, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [sess.session_token, sess.link_id, sess.influencer_id, sess.campaign_id,
       userId, event_type, product_id||null, order_id||null, value||null, ip]
    );
    res.json({ tracked: true, session_token: sess.session_token });
  } catch (err) { res.status(500).json({ message: err.message }); }
};


// ══════════════════════════════════════════════════════════════════════════════
//  Conversion Attribution (called from order controller after payment success)
// ══════════════════════════════════════════════════════════════════════════════

const attributeConversion = async (orderId, orderTotal, sessionToken, ipAddress) => {
  if (!orderId || !orderTotal) return null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Idempotency check
    const dup = await client.query('SELECT id FROM src_inf_conversions WHERE order_id=$1', [orderId]);
    if (dup.rows.length) { await client.query('ROLLBACK'); return dup.rows[0]; }

    // Resolve session
    let sess = null;
    if (sessionToken) {
      const sRes = await client.query(
        `SELECT * FROM src_inf_sessions WHERE session_token=$1 AND expires_at > NOW() AND converted=FALSE`,
        [sessionToken]
      );
      sess = sRes.rows[0] || null;
    }
    if (!sess && ipAddress) {
      const sRes = await client.query(
        `SELECT * FROM src_inf_sessions WHERE ip_address=$1 AND expires_at > NOW() AND converted=FALSE ORDER BY updated_at DESC LIMIT 1`,
        [ipAddress]
      );
      sess = sRes.rows[0] || null;
    }
    if (!sess) { await client.query('ROLLBACK'); return null; }

    // Get influencer commission config (product > campaign > influencer)
    const infRes = await client.query('SELECT * FROM src_inf_profiles WHERE id=$1', [sess.influencer_id]);
    if (!infRes.rows.length) { await client.query('ROLLBACK'); return null; }
    const inf = infRes.rows[0];

    let commission_type = inf.commission_type;
    let commission_rate = parseFloat(inf.commission_rate);

    if (sess.campaign_id) {
      const campRes = await client.query('SELECT commission_type, commission_rate FROM src_inf_campaigns WHERE id=$1', [sess.campaign_id]);
      if (campRes.rows.length && parseFloat(campRes.rows[0].commission_rate) > 0) {
        commission_type = campRes.rows[0].commission_type;
        commission_rate = parseFloat(campRes.rows[0].commission_rate);
      }
      // Check campaign influencer override
      const ciRes = await client.query(
        `SELECT commission_type, commission_rate FROM src_inf_campaign_influencers WHERE campaign_id=$1 AND influencer_id=$2`,
        [sess.campaign_id, sess.influencer_id]
      );
      if (ciRes.rows.length && ciRes.rows[0].commission_rate && parseFloat(ciRes.rows[0].commission_rate) > 0) {
        commission_type = ciRes.rows[0].commission_type;
        commission_rate = parseFloat(ciRes.rows[0].commission_rate);
      }
    }

    const eligible_total = parseFloat(orderTotal);
    const commission_amount = calcCommission(eligible_total, commission_type, commission_rate);
    const conversion_uid = genUID('conv_');
    const idempotency_key = `order_${orderId}_inf_${sess.influencer_id}`;

    const attributionSnapshot = {
      model: sess.attribution_model,
      session_token: sess.session_token,
      link_id: sess.link_id,
      influencer_id: sess.influencer_id,
      campaign_id: sess.campaign_id,
      commission_type, commission_rate,
      snapshot_at: new Date().toISOString()
    };

    const convRes = await client.query(
      `INSERT INTO src_inf_conversions
         (conversion_uid, order_id, influencer_id, campaign_id, link_id, session_token,
          attribution_model, attribution_snapshot, order_total, eligible_total,
          commission_type, commission_rate, commission_amount, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING *`,
      [conversion_uid, orderId, sess.influencer_id, sess.campaign_id||null, sess.link_id||null,
       sess.session_token, sess.attribution_model, JSON.stringify(attributionSnapshot),
       eligible_total, eligible_total, commission_type, commission_rate, commission_amount,
       idempotency_key]
    );

    if (!convRes.rows.length) { await client.query('ROLLBACK'); return null; }

    // Mark session converted
    await client.query('UPDATE src_inf_sessions SET converted=TRUE, updated_at=NOW() WHERE session_token=$1', [sess.session_token]);

    // Update link and influencer aggregates
    await client.query(
      'UPDATE src_inf_links SET total_orders=total_orders+1, total_revenue=total_revenue+$1 WHERE id=$2',
      [eligible_total, sess.link_id]
    );
    await client.query(
      `UPDATE src_inf_profiles SET
         total_orders=total_orders+1, total_revenue=total_revenue+$1,
         total_commission=total_commission+$2, updated_at=NOW()
       WHERE id=$3`,
      [eligible_total, commission_amount, sess.influencer_id]
    );

    // Record funnel event
    await client.query(
      `INSERT INTO src_inf_events (session_token, link_id, influencer_id, campaign_id, event_type, order_id, value, ip_address)
       VALUES ($1,$2,$3,$4,'order_placed',$5,$6,$7)`,
      [sess.session_token, sess.link_id, sess.influencer_id, sess.campaign_id||null, orderId, eligible_total, ipAddress||null]
    ).catch(() => {});

    // Update src_orders with attribution
    await client.query(
      `UPDATE src_orders SET inf_session_token=$1, inf_link_id=$2, inf_influencer_id=$3, inf_campaign_id=$4 WHERE id=$5`,
      [sess.session_token, sess.link_id, sess.influencer_id, sess.campaign_id||null, orderId]
    ).catch(() => {});

    await client.query('COMMIT');

    // Notify influencer
    await pool.query(
      `INSERT INTO src_notifications (user_id, message, type)
       SELECT user_id, $1, 'commission' FROM src_inf_profiles WHERE id=$2`,
      [`New commission ₹${commission_amount.toFixed(2)} earned from order #${orderId}`, sess.influencer_id]
    ).catch(() => {});

    return convRes.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('attributeConversion error:', err.message);
    return null;
  } finally { client.release(); }
};


// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN: Conversions & Commission Management
// ══════════════════════════════════════════════════════════════════════════════

const listConversions = async (req, res) => {
  const { page=1, limit=20, influencer_id, campaign_id, status, date_from, date_to } = req.query;
  const offset = (page-1)*limit;
  const conds = []; const vals = []; let idx = 1;
  if (influencer_id) { conds.push(`cv.influencer_id=$${idx}`); vals.push(influencer_id); idx++; }
  if (campaign_id)   { conds.push(`cv.campaign_id=$${idx}`);   vals.push(campaign_id); idx++; }
  if (status)        { conds.push(`cv.status=$${idx}`);         vals.push(status); idx++; }
  if (date_from)     { conds.push(`cv.created_at >= $${idx}`);  vals.push(date_from); idx++; }
  if (date_to)       { conds.push(`cv.created_at <= $${idx}`);  vals.push(date_to + ' 23:59:59'); idx++; }
  const where = conds.length ? 'WHERE '+conds.join(' AND ') : '';
  vals.push(limit, offset);
  try {
    const { rows } = await pool.query(
      `SELECT cv.*, p.display_name as influencer_name, u.email as influencer_email,
              c.name as campaign_name, o.order_id as order_ref
       FROM src_inf_conversions cv
       JOIN src_inf_profiles p ON p.id=cv.influencer_id
       JOIN src_users u ON u.id=p.user_id
       LEFT JOIN src_inf_campaigns c ON c.id=cv.campaign_id
       LEFT JOIN src_orders o ON o.id=cv.order_id
       ${where} ORDER BY cv.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
      vals
    );
    const cnt = await pool.query(
      `SELECT COUNT(*) FROM src_inf_conversions cv JOIN src_inf_profiles p ON p.id=cv.influencer_id JOIN src_users u ON u.id=p.user_id LEFT JOIN src_inf_campaigns c ON c.id=cv.campaign_id LEFT JOIN src_orders o ON o.id=cv.order_id ${where}`,
      vals.slice(0,-2)
    );
    res.json({ conversions: rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateConversionStatus = async (req, res) => {
  const { status, admin_note, reason } = req.body;
  const VALID = ['pending','under_review','approved','rejected','cancelled','reversed'];
  if (!VALID.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  if (!reason) return res.status(400).json({ message: 'Reason required' });
  const ip = getIP(req); const ua = req.headers['user-agent']||''; const reqId = genUID();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM src_inf_conversions WHERE id=$1', [req.params.id]);
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Conversion not found' }); }
    const before = rows[0];
    await client.query(
      `UPDATE src_inf_conversions SET status=$1, admin_note=$2, reviewed_by=$3, reviewed_at=NOW(), updated_at=NOW() WHERE id=$4`,
      [status, admin_note||null, req.user.id, req.params.id]
    );
    await client.query('COMMIT');
    await infAudit(pool, req.user.id, req.user.role, 'COMMISSION_CHANGED', 'conversion', req.params.id, ip, ua,
      { status: before.status }, { status, reason, admin_note }, reqId);

    // Notify influencer
    if (status === 'approved' || status === 'rejected') {
      await pool.query(
        `INSERT INTO src_notifications (user_id, message, type)
         SELECT user_id, $1, 'commission' FROM src_inf_profiles WHERE id=$2`,
        [`Your commission for order has been ${status}`, before.influencer_id]
      ).catch(() => {});
    }
    res.json({ message: 'Conversion status updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally { client.release(); }
};

const reverseCommission = async (req, res) => {
  const { reason, adjustment_type='refund_reversal' } = req.body;
  if (!reason) return res.status(400).json({ message: 'Reason required' });
  const ip = getIP(req); const ua = req.headers['user-agent']||''; const reqId = genUID();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM src_inf_conversions WHERE id=$1', [req.params.id]);
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Not found' }); }
    const conv = rows[0];
    if (conv.status === 'paid') { await client.query('ROLLBACK'); return res.status(400).json({ message: 'Cannot reverse paid commission' }); }

    await client.query('UPDATE src_inf_conversions SET status=\'reversed\', admin_note=$1, reviewed_by=$2, reviewed_at=NOW(), updated_at=NOW() WHERE id=$3',
      [reason, req.user.id, req.params.id]);

    // Record adjustment
    await client.query(
      `INSERT INTO src_inf_commission_adjustments (conversion_id, influencer_id, adjustment_type, amount, reason, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [conv.id, conv.influencer_id, adjustment_type, -Math.abs(parseFloat(conv.commission_amount)), reason, req.user.id]
    );

    await client.query('COMMIT');
    await infAudit(pool, req.user.id, req.user.role, 'COMMISSION_REVERSED', 'conversion', conv.id, ip, ua, conv, { reason }, reqId);
    res.json({ message: 'Commission reversed' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally { client.release(); }
};


// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN: Payout Management
// ══════════════════════════════════════════════════════════════════════════════

const createPayout = async (req, res) => {
  const { influencer_id, period_start, period_end, payment_method, admin_notes } = req.body;
  if (!influencer_id) return res.status(400).json({ message: 'influencer_id required' });
  const ip = getIP(req); const ua = req.headers['user-agent']||''; const reqId = genUID();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get approved conversions not yet in a payout
    const convRes = await client.query(
      `SELECT cv.* FROM src_inf_conversions cv
       WHERE cv.influencer_id=$1 AND cv.status='approved'
         AND NOT EXISTS (SELECT 1 FROM src_inf_payout_items pi WHERE pi.conversion_id=cv.id)`,
      [influencer_id]
    );
    if (!convRes.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'No approved conversions to pay out' }); }

    let gross = 0;
    for (const c of convRes.rows) gross += parseFloat(c.commission_amount);

    // Adjustments
    const adjRes = await client.query(
      `SELECT COALESCE(SUM(amount),0) as total_adj FROM src_inf_commission_adjustments WHERE influencer_id=$1`,
      [influencer_id]
    );
    const adjustments = parseFloat(adjRes.rows[0].total_adj) || 0;
    const final_amount = Math.max(0, gross + adjustments);

    const payout_uid = genUID('pay_');
    const payRes = await client.query(
      `INSERT INTO src_inf_payouts
         (payout_uid, influencer_id, period_start, period_end, conversion_count, gross_commission, adjustments, final_amount, payment_method, admin_notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [payout_uid, influencer_id, period_start||null, period_end||null, convRes.rows.length,
       gross, adjustments, final_amount, payment_method||null, admin_notes||null, req.user.id]
    );
    const payout = payRes.rows[0];

    for (const c of convRes.rows) {
      await client.query(
        'INSERT INTO src_inf_payout_items (payout_id, conversion_id, commission_amount) VALUES ($1,$2,$3)',
        [payout.id, c.id, c.commission_amount]
      );
    }

    await client.query('COMMIT');
    await infAudit(pool, req.user.id, req.user.role, 'PAYOUT_CREATED', 'payout', payout.id, ip, ua, null, { influencer_id, final_amount, conversion_count: convRes.rows.length }, reqId);

    await pool.query(
      `INSERT INTO src_notifications (user_id, message, type)
       SELECT user_id, $1, 'payout' FROM src_inf_profiles WHERE id=$2`,
      [`Payout of ₹${final_amount.toFixed(2)} has been created and is pending approval`, influencer_id]
    ).catch(() => {});

    res.status(201).json({ message: 'Payout created', payout });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally { client.release(); }
};

const listPayouts = async (req, res) => {
  const { page=1, limit=20, influencer_id, status, date_from, date_to } = req.query;
  const offset = (page-1)*limit;
  const conds = []; const vals = []; let idx = 1;
  if (influencer_id) { conds.push(`py.influencer_id=$${idx}`); vals.push(influencer_id); idx++; }
  if (status)        { conds.push(`py.status=$${idx}`);         vals.push(status); idx++; }
  if (date_from)     { conds.push(`py.created_at>=$${idx}`);    vals.push(date_from); idx++; }
  if (date_to)       { conds.push(`py.created_at<=$${idx}`);    vals.push(date_to+' 23:59:59'); idx++; }
  const where = conds.length ? 'WHERE '+conds.join(' AND ') : '';
  vals.push(limit, offset);
  try {
    const { rows } = await pool.query(
      `SELECT py.*, p.display_name as influencer_name, u.email as influencer_email
       FROM src_inf_payouts py
       JOIN src_inf_profiles p ON p.id=py.influencer_id
       JOIN src_users u ON u.id=p.user_id
       ${where} ORDER BY py.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
      vals
    );
    const cnt = await pool.query(
      `SELECT COUNT(*) FROM src_inf_payouts py JOIN src_inf_profiles p ON p.id=py.influencer_id JOIN src_users u ON u.id=p.user_id ${where}`,
      vals.slice(0,-2)
    );
    res.json({ payouts: rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updatePayoutStatus = async (req, res) => {
  const { status, transaction_ref, admin_notes, reason } = req.body;
  const VALID = ['approved','processing','paid','failed','cancelled'];
  if (!VALID.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  if (!reason) return res.status(400).json({ message: 'Reason required' });
  const ip = getIP(req); const ua = req.headers['user-agent']||''; const reqId = genUID();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM src_inf_payouts WHERE id=$1', [req.params.id]);
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Payout not found' }); }
    const before = rows[0];

    const fields = [`status=$1`, `admin_notes=$2`, `updated_at=NOW()`];
    const vals = [status, admin_notes || before.admin_notes];
    if (status === 'approved') { fields.push('approved_by=$3', 'approved_at=NOW()'); vals.push(req.user.id); }
    if (status === 'paid') { fields.push(`paid_at=NOW()`); if (transaction_ref) { fields.push(`transaction_ref=$${vals.length+1}`); vals.push(transaction_ref); } }
    vals.push(req.params.id);
    await client.query(`UPDATE src_inf_payouts SET ${fields.join(',')} WHERE id=$${vals.length}`, vals);

    // If paid, mark conversions as paid
    if (status === 'paid') {
      await client.query(
        `UPDATE src_inf_conversions SET status='paid', updated_at=NOW()
         WHERE id IN (SELECT conversion_id FROM src_inf_payout_items WHERE payout_id=$1)`,
        [req.params.id]
      );
    }

    await client.query('COMMIT');
    await infAudit(pool, req.user.id, req.user.role, `PAYOUT_${status.toUpperCase()}`, 'payout', req.params.id, ip, ua, { status: before.status }, { status, reason }, reqId);

    const msgMap = { approved: 'approved', paid: 'processed and paid' };
    if (msgMap[status]) {
      await pool.query(
        `INSERT INTO src_notifications (user_id, message, type)
         SELECT user_id, $1, 'payout' FROM src_inf_profiles WHERE id=$2`,
        [`Your payout of ₹${parseFloat(before.final_amount).toFixed(2)} has been ${msgMap[status]}`, before.influencer_id]
      ).catch(() => {});
    }

    res.json({ message: `Payout ${status}` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally { client.release(); }
};


// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN: Analytics & Dashboards
// ══════════════════════════════════════════════════════════════════════════════

const getAdminDashboardStats = async (req, res) => {
  try {
    const [infCount, campCount, convStats, payoutStats, topInf, recentFraud] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM src_inf_profiles WHERE status=\'active\''),
      pool.query('SELECT COUNT(*) FROM src_inf_campaigns WHERE status=\'active\''),
      pool.query(`SELECT
        COUNT(*) as total_conversions,
        COALESCE(SUM(commission_amount),0) as total_commission,
        COALESCE(SUM(order_total),0) as total_revenue,
        COUNT(*) FILTER (WHERE status='pending') as pending_count,
        COUNT(*) FILTER (WHERE status='approved') as approved_count,
        COALESCE(SUM(commission_amount) FILTER (WHERE status='approved'),0) as approved_commission
        FROM src_inf_conversions`),
      pool.query(`SELECT COALESCE(SUM(final_amount),0) as total_payouts,
        COALESCE(SUM(final_amount) FILTER (WHERE status='paid'),0) as paid_payouts,
        COALESCE(SUM(final_amount) FILTER (WHERE status='pending'),0) as pending_payouts
        FROM src_inf_payouts`),
      pool.query(`SELECT p.id, p.display_name, u.email, p.total_revenue, p.total_commission, p.total_orders
        FROM src_inf_profiles p JOIN src_users u ON u.id=p.user_id
        WHERE p.status='active' ORDER BY p.total_revenue DESC LIMIT 5`),
      pool.query(`SELECT COUNT(*) as unreviewed FROM src_inf_fraud_events WHERE is_reviewed=FALSE`),
    ]);
    res.json({
      active_influencers: parseInt(infCount.rows[0].count),
      active_campaigns: parseInt(campCount.rows[0].count),
      ...convStats.rows[0],
      ...payoutStats.rows[0],
      top_influencers: topInf.rows,
      unreviewed_fraud: parseInt(recentFraud.rows[0].unreviewed),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getInfluencerAnalytics = async (req, res) => {
  const { id } = req.params;
  const { date_from, date_to, range = '30d' } = req.query;

  let startDate, endDate = new Date();
  if (date_from && date_to) {
    startDate = new Date(date_from); endDate = new Date(date_to);
  } else {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === 'month' ? 30 : 90;
    startDate = new Date(Date.now() - days * 86400000);
  }

  try {
    const [profile, dailyStats, topLinks, topProducts, recentConversions] = await Promise.all([
      pool.query(`SELECT p.*, u.name, u.email FROM src_inf_profiles p JOIN src_users u ON u.id=p.user_id WHERE p.id=$1`, [id]),
      pool.query(
        `SELECT stat_date, SUM(clicks) as clicks, SUM(unique_visitors) as unique_visitors,
                SUM(orders) as orders, SUM(revenue) as revenue, SUM(commission) as commission
         FROM src_inf_daily_stats WHERE influencer_id=$1 AND stat_date BETWEEN $2 AND $3
         GROUP BY stat_date ORDER BY stat_date ASC`,
        [id, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      ),
      pool.query(
        `SELECT l.id, l.name, l.slug, l.ref_code, l.total_clicks, l.unique_clicks, l.total_orders, l.total_revenue
         FROM src_inf_links l WHERE l.influencer_id=$1 AND l.deleted_at IS NULL
         ORDER BY l.total_revenue DESC LIMIT 10`,
        [id]
      ),
      pool.query(
        `SELECT p.id, p.title,
                COUNT(e.id) as view_count,
                (SELECT image_url FROM src_product_images WHERE product_id=p.id AND is_primary=TRUE LIMIT 1) as image
         FROM src_inf_events e
         JOIN src_products p ON p.id=e.product_id
         WHERE e.influencer_id=$1 AND e.event_type='product_view'
           AND e.created_at BETWEEN $2 AND $3
         GROUP BY p.id ORDER BY view_count DESC LIMIT 10`,
        [id, startDate, endDate]
      ),
      pool.query(
        `SELECT cv.*, o.order_id as order_ref FROM src_inf_conversions cv
         JOIN src_orders o ON o.id=cv.order_id
         WHERE cv.influencer_id=$1 ORDER BY cv.created_at DESC LIMIT 20`,
        [id]
      ),
    ]);
    if (!profile.rows.length) return res.status(404).json({ message: 'Influencer not found' });
    res.json({
      profile: profile.rows[0],
      daily_stats: dailyStats.rows,
      top_links: topLinks.rows,
      top_products: topProducts.rows,
      recent_conversions: recentConversions.rows,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getLinkAnalytics = async (req, res) => {
  const { id } = req.params;
  try {
    const [link, clicks, funnel] = await Promise.all([
      pool.query(`SELECT l.*, p.display_name as influencer_name FROM src_inf_links l JOIN src_inf_profiles p ON p.id=l.influencer_id WHERE l.id=$1`, [id]),
      pool.query(
        `SELECT device_type, browser, os, country, city,
                COUNT(*) as count, SUM(CASE WHEN is_unique THEN 1 ELSE 0 END) as unique_count
         FROM src_inf_clicks WHERE link_id=$1 GROUP BY device_type, browser, os, country, city LIMIT 100`,
        [id]
      ),
      pool.query(
        `SELECT event_type, COUNT(*) as count FROM src_inf_events WHERE link_id=$1 GROUP BY event_type`,
        [id]
      ),
    ]);
    if (!link.rows.length) return res.status(404).json({ message: 'Link not found' });
    res.json({ link: link.rows[0], clicks: clicks.rows, funnel: funnel.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getTopPerformers = async (req, res) => {
  const { metric='revenue', limit=10 } = req.query;
  const col = { revenue:'p.total_revenue', orders:'p.total_orders', clicks:'p.total_clicks', commission:'p.total_commission' }[metric] || 'p.total_revenue';
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.display_name, u.name, u.email, p.total_revenue, p.total_orders, p.total_clicks, p.total_commission, p.total_unique_visitors
       FROM src_inf_profiles p JOIN src_users u ON u.id=p.user_id
       WHERE p.status='active' ORDER BY ${col} DESC LIMIT $1`,
      [parseInt(limit)]
    );
    res.json({ performers: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};


// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN: Fraud & Security
// ══════════════════════════════════════════════════════════════════════════════

const listFraudEvents = async (req, res) => {
  const { page=1, limit=20, is_reviewed, influencer_id } = req.query;
  const offset = (page-1)*limit;
  const conds = []; const vals = []; let idx = 1;
  if (is_reviewed !== undefined) { conds.push(`f.is_reviewed=$${idx}`); vals.push(is_reviewed==='true'); idx++; }
  if (influencer_id) { conds.push(`f.influencer_id=$${idx}`); vals.push(influencer_id); idx++; }
  const where = conds.length ? 'WHERE '+conds.join(' AND ') : '';
  vals.push(limit, offset);
  try {
    const { rows } = await pool.query(
      `SELECT f.*, p.display_name as influencer_name, u.email as influencer_email
       FROM src_inf_fraud_events f
       LEFT JOIN src_inf_profiles p ON p.id=f.influencer_id
       LEFT JOIN src_users u ON u.id=p.user_id
       ${where} ORDER BY f.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
      vals
    );
    res.json({ events: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const reviewFraudEvent = async (req, res) => {
  const { action } = req.body; // 'clear' | 'escalate'
  const ip = getIP(req); const ua = req.headers['user-agent']||''; const reqId = genUID();
  try {
    await pool.query(
      'UPDATE src_inf_fraud_events SET is_reviewed=TRUE, reviewed_by=$1, reviewed_at=NOW() WHERE id=$2',
      [req.user.id, req.params.id]
    );
    await infAudit(pool, req.user.id, req.user.role, 'FRAUD_EVENT_REVIEWED', 'fraud', req.params.id, ip, ua, null, { action }, reqId);
    res.json({ message: 'Fraud event reviewed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateFraudStatus = async (req, res) => {
  const { fraud_status, reason } = req.body;
  const VALID = ['normal','review','suspicious','blocked'];
  if (!VALID.includes(fraud_status)) return res.status(400).json({ message: 'Invalid fraud_status' });
  if (!reason) return res.status(400).json({ message: 'Reason required' });
  const ip = getIP(req); const ua = req.headers['user-agent']||''; const reqId = genUID();
  try {
    const before = await pool.query('SELECT fraud_status FROM src_inf_profiles WHERE id=$1', [req.params.id]);
    if (!before.rows.length) return res.status(404).json({ message: 'Not found' });
    await pool.query('UPDATE src_inf_profiles SET fraud_status=$1, updated_at=NOW() WHERE id=$2', [fraud_status, req.params.id]);
    if (fraud_status === 'blocked') {
      await pool.query('UPDATE src_users SET is_banned=TRUE WHERE id=(SELECT user_id FROM src_inf_profiles WHERE id=$1)', [req.params.id]);
    }
    await infAudit(pool, req.user.id, req.user.role, 'FRAUD_STATUS_CHANGED', 'influencer', req.params.id, ip, ua, before.rows[0], { fraud_status, reason }, reqId);
    res.json({ message: 'Fraud status updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN: Audit Logs
// ══════════════════════════════════════════════════════════════════════════════

const listAuditLogs = async (req, res) => {
  const { page=1, limit=50, action, resource_type, actor_id } = req.query;
  const offset = (page-1)*limit;
  const conds = []; const vals = []; let idx = 1;
  if (action)        { conds.push(`a.action ILIKE $${idx}`);        vals.push(`%${action}%`); idx++; }
  if (resource_type) { conds.push(`a.resource_type=$${idx}`);        vals.push(resource_type); idx++; }
  if (actor_id)      { conds.push(`a.actor_id=$${idx}`);             vals.push(actor_id); idx++; }
  const where = conds.length ? 'WHERE '+conds.join(' AND ') : '';
  vals.push(limit, offset);
  try {
    const { rows } = await pool.query(
      `SELECT a.*, u.name as actor_name, u.email as actor_email FROM src_inf_audit_logs a
       LEFT JOIN src_users u ON u.id=a.actor_id
       ${where} ORDER BY a.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
      vals
    );
    res.json({ logs: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ══════════════════════════════════════════════════════════════════════════════
//  INFLUENCER SELF-SERVICE
// ══════════════════════════════════════════════════════════════════════════════

// Middleware: resolve influencer profile from authenticated user
const resolveInfluencerProfile = async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM src_inf_profiles WHERE user_id=$1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'Influencer profile not found' });
    if (rows[0].status === 'suspended') return res.status(403).json({ message: 'Account suspended' });
    req.influencerProfile = rows[0];
    next();
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMyDashboard = async (req, res) => {
  const inf = req.influencerProfile;
  const { range='30d' } = req.query;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === 'today' ? 1 : range === 'yesterday' ? 1 : 90;
  const offset = range === 'yesterday' ? 1 : 0;
  const startDate = new Date(Date.now() - (days + offset) * 86400000);
  const endDate   = offset ? new Date(Date.now() - offset * 86400000) : new Date();

  try {
    const [convStats, payoutStats, dailyStats, topLinks] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as total_conversions, COALESCE(SUM(commission_amount),0) as total_commission,
                COALESCE(SUM(commission_amount) FILTER (WHERE status='pending'),0) as pending_commission,
                COALESCE(SUM(commission_amount) FILTER (WHERE status='approved'),0) as approved_commission,
                COALESCE(SUM(commission_amount) FILTER (WHERE status='paid'),0) as paid_commission,
                COALESCE(SUM(order_total),0) as total_revenue
         FROM src_inf_conversions WHERE influencer_id=$1`,
        [inf.id]
      ),
      pool.query(
        `SELECT COALESCE(SUM(final_amount) FILTER (WHERE status='pending'),0) as pending_payout,
                COALESCE(SUM(final_amount) FILTER (WHERE status='paid'),0) as paid_payout
         FROM src_inf_payouts WHERE influencer_id=$1`,
        [inf.id]
      ),
      pool.query(
        `SELECT stat_date, clicks, unique_visitors, orders, revenue, commission
         FROM src_inf_daily_stats WHERE influencer_id=$1 AND stat_date BETWEEN $2 AND $3
         ORDER BY stat_date ASC`,
        [inf.id, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      ),
      pool.query(
        `SELECT id, name, ref_code, slug, total_clicks, unique_clicks, total_orders, total_revenue
         FROM src_inf_links WHERE influencer_id=$1 AND deleted_at IS NULL AND is_active=TRUE
         ORDER BY total_revenue DESC LIMIT 5`,
        [inf.id]
      ),
    ]);
    res.json({
      profile: { id: inf.id, display_name: inf.display_name, status: inf.status, commission_type: inf.commission_type, commission_rate: inf.commission_rate },
      total_clicks: Number(inf.total_clicks),
      total_unique_visitors: Number(inf.total_unique_visitors),
      total_orders: inf.total_orders,
      total_revenue: parseFloat(inf.total_revenue),
      ...convStats.rows[0],
      ...payoutStats.rows[0],
      daily_stats: dailyStats.rows,
      top_links: topLinks.rows,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMyLinks = async (req, res) => {
  const inf = req.influencerProfile;
  try {
    const { rows } = await pool.query(
      `SELECT l.*, c.name as campaign_name FROM src_inf_links l
       LEFT JOIN src_inf_campaigns c ON c.id=l.campaign_id
       WHERE l.influencer_id=$1 AND l.deleted_at IS NULL ORDER BY l.created_at DESC`,
      [inf.id]
    );
    res.json({ links: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMyConversions = async (req, res) => {
  const inf = req.influencerProfile;
  const { page=1, limit=20, status } = req.query;
  const offset = (page-1)*limit;
  const conds = [`cv.influencer_id=$1`]; const vals = [inf.id]; let idx = 2;
  if (status) { conds.push(`cv.status=$${idx}`); vals.push(status); idx++; }
  vals.push(limit, offset);
  try {
    const { rows } = await pool.query(
      `SELECT cv.id, cv.conversion_uid, cv.status, cv.order_total, cv.commission_amount,
              cv.commission_type, cv.commission_rate, cv.created_at, o.order_id as order_ref,
              c.name as campaign_name
       FROM src_inf_conversions cv
       LEFT JOIN src_orders o ON o.id=cv.order_id
       LEFT JOIN src_inf_campaigns c ON c.id=cv.campaign_id
       WHERE ${conds.join(' AND ')}
       ORDER BY cv.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
      vals
    );
    res.json({ conversions: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMyPayouts = async (req, res) => {
  const inf = req.influencerProfile;
  try {
    const { rows } = await pool.query(
      `SELECT id, payout_uid, period_start, period_end, conversion_count, gross_commission,
              adjustments, final_amount, payment_method, transaction_ref, status, created_at, paid_at
       FROM src_inf_payouts WHERE influencer_id=$1 ORDER BY created_at DESC`,
      [inf.id]
    );
    res.json({ payouts: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMyProfile = async (req, res) => {
  const inf = req.influencerProfile;
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.display_name, p.username, p.category, p.niche, p.location, p.bio,
              p.profile_photo, p.commission_type, p.commission_rate, p.status,
              p.agreement_status, p.contract_start_date, p.contract_end_date, p.notes,
              p.website_url, p.created_at,
              u.name, u.email, u.phone, u.avatar_url,
              (SELECT json_agg(json_build_object('platform',sp.platform,'handle',sp.handle,'url',sp.url))
               FROM src_inf_social_profiles sp WHERE sp.influencer_id=p.id) as social_profiles
       FROM src_inf_profiles p JOIN src_users u ON u.id=p.user_id WHERE p.id=$1`,
      [inf.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMyNotifications = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM src_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ notifications: rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getMyLinkClicks = async (req, res) => {
  const inf = req.influencerProfile;
  const { link_id } = req.params;
  try {
    // Verify link belongs to this influencer
    const linkCheck = await pool.query('SELECT id FROM src_inf_links WHERE id=$1 AND influencer_id=$2 AND deleted_at IS NULL', [link_id, inf.id]);
    if (!linkCheck.rows.length) return res.status(404).json({ message: 'Link not found' });
    const [link, clicks, funnel] = await Promise.all([
      pool.query(`SELECT l.*, c.name as campaign_name FROM src_inf_links l LEFT JOIN src_inf_campaigns c ON c.id=l.campaign_id WHERE l.id=$1`, [link_id]),
      pool.query(`SELECT device_type, browser, os, country, DATE(clicked_at) as date, COUNT(*) as count FROM src_inf_clicks WHERE link_id=$1 GROUP BY device_type, browser, os, country, date ORDER BY date DESC LIMIT 200`, [link_id]),
      pool.query(`SELECT event_type, COUNT(*) as count FROM src_inf_events WHERE link_id=$1 GROUP BY event_type`, [link_id]),
    ]);
    res.json({ link: link.rows[0], clicks: clicks.rows, funnel: funnel.rows });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Export report (admin)
const exportReport = async (req, res) => {
  const { type='conversions', influencer_id, date_from, date_to, format='csv' } = req.query;
  try {
    let rows = [];
    if (type === 'conversions') {
      const conds = []; const vals = []; let idx = 1;
      if (influencer_id) { conds.push(`cv.influencer_id=$${idx}`); vals.push(influencer_id); idx++; }
      if (date_from)     { conds.push(`cv.created_at>=$${idx}`);    vals.push(date_from); idx++; }
      if (date_to)       { conds.push(`cv.created_at<=$${idx}`);    vals.push(date_to+' 23:59:59'); idx++; }
      const where = conds.length ? 'WHERE '+conds.join(' AND ') : '';
      const r = await pool.query(
        `SELECT cv.conversion_uid, p.display_name as influencer, u.email, o.order_id, cv.order_total, cv.commission_amount, cv.status, cv.created_at
         FROM src_inf_conversions cv JOIN src_inf_profiles p ON p.id=cv.influencer_id JOIN src_users u ON u.id=p.user_id JOIN src_orders o ON o.id=cv.order_id ${where} ORDER BY cv.created_at DESC`,
        vals
      );
      rows = r.rows;
    } else if (type === 'payouts') {
      const r = await pool.query(`SELECT py.payout_uid, p.display_name, u.email, py.conversion_count, py.final_amount, py.status, py.created_at, py.paid_at FROM src_inf_payouts py JOIN src_inf_profiles p ON p.id=py.influencer_id JOIN src_users u ON u.id=p.user_id ORDER BY py.created_at DESC`);
      rows = r.rows;
    }

    if (!rows.length) return res.status(404).json({ message: 'No data to export' });
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h]||'').replace(/"/g,'""')}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="influencer-${type}-export.csv"`);
    res.send(csv);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ══════════════════════════════════════════════════════════════════════════════
//  BACKGROUND JOB: Aggregate daily stats
// ══════════════════════════════════════════════════════════════════════════════

const aggregateDailyStats = async () => {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  try {
    // Aggregate clicks by influencer/campaign/link for yesterday
    const { rows: clickData } = await pool.query(
      `SELECT influencer_id, campaign_id, link_id,
              COUNT(*) as clicks, SUM(CASE WHEN is_unique THEN 1 ELSE 0 END) as unique_visitors
       FROM src_inf_clicks
       WHERE DATE(clicked_at) = $1
       GROUP BY influencer_id, campaign_id, link_id`,
      [yesterday]
    );

    const { rows: convData } = await pool.query(
      `SELECT influencer_id, campaign_id, link_id,
              COUNT(*) as orders, SUM(order_total) as revenue, SUM(commission_amount) as commission
       FROM src_inf_conversions
       WHERE DATE(created_at) = $1
       GROUP BY influencer_id, campaign_id, link_id`,
      [yesterday]
    );

    // Upsert into daily stats
    for (const r of clickData) {
      const conv = convData.find(c => c.influencer_id === r.influencer_id && c.campaign_id === r.campaign_id && String(c.link_id) === String(r.link_id)) || {};
      await pool.query(
        `INSERT INTO src_inf_daily_stats (influencer_id, campaign_id, link_id, stat_date, clicks, unique_visitors, orders, revenue, commission)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (influencer_id, campaign_id, link_id, stat_date) DO UPDATE SET
           clicks=EXCLUDED.clicks, unique_visitors=EXCLUDED.unique_visitors,
           orders=EXCLUDED.orders, revenue=EXCLUDED.revenue, commission=EXCLUDED.commission`,
        [r.influencer_id, r.campaign_id, r.link_id, yesterday,
         parseInt(r.clicks), parseInt(r.unique_visitors),
         parseInt(conv.orders||0), parseFloat(conv.revenue||0), parseFloat(conv.commission||0)]
      );
    }
    console.log(`✅ Influencer daily stats aggregated for ${yesterday}`);
  } catch (err) { console.error('aggregateDailyStats error:', err.message); }
};

// ── Campaign status auto-update (called by cron)
const syncCampaignStatuses = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    await pool.query(`UPDATE src_inf_campaigns SET status='active' WHERE status='scheduled' AND start_date <= $1`, [today]);
    await pool.query(`UPDATE src_inf_campaigns SET status='completed' WHERE status='active' AND end_date < $1`, [today]);
  } catch (err) { console.error('syncCampaignStatuses:', err.message); }
};

module.exports = {
  // Admin
  createInfluencer, listInfluencers, getInfluencer, updateInfluencer,
  createCampaign, listCampaigns, getCampaign, updateCampaign,
  createLink, listLinks, toggleLink, deleteLink,
  listConversions, updateConversionStatus, reverseCommission,
  createPayout, listPayouts, updatePayoutStatus,
  getAdminDashboardStats, getInfluencerAnalytics, getLinkAnalytics, getTopPerformers,
  listFraudEvents, reviewFraudEvent, updateFraudStatus,
  listAuditLogs, exportReport,
  // Public tracking
  trackRedirect, trackEvent,
  // Influencer self-service
  resolveInfluencerProfile, getMyDashboard, getMyLinks, getMyConversions,
  getMyPayouts, getMyProfile, getMyNotifications, getMyLinkClicks, updateMyProfile,
  // Internal
  attributeConversion, aggregateDailyStats, syncCampaignStatuses,
};

// ── Influencer self-update (bio, website only) ────────────────────────────
const updateMyProfile = async (req, res) => {
  const inf = req.influencerProfile;
  const { bio, website_url, display_name } = req.body;
  try {
    const fields = []; const vals = []; let idx = 1;
    if (bio         !== undefined) { fields.push(`bio=$${idx++}`);         vals.push(bio); }
    if (website_url !== undefined) { fields.push(`website_url=$${idx++}`); vals.push(website_url); }
    if (display_name !== undefined){ fields.push(`display_name=$${idx++}`);vals.push(display_name); }
    if (!fields.length) return res.status(400).json({ message: 'Nothing to update' });
    fields.push('updated_at=NOW()');
    vals.push(inf.id);
    await pool.query(`UPDATE src_inf_profiles SET ${fields.join(',')} WHERE id=$${idx}`, vals);
    await infAudit(pool, req.user.id, 'influencer', 'INFLUENCER_SELF_UPDATE', 'influencer', inf.id,
      null, null, null, { bio, website_url, display_name }, null);
    res.json({ message: 'Profile updated' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
