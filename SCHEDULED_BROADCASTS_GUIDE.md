# 📅 Scheduled Broadcasts - Complete Guide

## 🎉 New Feature: Automated Recurring Emails

Send emails automatically at specific times - daily, weekly, or custom schedules!

Perfect for:
- **Daily newsletters** - Every morning at 9 AM
- **Weekly digests** - Every Monday summary
- **Custom schedules** - Mon/Wed/Fri updates
- **One-time announcements** - Single scheduled send

---

## 🚀 Setup

### 1. Run Database Migration

```bash
cd backend
node run-broadcast-migration.js
```

Expected output:
```
✅ DATABASE_URL_1 migration complete!
📋 Created 2 broadcast tables:
   • src_email_broadcast_logs
   • src_email_scheduled_broadcasts
```

### 2. Start Email Portal

```bash
cd email-portal
npm run dev
```

Visit: http://localhost:5177

### 3. Access Feature

- Navigate to: **Scheduled Broadcasts** in the sidebar
- Or visit directly: http://localhost:5177/broadcasts

---

## ✨ Features

### Frequency Options:

#### 🌅 **Daily** - Every Day
- Sends every single day at specified time
- Perfect for: daily tips, news updates, morning briefs

#### 📆 **Weekly** - Once Per Week
- Sends once per week on the same day
- Perfect for: weekly summaries, digests

#### ⚙️ **Custom** - Select Specific Days
- Choose which days to send (Mon, Wed, Fri, etc.)
- Perfect for: business day updates, specific schedules

#### 🎯 **One Time** - Single Send
- Send once at scheduled time
- Perfect for: special announcements, events

---

## 📋 How to Use

### Create a Daily Broadcast:

1. Click **"Create Broadcast"**
2. Fill in form:
   ```
   Broadcast Name: Daily Newsletter
   Description: Morning updates for all subscribers
   Company Name: Dinesh Global Pvt Ltd
   Email Subject: Your Daily Update from Dinesh Global
   Email Template: (select or leave empty)
   Frequency: Daily
   Send Time: 09:00 (9 AM)
   Send To: All Contacts
   ✓ Start immediately
   ```
3. Click **"Create Broadcast"**
4. ✅ Done! Will send every day at 9 AM

### Create a Weekly Digest:

```
Broadcast Name: Weekly Summary
Description: Weekly digest of activities
Company Name: Dinesh Global Pvt Ltd
Email Subject: This Week at Dinesh Global
Frequency: Weekly
Send Time: 10:00 (10 AM Monday)
Send To: Subscribers Only
```

### Create Custom Schedule (Mon/Wed/Fri):

```
Broadcast Name: Business Updates
Frequency: Custom
Select Days:
☑ Monday
☐ Tuesday
☑ Wednesday
☐ Thursday
☑ Friday
☐ Saturday
☐ Sunday
Send Time: 14:00 (2 PM)
```

---

## 🎨 Professional Email Template

Your broadcasts use a beautiful, professional email template with:

✅ **Gradient Header** - Eye-catching purple gradient
✅ **Company Branding** - "Dinesh Global Pvt Ltd" prominently displayed
✅ **Responsive Design** - Looks great on mobile and desktop
✅ **Call-to-Action Buttons** - Optional CTA buttons
✅ **Social Links** - Website, email, Facebook, Twitter
✅ **Unsubscribe Link** - Compliance-friendly
✅ **Professional Footer** - Company info and copyright

Template features:
- Personalized greeting (`Hello {{recipient_name}}`)
- Company name throughout
- "Excellence in Every Detail" tagline
- Feature highlight boxes
- Clean, modern design
- Mobile-optimized

---

## 🎯 Audience Targeting

### All Contacts
- Sends to everyone in your database
- Use for: general announcements, company-wide updates

### Subscribers Only
- Only newsletter subscribers
- Use for: newsletter content, subscriber-exclusive updates

### Customers Only
- Only users who have placed orders
- Use for: customer appreciation, loyalty programs

### Custom Email List
- Paste specific email addresses
- Use for: VIP lists, specific groups, testing

Example custom list:
```
john@example.com, jane@example.com
ceo@company.com
team@business.com
```

---

## 🕐 Scheduling Details

### Send Time Format:
- 24-hour format: `09:00`, `14:30`, `18:00`
- Server timezone applies
- Example times:
  - `09:00` = 9 AM
  - `12:00` = 12 PM (noon)
  - `18:30` = 6:30 PM

### Next Run Time:
- Automatically calculated
- Shows in broadcast list
- Updates after each send

### Example Schedules:
```
Daily at 9 AM:
  Frequency: Daily
  Send Time: 09:00
  
Weekly Monday at 10 AM:
  Frequency: Weekly
  Send Time: 10:00
  
Mon/Wed/Fri at 2 PM:
  Frequency: Custom
  Days: [1, 3, 5]
  Send Time: 14:00
```

---

## 🔧 Broadcast Management

### View All Broadcasts:
- Go to Scheduled Broadcasts page
- See list of all broadcasts
- Shows: name, frequency, time, status, next run, total sent

### Pause Broadcast:
- Click **pause icon** (⏸️)
- Broadcast stops sending
- Can be activated again anytime

### Activate Broadcast:
- Click **play icon** (▶️)
- Broadcast resumes schedule
- Will send at next scheduled time

### Edit Broadcast:
- Click **edit icon** (✏️)
- Update any settings
- Save changes

### Delete Broadcast:
- Click **delete icon** (🗑️)
- Confirm deletion
- Broadcast removed permanently

### Send Now:
- Manual trigger (coming soon)
- Send broadcast immediately
- Useful for testing or urgent sends

---

## 📊 Tracking & Statistics

### Per Broadcast:
- **Total Sent**: How many emails sent total
- **Next Run**: When it will send next
- **Last Run**: When it last sent
- **Created Date**: When broadcast was created

### Broadcast Logs:
- Each send is logged
- Track recipients count
- Monitor success rate
- View send history

---

## 🎯 Use Cases

### 1. Daily Newsletter
```
Name: Morning Newsletter
Frequency: Daily
Time: 09:00
Audience: Subscribers
Subject: Today's Top Stories from Dinesh Global
```
**Perfect for**: Regular content delivery, keeping audience engaged

### 2. Weekly Digest
```
Name: Weekly Summary
Frequency: Weekly
Time: 10:00 (Mondays)
Audience: All Contacts
Subject: This Week at Dinesh Global - Highlights & Updates
```
**Perfect for**: Weekly summaries, recap emails

### 3. Business Days Only
```
Name: Business Updates
Frequency: Custom (Mon-Fri)
Time: 14:00
Audience: Customers
Subject: Daily Business Update from Dinesh Global
```
**Perfect for**: B2B communications, business hours updates

### 4. Twice Weekly Tips
```
Name: Productivity Tips
Frequency: Custom (Tue, Thu)
Time: 11:00
Audience: Subscribers
Subject: 💡 Tip of the Day from Dinesh Global
```
**Perfect for**: Regular engagement without overwhelming

### 5. Weekend Update
```
Name: Weekend Special
Frequency: Custom (Sat, Sun)
Time: 08:00
Audience: All Contacts
Subject: Weekend Deals from Dinesh Global
```
**Perfect for**: Weekend promotions, leisure content

---

## 💡 Best Practices

### Timing:
✅ **DO:**
- Send at consistent times
- Consider your audience's timezone
- Test different times to find what works
- Business emails: 9-11 AM or 2-4 PM
- Consumer emails: 6-8 PM or 8-10 AM

❌ **DON'T:**
- Send too early (before 7 AM)
- Send too late (after 9 PM)
- Change send times frequently
- Send during major holidays

### Frequency:
✅ **DO:**
- Start with less frequent (weekly)
- Increase gradually if engagement is good
- Match frequency to content value
- Daily = very high value required

❌ **DON'T:**
- Send daily unless absolutely valuable
- Overwhelm subscribers
- Send empty or thin content
- Spam with promotions only

### Content:
✅ **DO:**
- Provide consistent value
- Use clear, engaging subjects
- Include clear CTA
- Test content before automating
- Monitor engagement metrics

❌ **DON'T:**
- Send generic content
- Over-promise in subject
- Forget to proofread
- Ignore unsubscribes
- Reuse old content

---

## 🔒 Important Notes

### Compliance:
- All broadcasts include unsubscribe link
- Honor unsubscribe requests immediately
- Keep accurate recipient lists
- Follow email marketing laws (CAN-SPAM, GDPR)

### Monitoring:
- Check broadcast logs regularly
- Monitor bounce rates
- Track engagement
- Adjust frequency if needed

### Testing:
- Always test with small group first
- Use "Custom Email List" for testing
- Send to your own email
- Check on mobile and desktop

---

## 🚦 Quick Start Checklist

Before creating your first broadcast:

- [ ] Run database migration (`node run-broadcast-migration.js`)
- [ ] Have contacts in your database
- [ ] Verify email sending works (test from Compose)
- [ ] Choose frequency and time
- [ ] Write compelling subject line
- [ ] Test with your own email first
- [ ] Monitor first few sends
- [ ] Adjust based on engagement

---

## 📈 Success Metrics

Track these to measure broadcast success:

- **Open Rate**: % of recipients who open
  - Good: > 20%
  - Average: 15-20%
  - Needs work: < 15%

- **Click Rate**: % who click links
  - Good: > 3%
  - Average: 2-3%
  - Needs work: < 2%

- **Unsubscribe Rate**: % who unsubscribe
  - Good: < 0.5%
  - Acceptable: 0.5-1%
  - Problem: > 1%

- **Bounce Rate**: % failed delivery
  - Good: < 2%
  - Acceptable: 2-5%
  - Problem: > 5%

---

## 🆘 Troubleshooting

### Issue: Broadcast not sending

**Check:**
1. Is broadcast **Active** (not Paused)?
2. Is **Next Run Time** correct?
3. Are there **contacts** to send to?
4. Is **backend running**?

**Solution:**
- Activate broadcast if paused
- Check send time is in future
- Add contacts if none exist
- Verify backend deployment

### Issue: Emails going to spam

**Solutions:**
- Warm up your domain slowly
- Don't use spammy words in subject
- Include unsubscribe link (already included)
- Maintain clean email list
- Don't send too frequently

### Issue: Low open rates

**Solutions:**
- Improve subject lines (A/B test)
- Send at different times
- Reduce frequency
- Segment your audience better
- Provide more value in content

---

## 🎓 Example Scenarios

### Scenario 1: Company Newsletter

**Goal**: Keep all employees informed daily

**Setup:**
```
Name: Daily Company News
Frequency: Daily
Days: Monday-Friday (Custom: 1,2,3,4,5)
Time: 09:00
Audience: All Contacts (employees)
Subject: Today at Dinesh Global - {{date}}
```

### Scenario 2: Customer Engagement

**Goal**: Re-engage customers twice weekly

**Setup:**
```
Name: Customer Tips & Tricks
Frequency: Custom (Tuesday, Thursday)
Time: 11:00
Audience: Customers Only
Subject: 💡 Pro Tip from Dinesh Global
```

### Scenario 3: Weekend Promotions

**Goal**: Drive weekend sales

**Setup:**
```
Name: Weekend Specials
Frequency: Custom (Saturday, Sunday)
Time: 08:00
Audience: Subscribers
Subject: 🎉 Weekend Sale at Dinesh Global!
```

---

## 🎉 You're Ready!

Scheduled Broadcasts is now live and ready to use!

### Quick Actions:
1. ✅ Run migration
2. ✅ Create your first broadcast
3. ✅ Test with your email
4. ✅ Monitor first sends
5. ✅ Optimize and scale

**Everything is working with proper logic!** 🚀

Start automating your email communications with Dinesh Global Pvt Ltd branding! 📧✨
