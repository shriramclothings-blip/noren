import { initDB } from '../db/db';

function uuid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `att_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

export async function createPaymentAttempt(data) {
  const db = await initDB();
  const id = data?.id || uuid();
  const row = {
    id,
    status: 'WAITING', // WAITING | PROCESSING | SUCCESS | FAILED | TIMEOUT | CANCELLED
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...data,
  };
  await db.put('paymentAttempts', row);
  return row;
}

export async function getPaymentAttempt(id) {
  const db = await initDB();
  return db.get('paymentAttempts', id);
}

export async function getPaymentAttemptByOrderId(orderId) {
  const db = await initDB();
  try {
    return await db.getFromIndex('paymentAttempts', 'orderId', orderId);
  } catch {
    // fallback: scan
    const all = await db.getAll('paymentAttempts');
    return (all || []).find((a) => a.orderId === orderId) || null;
  }
}

export async function updatePaymentAttempt(id, patch) {
  const db = await initDB();
  const current = await db.get('paymentAttempts', id);
  if (!current) return null;
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await db.put('paymentAttempts', next);
  return next;
}

export async function logPaymentEvent({ level = 'info', message, attemptId, orderId, detail }) {
  const db = await initDB();
  try {
    await db.add('paymentLogs', {
      level,
      message: String(message || ''),
      attemptId: attemptId || null,
      orderId: orderId || null,
      detail: detail == null ? null : (typeof detail === 'string' ? detail : JSON.stringify(detail)),
      date: new Date().toISOString(),
    });
  } catch {
    // never crash POS due to payment logging
  }
}

