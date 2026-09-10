# 🧪 Campaigns, Contacts & Automation - Complete Testing Guide

## 🎯 Overview

This guide will help you test all three newly implemented features:
1. **Campaigns** - Send bulk emails to your audience
2. **Contacts** - Manage your email list
3. **Automation** - Set up automated email workflows

---

## 🚀 Setup (Do This First)

### 1. Start the Email Portal

```bash
cd email-portal
npm run dev
```

Visit: http://localhost:5177

### 2. Login

- **Email**: admin@norenfashion.in
- **Password**: Noren@Admin2024

---

## 📧 TEST 1: CONTACTS MANAGEMENT

### Test 1.1: Add Contact Manually

1. Go to **Contacts** page (http://localhost:5177/contacts)
2. Click **"Add Contact"** button
3. Fill in the form:
   ```
   Email: test1@example.com
   Name: Test User 1
   Phone: +1234567890
   Company: Test Corp
   Tags: vip, customer
   ```
4. Click **"Add Contact"**
5. ✅ **Expected**: Toast shows "Contact added successfully!"
6. ✅ **Expected**: New contact appears in the list

### Test 1.2: Add Multiple Contacts

Repeat Test 1.1 with:
- test2@example.com (Name: Test User 2)
- test3@example.com (Name: Test User 3)
- your-real-email@gmail.com (Your actual email for testing)

### Test 1.3: Search Contacts

1. In the search box, type: "test1"
2. ✅ **Expected**: Only contacts matching "test1" appear
3. Clear search
4. ✅ **Expected**: All contacts appear again

### Test 1.4: Filter by Type

1. Click the **Type dropdown**
2. Select **"Manual"**
3. ✅ **Expected**: Only manually added contacts appear
4. Select **"All Types"**
5. ✅ **Expected**: All contacts appear

### Test 1.5: Import Contacts via CSV

1. Click **"Import"** button
2. Click **"Download CSV Template"**
3. Open the downloaded template in Excel/Notepad
4. Add more contacts:
   ```csv
   email,name,phone,company,tags
   bulk1@example.com,Bulk User 1,+1111111111,Bulk Inc,bulk
   bulk2@example.com,Bulk User 2,+2222222222,Bulk Inc,bulk
   bulk3@example.com,Bulk User 3,+3333333333,Bulk Inc,bulk
   ```
5. Save as `contacts.csv`
6. Click **"Click to upload CSV file"**
7. Select your `contacts.csv`
8. ✅ **Expected**: Preview shows your CSV data
9. Click **"Import Contacts"**
10. ✅ **Expected**: "Contacts imported successfully!" toast
11. ✅ **Expected**: New contacts appear in list

### Test 1.6: Delete Contact

1. Find "test3@example.com" in the list
2. Click the **delete icon** (trash can)
3. Confirm deletion
4. ✅ **Expected**: "Contact deleted" toast
5. ✅ **Expected**: Contact removed from list

---

## 📮 TEST 2: CAMPAIGNS

### Test 2.1: Create Simple Campaign

1. Go to **Campaigns** page (http://localhost:5177/campaigns)
2. Click **"Create Campaign"** button
3. Fill in the form:
   ```
   Campaign Name: Test Campaign 1
   Email Subject: 🎉 Special Offer Just for You!
   Email Template: Select "Welcome Email"
   Campaign Type: One Time
   Send To: All Contacts
   Schedule: Leave empty (send immediately)
   ```
4. Click **"Create & Send"**
5. ✅ **Expected**: "Campaign created successfully!" toast
6. ✅ **Expected**: Redirected to campaigns list
7. ✅ **Expected**: New campaign appears with status

### Test 2.2: Create Campaign with Custom Email List

1. Click **"Create Campaign"**
2. Fill in:
   ```
   Campaign Name: Custom List Test
   Email Subject: Testing Custom Recipients
   Send To: Custom Email List
   Email List: 
   test1@example.com, test2@example.com
   your-real-email@gmail.com
   ```
3. Select a template
4. Click **"Create & Send"**
5. ✅ **Expected**: Campaign created
6. ✅ **Expected**: Check your real email inbox - you should receive the email!

### Test 2.3: Create Scheduled Campaign

1. Click **"Create Campaign"**
2. Fill in campaign details
3. For **Schedule**, select a time 5 minutes from now
4. Click **"Schedule Campaign"**
5. ✅ **Expected**: Campaign created with "scheduled" status
6. ✅ **Expected**: Email will be sent at scheduled time

### Test 2.4: View Campaign Details

1. In campaigns list, click on a campaign name
2. ✅ **Expected**: Opens campaign detail page
3. ✅ **Expected**: Shows campaign info, recipients, stats

### Test 2.5: Send Draft Campaign

1. Find a campaign with "draft" status
2. Click the **send icon** (paper plane)
3. Confirm sending
4. ✅ **Expected**: Campaign status changes to "sent"
5. ✅ **Expected**: Recipients receive emails

### Test 2.6: Delete Campaign

1. Find a test campaign
2. Click the **delete icon** (trash can)
3. Confirm deletion
4. ✅ **Expected**: "Campaign deleted" toast
5. ✅ **Expected**: Campaign removed from list

---

## 🤖 TEST 3: AUTOMATION

### Test 3.1: Create Welcome Email Automation

1. Go to **Automation** page (http://localhost:5177/automation)
2. Click **"Create Automation"**
3. Fill in the form:
   ```
   Automation Name: Welcome New Users
   Description: Send welcome email when user signs up
   Trigger Event: User Signup
   Delay: 0 (immediate)
   Email Template: Select "Welcome Email"
   Start immediately: ✓ (checked)
   ```
4. Click **"Create Automation"**
5. ✅ **Expected**: "Automation created successfully!" toast
6. ✅ **Expected**: New automation appears with "Active" status

### Test 3.2: Create Order Confirmation Automation

1. Click **"Create Automation"**
2. Fill in:
   ```
   Automation Name: Order Confirmation
   Description: Send confirmation when order is placed
   Trigger Event: Order Placed
   Delay: 0
   Email Template: Select "Order Confirmation"
   ```
3. Click **"Create Automation"**
4. ✅ **Expected**: Automation created and active

### Test 3.3: Create Delayed Automation

1. Click **"Create Automation"**
2. Fill in:
   ```
   Automation Name: Follow Up Email
   Description: Send follow-up 24 hours after signup
   Trigger Event: User Signup
   Delay: 1440 (24 hours in minutes)
   Email Template: Select any template
   ```
3. Click **"Create Automation"**
4. ✅ **Expected**: Shows "1440 min" in Delay column

### Test 3.4: Create Cart Abandonment Automation

1. Click **"Create Automation"**
2. Fill in:
   ```
   Automation Name: Cart Abandonment Reminder
   Trigger Event: Cart Abandoned
   Delay: 60 (1 hour)
   Email Template: Select template
   ```
3. ✅ **Expected**: Automation created successfully

### Test 3.5: Pause Automation

1. Find an active automation
2. Click the **pause icon** (pause symbol)
3. ✅ **Expected**: Status changes to "Paused"
4. ✅ **Expected**: Badge color changes to gray

### Test 3.6: Activate Automation

1. Find a paused automation
2. Click the **play icon** (play symbol)
3. ✅ **Expected**: Status changes to "Active"
4. ✅ **Expected**: Badge color changes to green

### Test 3.7: Delete Automation

1. Find a test automation
2. Click the **delete icon**
3. Confirm deletion
4. ✅ **Expected**: "Automation deleted" toast
5. ✅ **Expected**: Automation removed from list

---

## 🔄 TEST 4: INTEGRATION TESTING

### Test 4.1: Complete Workflow

1. **Add a contact**:
   - Go to Contacts
   - Add: workflow-test@example.com

2. **Create a campaign** for that contact:
   - Go to Campaigns
   - Create campaign with "Custom Email List"
   - Use: workflow-test@example.com
   - Send immediately

3. **Check campaign sent**:
   - Go to Sent page
   - ✅ **Expected**: See the sent email

4. **Set up automation**:
   - Go to Automation
   - Create "User Signup" automation
   - Make it active

5. ✅ **Expected**: All features work together seamlessly

### Test 4.2: Verify Email Delivery

1. Use your **real email address** in tests
2. **Send campaign** to your email
3. **Check inbox** (and spam folder)
4. ✅ **Expected**: Email arrives within 1-2 minutes
5. ✅ **Expected**: Email content matches template

---

## 🐛 TROUBLESHOOTING

### Issue: Contacts not appearing

**Solution:**
```bash
# Check if contacts exist
cd backend
node -e "const {pool} = require('./config/db'); pool.query('SELECT COUNT(*) FROM src_users').then(r => console.log('Users:', r.rows[0].count))"
```

### Issue: Campaign creation fails

**Check:**
1. Are templates seeded? Go to Templates page
2. Are contacts available? Go to Contacts page
3. Check browser console (F12) for errors

**Fix:**
```bash
cd backend
node seed-email-portal.js
```

### Issue: CSV import fails

**Common causes:**
- CSV format incorrect
- Invalid email addresses
- File encoding issue

**Solution:**
- Use the downloaded template
- Ensure valid email format: name@domain.com
- Save as UTF-8 CSV

### Issue: Automation not triggering

**Remember:**
- Automations trigger based on backend events
- Backend must fire the trigger (e.g., user signup, order placed)
- Check automation is Active (not Paused)

**Test automation:**
```bash
cd backend
# Test if automation triggers (requires backend implementation)
node test-automation.js
```

### Issue: "Failed to load [X]"

**Solution:**
1. Check backend is running: https://noren-iqk3.onrender.com/api/health
2. Check browser console for network errors
3. Verify API endpoints exist in backend

---

## ✅ SUCCESS CHECKLIST

After testing, verify:

### Contacts:
- [ ] Can add contacts manually
- [ ] Can import contacts from CSV
- [ ] Search works correctly
- [ ] Filter by type works
- [ ] Can delete contacts
- [ ] Pagination works (if >50 contacts)

### Campaigns:
- [ ] Can create campaign with template
- [ ] Can select audience (all/segment/custom)
- [ ] Can schedule campaigns
- [ ] Can send immediately
- [ ] Can view campaign list with stats
- [ ] Can delete campaigns
- [ ] Emails are actually received

### Automation:
- [ ] Can create automation with triggers
- [ ] Can set delays
- [ ] Can pause/activate automations
- [ ] Can delete automations
- [ ] Automation list shows correctly
- [ ] Status badges work

### Integration:
- [ ] Contacts → Campaigns workflow works
- [ ] Campaigns → Sent emails tracked
- [ ] Automation triggers connect to templates
- [ ] Real emails delivered to inbox

---

## 📊 EXPECTED RESULTS

After running all tests, you should have:

- **~10 contacts** in your Contacts list
- **3-5 campaigns** created (some sent, some draft)
- **4-5 automations** set up (some active, some paused)
- **Real emails** in your inbox from campaigns
- **No errors** in browser console
- **All features** working smoothly

---

## 🎉 NEXT STEPS

Once testing is complete:

1. **Customize templates** - Edit default templates in Templates page
2. **Import real contacts** - Upload your actual customer list
3. **Create real campaigns** - Send to your audience
4. **Set up key automations**:
   - Welcome emails
   - Order confirmations
   - Cart abandonment
   - Re-engagement campaigns

5. **Monitor analytics** - Track opens, clicks, conversions

---

## 🆘 NEED HELP?

If something doesn't work:

1. **Check browser console** (F12 → Console tab)
2. **Check backend logs** on Render dashboard
3. **Verify database** has all email portal tables
4. **Re-run migration** if needed:
   ```bash
   cd backend
   node migrate-all-databases.js
   node seed-all-databases.js
   ```

---

## 📝 TEST REPORT TEMPLATE

After testing, record results:

```
CONTACTS: ✅ All tests passed / ❌ Issues found
- Manual add: ✅
- CSV import: ✅
- Search: ✅
- Filter: ✅
- Delete: ✅

CAMPAIGNS: ✅ All tests passed / ❌ Issues found
- Create: ✅
- Send: ✅
- Schedule: ✅
- Delete: ✅
- Email delivery: ✅

AUTOMATION: ✅ All tests passed / ❌ Issues found
- Create: ✅
- Toggle: ✅
- Delete: ✅
- List view: ✅

INTEGRATION: ✅ Works perfectly / ❌ Issues found
- End-to-end workflow: ✅
- Real email delivery: ✅
```

---

**All features are ready to use!** 🚀

Start testing and let me know if you find any issues!
