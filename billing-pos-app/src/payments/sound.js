/**
 * payments/sound.js
 * UPI / payment-gateway success sound.
 *
 * Delegates to soundManager so the user can configure a custom sound
 * in Settings → Sound → "UPI Payment Success Sound".
 * Falls back to a pleasant triple-tone chime when no custom file is set.
 */
export { playUpiSuccessSound as playSuccessSound } from '../utils/soundManager';
