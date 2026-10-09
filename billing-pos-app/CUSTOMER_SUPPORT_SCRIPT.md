# 📞 Customer Support Script — Device ID Changed Issue

Use this when a customer reports: "My license stopped working" or "Device ID changed"

---

## Step 1: Confirm the Issue

**Ask the customer:**

> "Can you open the software and go to Settings → License & Activation tab? What is the Device ID shown there?"

**Customer provides Device ID:** (e.g., `1234-5678-ABCD-EF01`)

---

## Step 2: Check Your Records

Look up the customer's purchase record in your License Generator:

- **Original Device ID:** `XXXX-XXXX-XXXX-XXXX` (from when they purchased)
- **Current Device ID:** `1234-5678-ABCD-EF01` (what they just told you)

### If Device IDs Match ✅
The issue is something else (expired license, wrong key entered, etc.)
→ Verify their license key and expiry date

### If Device IDs Are Different ❌
Proceed to Step 3

---

## Step 3: Explain What Happened (Optional)

> "Your Device ID changed because Windows updated some hardware drivers or network settings. This can happen after Windows updates. We have a permanent fix — I'll generate a new license key for your current Device ID, and after this update, it will never change again."

---

## Step 4: Generate New License Key

1. Open your **License Generator** tool
2. Enter the **current Device ID** (what the customer just provided)
3. Set the **expiry date** (same as their original license, or extend it as goodwill)
4. Set the **edition** (STD/PRO/ENT — match their original purchase)
5. Click **Generate License Key**
6. Copy the new license key

---

## Step 5: Send New License Key

**Message to customer:**

> **Subject: Your New License Key — Device ID Issue Resolved**
>
> Hi [Customer Name],
>
> Thank you for your patience. I've generated a new license key for your current Device ID. This is a permanent fix — your license will not break again even if Windows updates.
>
> **Your New License Key:**
> ```
> XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
> ```
>
> **Activation Steps:**
> 1. Open VENDEXA RetailOS
> 2. Go to Settings → License & Activation
> 3. Paste the new license key in the "Enter License Key" field
> 4. Click "Activate License"
> 5. You're all set! ✅
>
> **Important:** Make sure you're using the latest version of the software. If you installed before [DATE], please download and install the latest version from [YOUR DOWNLOAD LINK].
>
> Let me know if you have any questions!
>
> Best regards,  
> [Your Name]  
> Dinesh Global Enterprises Pvt Ltd  
> +91-7984626447

---

## Step 6: Update Your Records

In your License Generator:

1. Add a note to their record: "Re-issued license due to Device ID change (old: XXXX-XXXX-XXXX-XXXX, new: 1234-5678-ABCD-EF01)"
2. Save the new Device ID and license key
3. Mark the issue as resolved

---

## Alternative: Restore Original Device ID (Advanced)

**Only use this if:**
- Customer is technical
- You want to preserve the original license key
- You have their original Device ID

**Instructions to send:**

> Hi [Customer Name],
>
> To restore your original Device ID so your existing license works again:
>
> 1. Press `Windows Key + R` to open Run dialog
> 2. Type: `%APPDATA%` and press Enter
> 3. Navigate to folder: `vendexa-retailos`
> 4. Create a new text file named: `vendexa_device_id.lock`
> 5. Open the file in Notepad
> 6. Type your original Device ID: `XXXX-XXXX-XXXX-XXXX`
> 7. Save and close
> 8. Restart VENDEXA RetailOS
> 9. Your original license should now work ✅
>
> Let me know if you need help with this!

**Note:** This is more complex. Issuing a new license key (Step 4-5) is easier for most customers.

---

## FAQ — Internal Use

### Q: Why did the Device ID change?
**A:** The old version generated the Device ID fresh on every launch using hardware info (MAC address, hostname). When Windows updates drivers or the customer adds a VPN, the MAC address changes → new Device ID. The new version (1.1.0+) saves the Device ID to a file on first run, so it never changes.

### Q: Will this happen again?
**A:** No, once they're on version 1.1.0+ with the fix, the Device ID is locked permanently.

### Q: Can I just give them a "universal" license key?
**A:** No. The license key is cryptographically tied to the Device ID. Each device needs its own key for security.

### Q: What if they move to a new computer?
**A:** They need a new license for the new computer (new Device ID). You can offer a discount/transfer policy if you want.

### Q: Customer deleted the Device ID file — what happens?
**A:** A new Device ID will be generated on next launch. They'll need a new license key. (Rare scenario.)

---

## Escalation

If the customer still has issues after following this script:

- Check if they're entering the license key correctly (no extra spaces, all uppercase)
- Verify the license expiry date hasn't passed
- Ask for a screenshot of the activation screen
- Remote support: TeamViewer/AnyDesk to activate on their behalf

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** ✅ Production Ready
