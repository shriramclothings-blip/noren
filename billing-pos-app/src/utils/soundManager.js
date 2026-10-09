/**
 * soundManager.js
 * Central sound management for the POS system.
 *
 * Supports multiple named sound slots, each independently configurable
 * with a custom MP3/WAV/OGG file (stored as base64 data URLs in company settings).
 *
 * Each slot falls back to a built-in Web Audio API tone when no custom file is set.
 *
 * SOUND SLOTS:
 *   checkout        — plays when a cash/card/credit invoice is saved
 *   upiSuccess      — plays when a UPI payment is confirmed
 *   itemAdded       — plays when an item is added to the cart
 *   newSale         — plays when POS is reset / new sale starts
 *   error           — plays on validation errors / failed operations
 *   startup         — plays once when the app loads (optional)
 *   partialPayment  — plays when a split/partition payment is confirmed
 */

// Internal registry: key → Audio instance (null = use built-in fallback)
const _registry = {};

// ─── Load / Unload ────────────────────────────────────────────────────────────

/**
 * Load (or replace) a named sound slot from a base64 data URL.
 * Pass null/empty to clear the slot (will use built-in fallback).
 *
 * @param {string} slot  - One of the SOUND SLOT keys listed above
 * @param {string} src   - base64 data URL e.g. "data:audio/mpeg;base64,..."
 */
export function loadSound(slot, src) {
  try {
    if (!src) {
      _registry[slot] = null;
      return;
    }
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.load();
    _registry[slot] = audio;
  } catch {
    _registry[slot] = null;
  }
}

/**
 * Bulk-load all slots from the company settings object.
 * Call this once on app start and whenever settings are saved.
 *
 * Expected keys in `settings`:
 *   checkoutSoundEnabled / checkoutSoundSrc
 *   upiSuccessSoundEnabled / upiSuccessSoundSrc
 *   itemAddedSoundEnabled  / itemAddedSoundSrc
 *   newSaleSoundEnabled    / newSaleSoundSrc
 *   errorSoundEnabled      / errorSoundSrc
 *   startupSoundEnabled    / startupSoundSrc
 *   partialPaymentSoundEnabled / partialPaymentSoundSrc
 *
 * @param {object} settings - company settings object from AppContext
 */
export function loadAllSounds(settings) {
  const s = settings || {};

  loadSound('checkout',       (s.checkoutSoundEnabled       && s.checkoutSoundSrc)       ? s.checkoutSoundSrc       : null);
  loadSound('upiSuccess',     (s.upiSuccessSoundEnabled     && s.upiSuccessSoundSrc)     ? s.upiSuccessSoundSrc     : null);
  loadSound('itemAdded',      (s.itemAddedSoundEnabled      && s.itemAddedSoundSrc)      ? s.itemAddedSoundSrc      : null);
  loadSound('newSale',        (s.newSaleSoundEnabled        && s.newSaleSoundSrc)        ? s.newSaleSoundSrc        : null);
  loadSound('error',          (s.errorSoundEnabled          && s.errorSoundSrc)          ? s.errorSoundSrc          : null);
  loadSound('startup',        (s.startupSoundEnabled        && s.startupSoundSrc)        ? s.startupSoundSrc        : null);
  loadSound('partialPayment', (s.partialPaymentSoundEnabled && s.partialPaymentSoundSrc) ? s.partialPaymentSoundSrc : null);
}

// ─── Play ─────────────────────────────────────────────────────────────────────

/**
 * Play a named sound slot.
 * If a custom file is loaded, plays it. Otherwise plays the built-in fallback tone.
 * Non-blocking — errors are swallowed so billing is never interrupted.
 *
 * @param {string} slot - Sound slot key
 */
export function playSound(slot) {
  try {
    const audio = _registry[slot];
    if (audio) {
      audio.currentTime = 0;
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } else {
      _playBuiltinFallback(slot);
    }
  } catch {
    // never crash billing on audio failure
  }
}

// ─── Named convenience helpers (backward-compatible) ─────────────────────────

/** Plays checkout complete sound (cash / card / credit sales). */
export function playCheckoutSound()       { playSound('checkout'); }

/** Plays UPI payment success sound. */
export function playUpiSuccessSound()     { playSound('upiSuccess'); }

/** Plays item-added-to-cart sound. */
export function playItemAddedSound()      { playSound('itemAdded'); }

/** Plays new-sale / cart-cleared sound. */
export function playNewSaleSound()        { playSound('newSale'); }

/** Plays error / validation failure sound. */
export function playErrorSound()          { playSound('error'); }

/** Plays startup / app-launch sound. */
export function playStartupSound()        { playSound('startup'); }

/** Plays partial / split payment confirmed sound. */
export function playPartialPaymentSound() { playSound('partialPayment'); }

// ─── Built-in Web Audio fallbacks ─────────────────────────────────────────────

function _playBuiltinFallback(slot) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const configs = {
      checkout: [
        { freq: 660, start: 0,    end: 0.12, gain: 0.18 },
        { freq: 880, start: 0.13, end: 0.25, gain: 0.14 },
      ],
      upiSuccess: [
        { freq: 523, start: 0,    end: 0.10, gain: 0.18 },
        { freq: 659, start: 0.11, end: 0.20, gain: 0.15 },
        { freq: 784, start: 0.21, end: 0.35, gain: 0.12 },
      ],
      itemAdded: [
        { freq: 800, start: 0, end: 0.07, gain: 0.08 },
      ],
      newSale: [
        { freq: 440, start: 0,    end: 0.08, gain: 0.10 },
        { freq: 550, start: 0.09, end: 0.17, gain: 0.10 },
      ],
      error: [
        { freq: 220, start: 0,    end: 0.12, gain: 0.20 },
        { freq: 180, start: 0.13, end: 0.26, gain: 0.18 },
      ],
      startup: [
        { freq: 440, start: 0,    end: 0.10, gain: 0.12 },
        { freq: 550, start: 0.11, end: 0.20, gain: 0.10 },
        { freq: 660, start: 0.21, end: 0.35, gain: 0.08 },
      ],
      partialPayment: [
        { freq: 600, start: 0,    end: 0.10, gain: 0.14 },
        { freq: 750, start: 0.11, end: 0.22, gain: 0.12 },
      ],
    };

    const tones = configs[slot] || [{ freq: 880, start: 0, end: 0.20, gain: 0.12 }];
    const lastEnd = Math.max(...tones.map(t => t.end));

    tones.forEach(({ freq, start, end, gain }) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, ctx.currentTime + start);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + end);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + end + 0.01);
    });

    setTimeout(() => { try { ctx.close(); } catch {} }, (lastEnd + 0.1) * 1000);
  } catch {
    // silence
  }
}
