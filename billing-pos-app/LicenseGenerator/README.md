# VENDEXA License Generator — Private Internal Tool

> ⚠️ **PRIVATE — Do NOT share this folder or its contents with anyone.**

---

## How to Run

### Method 1: Double-click `start.bat`
The easiest way. Just double-click `start.bat` in this folder.

### Method 2: Command line
```
cd LicenseGenerator
npm start
```

### Method 3: Build portable .exe
```
cd LicenseGenerator
npm run build
```
The `.exe` will appear in `LicenseGenerator/dist/`.

---

## How to Generate a License

1. Customer opens **VENDEXA RetailOS** on their device
2. They go to **Settings → License**
3. They copy their **Device ID** (e.g. `A3F2-9B1C-77DE-4421`)
4. They share it with you (WhatsApp / phone)
5. You open this tool → **Generate License** tab
6. Fill in:
   - Customer Name, Phone (required)
   - Business Name, Email, City (optional)
   - Device ID (paste from customer)
   - Edition: STD / PRO / ENT
   - License Type: Lifetime / Annual / Custom
7. Click **⚡ Generate License Key**
8. Click **📋 Copy** to copy the key
9. Send the key to the customer via WhatsApp/SMS
10. Click **💾 Save to Customer Records**

---

## Customer Activates

Customer opens VENDEXA RetailOS → Settings → License → pastes key → **Activate**.

Done. The software will show "Software Activated ✓".

---

## Data Storage

All license records are stored locally in:
```
%APPDATA%\vendexa-license-generator\licenses_db.json
```

You can export to CSV or JSON from the **Customer Records** tab anytime.

---

## Security Notes

- This tool contains the **secret HMAC key**. Keep it safe.
- The same key is embedded (obfuscated) in the billing app.
- If you ever want to rotate the key, you must update **both** this tool AND the billing app and rebuild.
- Never share `main.js` or `licenseManager.js` with anyone.

---

## Editions

| Code | Name          | Use case               |
|------|---------------|------------------------|
| STD  | Standard      | Basic retail shops     |
| PRO  | Professional  | Mid-size stores        |
| ENT  | Enterprise    | Large / multi-location |

## License Types

| Type     | Expiry String          |
|----------|------------------------|
| Lifetime | `LIFETIME`             |
| Annual   | `YYYY-MON-DD`          |
| Custom   | Any date you pick      |
