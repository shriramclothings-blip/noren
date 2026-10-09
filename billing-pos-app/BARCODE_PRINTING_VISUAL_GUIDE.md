# Barcode Label Printing - Visual Guide

## 📍 WHERE TO FIND THE PRINT LABEL BUTTON

### Location in Inventory Table

```
┌─────────────────────────────────────────────────────────────────────┐
│ INVENTORY MANAGEMENT TABLE                                          │
├─────────────────────────────────────────────────────────────────────┤
│ SKU │ Product Name │ Barcode │ Stock │ Cost │ Sale │ Value │ Actions │
├─────────────────────────────────────────────────────────────────────┤
│ SKU1│ Product Name │ 123456  │ 100   │ 50   │ 99   │ 5000  │ ⚙️ 🖨️ 📥│
│     │              │         │       │      │      │       │ ↑  ↑  ↑ │
│     │              │         │       │      │      │       │ │  │  └─ PRINT LABEL (NEW!)
│     │              │         │       │      │      │       │ │  └──── PRINT BARCODE
│     │              │         │       │      │      │       │ └─────── EDIT
└─────────────────────────────────────────────────────────────────────┘

BUTTON LEGEND:
⚙️ = Edit Product
🖨️ = Print Barcode (traditional barcode)
📥 = Print Label (THERMAL - NEW!)  ← CLICK THIS FOR LABELS
```

## 🎨 Button Appearance

```
Each product row has 4 action buttons:

┌─────────────┐
│ ⚙️ Edit     │ (Gray background)
├─────────────┤
│ 🖨️ Print    │ (Gray background)
├─────────────┤
│ 📥 Download │ (BLUE background) ← NEW!
│ (Print      │
│ Label)      │
├─────────────┤
│ 🗑️ Delete   │ (Red for warning)
└─────────────┘
```

## 📋 STEP-BY-STEP USAGE

### STEP 1: Open Inventory
```
Main Menu
   ↓
Click "Inventory" (📦 icon in sidebar)
   ↓
Inventory Management Page Opens
   ↓
See product list in table
```

### STEP 2: Locate Product
```
Find your product in table by:
- Scrolling down
- Using search bar (top of page)
- Filtering by category
```

### STEP 3: Click Print Label Button
```
On product row, click BLUE DOWNLOAD ICON
(It's the 3rd button from the left)

Product Selected ✓
Modal Opens Automatically ✓
```

### STEP 4: Select Printer Type
```
┌─────────────────────────────────────┐
│ Printer Type Selection              │
├─────────────────────────────────────┤
│                                     │
│ ○ 58mm Thermal Printer  (Standard)  │
│   └─ For TSC TE200, Zebra, etc     │
│                                     │
│ ○ 80mm Thermal Printer  (Wide)      │
│   └─ For Zebra Z840, etc           │
│                                     │
│ ○ A4 Paper (3×9 labels/page)       │
│   └─ For regular printer or bulk   │
│                                     │
└─────────────────────────────────────┘

SELECT ONE ⬆️
```

### STEP 5: Choose Products & Quantities
```
┌─────────────────────────────────────┐
│ Product Selection                   │
├─────────────────────────────────────┤
│                                     │
│ ☑️ Product 1 [Qty: 1]              │
│ ☐ Product 2 [Qty: -]              │
│ ☑️ Product 3 [Qty: 5]              │
│ ☐ Product 4 [Qty: -]              │
│ ...                                 │
│                                     │
│ Total Labels: 1+5 = 6               │
│                                     │
└─────────────────────────────────────┘

MODIFY AS NEEDED:
- Check box to SELECT
- Uncheck to DESELECT
- Change Qty for each product
```

### STEP 6: Set Copies (Optional)
```
For Batch Printing:

┌─────────────────┐
│ Copies Per Label│
├─────────────────┤
│ [1] ⬆️ ⬇️       │
└─────────────────┘

Examples:
• Qty=2, Copies=1 → 2 labels printed
• Qty=2, Copies=3 → 6 labels printed
• Qty=5, Copies=2 → 10 labels printed
```

### STEP 7: Preview (Optional)
```
Click [👁️ Preview] Button

Shows:
- How labels will look
- Product names
- Quantity breakdown
- Prices
```

### STEP 8: Generate & Print
```
TWO OPTIONS:

┌──────────────────┐
│ 📥 Download PDF  │
├──────────────────┤
│ • Gets PDF file
│ • Print later
│ • Save for reuse
│ • Share with team
└──────────────────┘

           OR

┌──────────────────┐
│ 🖨️ Print Now    │
├──────────────────┤
│ • Opens PDF
│ • Ready to print
│ • Auto-opens
│   printer dialog
└──────────────────┘
```

## 🖨️ THERMAL PRINTER CONNECTIONS

### 58mm Thermal Printer Setup
```
[Windows PC] 
    ↓ USB/Network
[58mm Thermal Printer]
    ↓ Sticker Roll (25×50mm)
[Printed Labels]
    ↓
Apply to Products
```

### 80mm Thermal Printer Setup
```
[Windows PC]
    ↓ USB/Network
[80mm Thermal Printer]
    ↓ Wide Sticker Roll
[Printed Labels (Larger)]
    ↓
Apply to Boxes/Shelves
```

### A4 Paper Fallback
```
[Windows PC]
    ↓ USB/Network
[Regular Printer]
    ↓ A4 Paper
[27 Labels Per Sheet (3×9 Grid)]
    ↓ Cut with Scissors/Cutter
[Individual Sticker Labels]
```

## 📐 LABEL DIMENSIONS

### Standard 58mm Label (25×50mm)
```
┌──────────────────────────┐
│     Product ABC          │  ← Name (8pt bold)
│                          │
│    ███████████████       │
│    ███████████████       │
│    █ BARCODE    █        │  ← Barcode (CODE128)
│    ███████████████       │
│    ███████████████       │
│                          │
│ SKU: ABC123   ₹599.99    │  ← SKU + Price (6pt)
└──────────────────────────┘
   Width: 50mm
   Height: 25mm
```

### A4 Sheet Layout (27 labels)
```
┌──────────────────────────────────────┐
│  Label   Label    Label             │
│    1       2        3               │
│  ┌────┐ ┌────┐ ┌────┐              │
│  │ ██ │ │ ██ │ │ ██ │              │
│  │ ██ │ │ ██ │ │ ██ │              │
│  │ ██ │ │ ██ │ │ ██ │              │
│  │ ██ │ │ ██ │ │ ██ │              │
│  │ ██ │ │ ██ │ │ ██ │              │
│  └────┘ └────┘ └────┘              │
│                                      │
│  (repeat 9 rows = 27 labels total)  │
│                                      │
└──────────────────────────────────────┘
```

## ✅ QUALITY CHECKLIST

Before bulk printing:

```
☐ Selected correct printer type
☐ Product quantities are correct
☐ All barcodes have values (not empty)
☐ Product names display correctly
☐ Prices are showing
☐ Previewed label layout
☐ Printer is powered on
☐ Labels/paper is loaded
☐ Printer is set as default
☐ Print density is medium-high
```

## 🔍 SCANNING VERIFICATION

After printing a label:

```
1. Cut out one printed label
2. Apply to test product or paper
3. Use smartphone camera or barcode scanner app
4. Point at barcode
5. Should scan successfully

If scan fails:
✓ Increase printer density
✓ Check barcode isn't bent/folded
✓ Ensure label is flat on surface
✓ Try different scanner app
✓ Verify barcode has value (not blank)
```

## 📊 BATCH PRINTING EXAMPLES

### Example 1: Quick Order
```
Select: Product A (Qty: 10)
Copies: 1
Total Labels: 10
Time to Print: 3-5 seconds
```

### Example 2: Inventory Refresh
```
Select: All 20 products
Qty: 2-5 each (varies)
Copies: 1
Total Labels: ~70
Time to Print: 10-15 seconds
```

### Example 3: Bulk Restock
```
Select: Top 5 products
Qty: 100 each
Copies: 1
Total Labels: 500
Time to Print: 1-2 minutes
Note: Print in batches to avoid overload
```

## 🆘 QUICK TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Button not visible | Scroll right in table |
| Modal won't open | Reload page, try again |
| PDF won't download | Check browser downloads settings |
| Barcode looks faint | Increase printer density |
| Labels won't stick | Use quality thermal labels |
| Barcode won't scan | Check value is not empty |
| Printer not found | Install printer drivers |
| Paper won't feed | Check label alignment |

## 🎓 PRO TIPS

```
✓ TIP 1: Always test 1 label before bulk print
✓ TIP 2: Keep printer clean (use cleaning kit monthly)
✓ TIP 3: Store thermal labels in cool, dry place
✓ TIP 4: Use medium-high density for retail scanning
✓ TIP 5: Scan test labels with store scanner to verify
✓ TIP 6: Keep PDF copies for reprint if needed
✓ TIP 7: Batch print during non-peak hours
✓ TIP 8: Label width = 50mm, Height = 25mm standard
```

---

**Ready to print labels?** 🚀

1. Go to Inventory
2. Click BLUE DOWNLOAD icon
3. Select products
4. Click Print Now
5. Done! 🎉
