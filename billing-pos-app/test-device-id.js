/**
 * Test Device ID Stability
 * 
 * This script simulates the Device ID generation logic and shows you
 * what the ID would be. Run it multiple times to verify stability.
 * 
 * Usage:
 *   node test-device-id.js
 */

const os = require('os');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Simulate Electron's userData path
const TEST_USER_DATA = path.join(__dirname, '.test-userdata');
if (!fs.existsSync(TEST_USER_DATA)) {
  fs.mkdirSync(TEST_USER_DATA, { recursive: true });
}

function getDeviceIdFilePath() {
  return path.join(TEST_USER_DATA, 'vendexa_device_id.lock');
}

function generateHardwareFingerprint() {
  try {
    const cpus = os.cpus();
    const cpuModel = cpus && cpus.length > 0 ? cpus[0].model : 'UNKNOWN_CPU';

    const interfaces = os.networkInterfaces();
    let mac = 'NO_MAC';
    for (const iface of Object.values(interfaces)) {
      for (const addr of (iface || [])) {
        if (!addr.internal && addr.mac && addr.mac !== '00:00:00:00:00:00') {
          mac = addr.mac.toUpperCase().replace(/:/g, '');
          break;
        }
      }
      if (mac !== 'NO_MAC') break;
    }

    const hostname = os.hostname() || 'UNKNOWN_HOST';
    const platform = os.platform() || 'UNKNOWN_PLATFORM';
    const arch = os.arch() || 'UNKNOWN_ARCH';

    let machineGuid = 'NO_GUID';
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        const out = execSync(
          'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
          { timeout: 3000, encoding: 'utf8' }
        );
        const match = out.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/);
        if (match) machineGuid = match[1].trim().toUpperCase();
      } catch {}
    }

    const raw = [cpuModel, mac, hostname, platform, arch, machineGuid].join('|');
    console.log('\n📊 Hardware Fingerprint Components:');
    console.log('   CPU Model:', cpuModel);
    console.log('   MAC Address:', mac);
    console.log('   Hostname:', hostname);
    console.log('   Platform:', platform);
    console.log('   Architecture:', arch);
    console.log('   Machine GUID:', machineGuid);
    console.log('   Raw String:', raw);

    const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
    const short = hash.slice(0, 16);
    return short.match(/.{1,4}/g).join('-');
  } catch (err) {
    const fallback = `${os.hostname()}|${os.platform()}|${os.arch()}`;
    const hash = crypto.createHash('sha256').update(fallback).digest('hex').toUpperCase();
    const short = hash.slice(0, 16);
    return short.match(/.{1,4}/g).join('-');
  }
}

function getHardwareFingerprint() {
  const lockFile = getDeviceIdFilePath();

  // Check if stored
  try {
    if (fs.existsSync(lockFile)) {
      const stored = fs.readFileSync(lockFile, 'utf-8').trim();
      if (/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/i.test(stored)) {
        console.log('\n✅ Device ID Found (Reading from file)');
        console.log('   File:', lockFile);
        return stored.toUpperCase();
      }
    }
  } catch {}

  // Generate new
  console.log('\n🆕 First Run - Generating Device ID');
  const newId = generateHardwareFingerprint();
  try {
    fs.writeFileSync(lockFile, newId, { encoding: 'utf-8', mode: 0o600 });
    console.log('\n💾 Device ID Saved to:', lockFile);
  } catch (writeErr) {
    console.error('\n❌ Failed to save Device ID:', writeErr.message);
  }
  return newId;
}

// Main
console.log('═══════════════════════════════════════════════════════════');
console.log('  VENDEXA RetailOS™ — Device ID Test');
console.log('═══════════════════════════════════════════════════════════');

const deviceId = getHardwareFingerprint();

console.log('\n┌────────────────────────────────────────────────────────┐');
console.log('│                                                        │');
console.log(`│  Device ID: ${deviceId}                  │`);
console.log('│                                                        │');
console.log('└────────────────────────────────────────────────────────┘');

console.log('\n💡 To test stability:');
console.log('   1. Run this script again → Device ID should be identical');
console.log('   2. To simulate a fresh install, delete:');
console.log(`      ${TEST_USER_DATA}`);
console.log('   3. Run again → New Device ID will be generated');

console.log('\n═══════════════════════════════════════════════════════════\n');
