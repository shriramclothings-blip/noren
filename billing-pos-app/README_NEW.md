# Shri Ram Clothings Billing System

**Professional Retail Billing, Inventory & POS System**

A modern, lightweight, offline-enabled desktop POS system built with React, Electron, and IndexedDB - specifically designed for retail clothing businesses.

## ✨ Key Features

### 💼 Professional Branding
- Full company branding throughout the application
- Customizable company information (name, address, GSTIN, currency)
- Professional invoices with company branding
- Consistent branding across all screens (login, dashboard, invoices, exports, etc.)

### 🧾 Advanced Invoice System
- Professional invoice layout with proper spacing and typography
- Support for both A4 and thermal printer formats (58mm/80mm)
- Invoice includes: invoice#, date/time, customer details, products with barcode/SKU, GST/tax calculations, totals, payment method, cashier, thank you message
- After invoice generation: Download PDF or Print Bill options
- Clean, modern invoice design with proper alignment

### 🖨️ Direct Printing System
- One-click silent printing to any printer
- Support for thermal printers (58mm, 80mm)
- Support for A4 printers (inkjet & laser)
- Auto-printer detection
- Thermal printer brand support: TVS, Epson, XPrinter, Zebra, Rongta
- ESC/POS printer compatibility
- Invoice formatting auto-adjusts based on printer width

### 📦 Barcode Label Printing System (NEW!)
- **Generate & print multiple product barcodes instantly**
- Support for A4 paper (3 label sizes: small, medium, large)
- Support for thermal stickers (58mm, 80mm)
- Bulk barcode printing in one click
- Barcode preview before printing
- PDF export of barcode labels
- Label content: Product Name, Barcode, SKU, Price, Brand, Optional Size/Variant
- Professional barcode quality maintained for scanner compatibility
- Accessible from Inventory page

### 📱 Barcode Scanner Integration
- **Plug & play keyboard-style scanner support**
- Supports EAN13, CODE128, UPC, QR, SKU codes
- Instant product lookup and auto-add to cart
- Auto-increase quantity on repeated scans
- Ultra-fast response - no lag during rapid scanning
- Keyboard-gun emulation support
- Works seamlessly during billing

### 📊 Advanced Revenue Analytics
- **Smart date range filtering:**
  - Today
  - Yesterday
  - Last 7 Days
  - Last 30 Days
  - Last 90 Days
  - Last 6 Months
  - Last 1 Year
  - Custom Date Range

- **Comprehensive metrics:**
  - Total Revenue
  - Total Orders
  - Average Order Value
  - Top Selling Products
  - Best Selling Categories
  - Daily Sales Trend (line chart)
  - Monthly Revenue Comparison
  - Payment Method Breakdown
  - Accurate GST/Tax calculations
  - Profit & Loss analysis

### 📤 Export System
- Export to Excel (.xlsx), CSV, PDF
- Revenue reports, Orders, Customers, Products, Inventory, Sales history
- Professional formatting with proper headers and sorting
- Business-ready exports
- Easy one-click export from any report

### 📦 Product Database
- Complete product management with:
  - Product Name
  - Barcode (for scanner support)
  - SKU
  - Price & Cost Price
  - Stock & Minimum Stock
  - Category
  - Tax Rate / GST
  - Product Image
  - Description
  - Expiry Date & Batch tracking
  - Barcode label template support

### 🛍️ Complete POS Features
- Product search by name, SKU, or barcode
- Shopping cart with quantity adjustment
- Discount support (% based)
- Customer selection with history
- Payment method selection (Cash, UPI, Card, Credit, Cheque, Net Banking)
- Invoice notes
- Professional receipt generation
- Real-time calculations
- Fast, responsive billing workflow

### 💾 Offline Support
- **100% offline functionality**
- All data stored locally in IndexedDB
- No internet required for any operation
- Automatic data persistence
- Fast performance even with large datasets
- Seamless sync when online

### 🎨 Modern UI/UX
- Clean, professional retail POS design
- Dark/Light mode support
- Desktop optimized layouts
- Smooth, responsive interface
- Minimal animations for speed
- Professional color scheme
- Intuitive navigation with keyboard shortcuts

### 🔐 Multi-User Support
- User authentication with PIN lock
- Role-based access (Admin, Staff, Cashier)
- Staff management
- Activity tracking

### 📈 Inventory Management
- Real-time stock tracking
- Low stock alerts
- Category management
- Inventory valuation
- Barcode label printing from inventory
- Batch & expiry date tracking

### 👥 Customer Management
- Customer database
- Phone & address tracking
- Sales history per customer
- Customer-specific discounts

### 💰 Additional Features
- Expense tracking
- Supplier management
- Purchase orders
- GST/Tax calculations & reports
- Profit & loss analysis
- Payment method analytics
- Daily reconciliation

## 🛠️ Technology Stack

- **Frontend:** React 19 + Tailwind CSS
- **Desktop:** Electron 41 (cross-platform)
- **Database:** IndexedDB (offline storage)
- **PDF Generation:** jsPDF + jsPDF-autotable
- **Barcode:** JSBarcode (CODE128, EAN13, UPC, QR support)
- **Charts:** Recharts
- **UI Components:** Lucide React Icons
- **Notifications:** React Hot Toast

## 📦 Installation & Setup

```bash
# Install dependencies
npm install

# Development mode with live reload
npm run electron:dev

# Build for production (Windows)
npm run electron:build

# Build portable .exe
npm run electron:build:dir
```

## 🚀 Performance Characteristics

- **Lightweight:** Minimal resource usage (< 200MB install)
- **Fast:** Instant invoice generation & printing (< 100ms)
- **Responsive:** Handles rapid barcode scanning (10+ scans/second)
- **Offline:** Full functionality without internet connection
- **Stable:** Never freezes during billing operations
- **Efficient:** Low RAM usage even with years of data

## 💡 Use Cases

Perfect for:
- Retail clothing stores & boutiques
- Fashion outlets
- Quick commerce shops
- Small retail chains
- E-commerce fulfillment centers
- Pop-up stores & markets

## 📋 System Requirements

- Windows 7+ (64-bit)
- 512MB RAM minimum
- 300MB disk space
- No internet required (fully offline)

## 🔄 Update History

**v1.1.0 - Professional Edition (Current)**
- ✅ Complete branding refresh to "Shri Ram Clothings Billing System"
- ✅ Professional invoice system redesign
- ✅ Barcode label printing system (NEW!)
- ✅ Advanced revenue analytics with date filtering
- ✅ Enhanced barcode scanner support
- ✅ Direct thermal & A4 printing
- ✅ Excel/CSV/PDF export system
- ✅ Modern UI/UX upgrades
- ✅ Full offline support

## 📄 License

Private - Shri Ram Clothings

---

**Built with ❤️ for retail business excellence**
