/**
 * checkoutSound.js
 * Backward-compatible shim — delegates to soundManager.js.
 *
 * Any existing import of loadCheckoutSound / playCheckoutSound continues
 * to work without changes. New code should import from soundManager directly.
 */
export { loadSound as loadCheckoutSound, playCheckoutSound } from './soundManager';
