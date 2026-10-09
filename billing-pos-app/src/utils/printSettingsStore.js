import { getSetting, setSetting } from '../db/db';
import { DEFAULT_PRINT_SETTINGS, PRINT_SETTINGS_STORAGE_KEY } from './printSettingsDefaults';

function deepMerge(target, source) {
  if (typeof target !== 'object' || target === null) return source;
  if (typeof source !== 'object' || source === null) return target;

  const out = Array.isArray(target) ? [...target] : { ...target };
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function sanitizePrintSettings(maybe) {
  if (!maybe || typeof maybe !== 'object') return structuredClone(DEFAULT_PRINT_SETTINGS);
  // Basic backward compatible merge of defaults with stored settings.
  try {
    return deepMerge(structuredClone(DEFAULT_PRINT_SETTINGS), maybe);
  } catch {
    // Fallback if structuredClone not available
    return deepMerge(JSON.parse(JSON.stringify(DEFAULT_PRINT_SETTINGS)), maybe);
  }
}

export async function loadPrintSettings() {
  const value = await getSetting(PRINT_SETTINGS_STORAGE_KEY);
  // getSetting returns the stored value (not the full row)
  return sanitizePrintSettings(value);

}

export async function savePrintSettings(settings) {
  const sanitized = sanitizePrintSettings(settings);
  await setSetting(PRINT_SETTINGS_STORAGE_KEY, sanitized);
  return sanitized;
}

