import { logEvent } from '../utils/logger';

export async function getLocalWebhookUrl() {
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.paytm?.getLocalWebhookUrl) {
      return await window.electronAPI.paytm.getLocalWebhookUrl();
    }
  } catch {}
  return null;
}

export async function paytmCreateQr({ settings, orderId, amount, invoiceNumber, customerPhone }) {
  try {
    if (!window?.electronAPI?.paytm?.createQr) {
      return { success: false, error: 'Paytm API is only available in the desktop (Electron) app.' };
    }

    const resp = await window.electronAPI.paytm.createQr({
      mid: settings.paytmMid,
      merchantKey: settings.paytmMerchantKey,
      amount: String(amount),
      orderId,
      posId: settings.posId || 'POS-1',
      env: settings.environment,
      orderDetails: 'POS Bill',
      invoiceDetails: invoiceNumber ? `#${invoiceNumber}` : undefined,
      contactPhoneNo: customerPhone || undefined,
      displayName: settings.displayName || undefined,
      imageRequired: true,
    });

    if (!resp?.success) {
      await logEvent('warn', 'Paytm create QR failed', resp);
      return resp || { success: false, error: 'Unknown error' };
    }

    const body = resp.data?.body || {};
    // body.qrData (string) or body.image (base64)
    return {
      success: true,
      qrCodeId: body.qrCodeId,
      qrData: body.qrData,
      qrImageBase64: body.image,
      raw: resp,
    };
  } catch (err) {
    await logEvent('error', 'Paytm create QR crash', { error: err?.message || String(err) });
    return { success: false, error: err?.message || String(err) };
  }
}

export async function paytmOrderStatus({ settings, orderId }) {
  try {
    if (!window?.electronAPI?.paytm?.orderStatus) {
      return { success: false, error: 'Paytm API is only available in the desktop (Electron) app.' };
    }

    const resp = await window.electronAPI.paytm.orderStatus({
      mid: settings.paytmMid,
      merchantKey: settings.paytmMerchantKey,
      orderId,
      env: settings.environment,
    });

    if (!resp?.success) {
      await logEvent('warn', 'Paytm status check failed', resp);
      return resp || { success: false, error: 'Unknown error' };
    }

    const body = resp.data?.body || {};
    return {
      success: true,
      resultStatus: body?.resultInfo?.resultStatus,
      resultCode: body?.resultInfo?.resultCode,
      resultMsg: body?.resultInfo?.resultMsg,
      txnId: body?.txnId,
      bankTxnId: body?.bankTxnId,
      txnAmount: body?.txnAmount,
      paymentMode: body?.paymentMode,
      txnDate: body?.txnDate,
      raw: resp,
    };
  } catch (err) {
    await logEvent('error', 'Paytm status check crash', { error: err?.message || String(err) });
    return { success: false, error: err?.message || String(err) };
  }
}

export function mapPaytmStatusToUi(resultStatus) {
  const s = String(resultStatus || '').toUpperCase();
  if (s === 'TXN_SUCCESS') return 'success';
  if (s === 'TXN_FAILURE') return 'failed';
  if (s === 'PENDING') return 'processing';
  if (s === 'NO_RECORD_FOUND') return 'waiting';
  return 'processing';
}

