# Shri Ram Clothings Billing System - Quick Reference Guide

## 🚀 Quick Start

### Installation
1. Download `ShriRamClothings-Portable-*.exe` from the `dist/` folder
2. Run the installer
3. Launch the application

### First Time Setup
- **Default Login:** 
  - Username: `admin`
  - Password: `admin123`
- **PIN:** `1234`

---

## 📱 Main Features at a Glance

### POS / Billing (Alt+2)
- Search products by name, SKU, or scan barcode
- Add items to cart
- Apply discounts
- Select payment method
- Generate invoice → Download PDF or Print

### Inventory (Alt+4)
- Add/edit/delete products
- Set stock and minimum stock levels
- Add barcodes and SKU
- **Print Barcodes** button for instant label printing

### Reports (Alt+6)
- Select date range (Today, Last 7 Days, Last 30 Days, etc.)
- View revenue, orders, profit
- See top products and categories
- Export reports to Excel/CSV/PDF

### Dashboard (Alt+1)
- Overview of today's sales
- Inventory value
- Low stock alerts
- Recent transactions

---

## 🖨️ Printing Options

### Invoice Printing
1. After creating an invoice, click **Download PDF** or **Print Bill**
2. **Download PDF** → Saves to computer
3. **Print Bill** → Sends to default printer

### Barcode Printing
1. Go to **Inventory** page
2. Click **Print Barcodes** button
3. Select products
4. Choose format (A4, 58mm thermal, 80mm thermal)
5. Set label size (if A4)
6. Click **Generate PDF**

### Printer Selection
- Thermal printers: 58mm or 80mm width
- A4 printers: Standard inkjet/laser
- Select printer from Windows print dialog

---

## 🧾 Invoice Details

Each invoice includes:
- Invoice number (INV-00001, etc.)
- Date and time
- Customer details (if not walk-in)
- Product list with barcodes/SKU
- Subtotal, discount, GST, total
- Payment method
- Cashier name
- Thank you message

---

## 📊 Analytics & Reports

### Date Filters
- **Today** - Current date only
- **Yesterday** - Previous day
- **Last 7 Days** - Weekly view
- **Last 30 Days** - Monthly
- **Last 90 Days** - Quarterly
- **Last 6 Months** - Half-year
- **Last 1 Year** - Annual
- **Custom** - Select specific dates

### Key Metrics
- Total Revenue - All sales in period
- Total Orders - Number of invoices
- Avg Order Value - Average sale amount
- Net Profit - Revenue minus expenses
- Top Products - Best sellers by revenue
- Best Categories - Top product categories

### Exports
Click **Export** button on any report to download:
- Excel file (.xlsx)
- CSV file (.csv)
- PDF report

---

## 🔍 Barcode Scanner Usage

### Setup
1. Connect barcode scanner (usually via USB)
2. No driver installation needed (keyboard emulation)
3. Go to POS page and click **Scan** button

### Scanning
- Point scanner at barcode
- Product auto-adds to cart
- Multiple scans increase quantity
- Works with EAN13, CODE128, UPC, QR

### Supported Barcode Types
- **EAN13** - Retail standard
- **CODE128** - Universal
- **UPC** - US products
- **QR** - Digital codes
- **SKU** - Custom codes

---

## 💼 Settings

### Company Information
- Business name
- Address and phone
- GSTIN (for invoices)
- Currency symbol
- Tax rate (default GST%)
- Invoice notes
- Terms & conditions

### Staff Management
- Add/edit staff members
- Assign roles (Admin, Staff, Cashier)
- Set PIN codes for lock screen
- Manage access levels

### Data Backup
- All data auto-saves to IndexedDB
- Works completely offline
- No cloud connection needed

---

## 🎯 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Alt+1 | Go to Dashboard |
| Alt+2 | Go to POS/Billing |
| Alt+3 | Go to Invoices |
| Alt+4 | Go to Inventory |
| Alt+5 | Go to Customers |
| Alt+6 | Go to Reports |
| Alt+7 | Go to Settings |
| Ctrl+N | New Invoice |
| Ctrl+P | Print |
| Ctrl+Q | Quit |

---

## ✨ Pro Tips

1. **Fast Billing:** Use barcode scanner for quick checkout
2. **Discounts:** Apply before checkout for tax calculation
3. **Customers:** Save customer details for loyalty tracking
4. **Reports:** Export monthly to Excel for accounting
5. **Barcodes:** Print labels in bulk for new products
6. **Offline:** App works perfectly without internet
7. **Dark Mode:** Enable in Settings for eye comfort
8. **Low Stock:** Get alerts for items below minimum

---

## 🐛 Troubleshooting

### Printer Not Found
- Check Windows print queue
- Reinstall printer drivers
- Try default printer first
- For thermal: Install thermal printer driver

### Barcode Scanner Not Working
- Try typing instead of scanning
- Check if barcode code matches product barcode
- Ensure SKU is entered in product details

### App Running Slow
- Close other applications
- Check available disk space
- Restart the application
- Verify internet connection (for online features)

### Lost Data
- Data auto-saves to local storage
- Check IndexedDB storage quota
- Export data regularly

---

## 📞 Technical Support

For issues:
1. Check the in-app Help menu
2. Review this guide
3. Contact Shri Ram Clothings support
4. Check system requirements

### System Requirements
- Windows 7 or later (64-bit)
- 512MB RAM minimum
- 300MB disk space
- No internet required

---

## 📋 Checklist for New Setup

- [ ] Install application
- [ ] Login with default credentials
- [ ] Add company information in Settings
- [ ] Import or create product list
- [ ] Test invoice generation
- [ ] Connect and test printer
- [ ] Connect and test barcode scanner
- [ ] Create staff users
- [ ] Test offline functionality
- [ ] Generate test reports
- [ ] Export sample data
- [ ] Backup important data

---

## 🔐 Security

### User Management
- Each user has unique login
- PIN-based lock screen
- Role-based permissions
- Activity tracking

### Data Security
- Local storage only (no cloud)
- No data leaves your computer
- No internet transmission required
- Your data, your control

### Best Practices
- Change default password
- Set strong PIN codes
- Regular backups (export)
- Keep Windows updated

---

**Version:** 1.1.0 Professional Edition  
**Last Updated:** May 2026  
**Status:** Production Ready

**Happy Billing! 🎉**
