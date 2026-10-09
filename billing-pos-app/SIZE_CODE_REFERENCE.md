# Size Code Quick Reference

## 📋 Size Code Mapping

Keep this nearby for quick reference when dealing with size barcodes!

```
┌─────────────────────────────────────────┐
│         SIZE CODE REFERENCE             │
├─────────────────────────────────────────┤
│                                         │
│  XS  →  A  (Extra Small)               │
│  S   →  S  (Small)                     │
│  M   →  M  (Medium)                    │
│  L   →  L  (Large)                     │
│  XL  →  X  (Extra Large)               │
│  XXL →  Y  (2XL)                       │
│  XXXL→  Z  (3XL)                       │
│                                         │
│  ONE SIZE → O  (One Size Only)         │
│  FREE     → F  (Freesize)              │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔍 How to Identify Size from Barcode

If you see a barcode like: `SHIRT001M`

**Breaking it down:**
- `SHIRT001` = Base product barcode
- `M` = Size code (Medium)

So this is: **SHIRT - SIZE MEDIUM**

---

## 💾 Barcode Examples

### Clothing Store
```
Product: Blue Cotton Shirt
Base Barcode: SHIRT-BLUE

Variants:
  SHIRT-BLUES  = Size Small
  SHIRT-BLUEM  = Size Medium
  SHIRT-BLUEL  = Size Large
  SHIRT-BLUEX  = Size Extra Large
```

### Footwear Store
```
Product: Black Running Shoes
Base Barcode: SHOES-BLK

Variants:
  SHOES-BLKS  = Size 6
  SHOES-BLKM  = Size 8
  SHOES-BLKL  = Size 10
  SHOES-BLKX  = Size 12
```

### One-Size Product
```
Product: Red Scarf
Base Barcode: SCARF-RED

Variant:
  SCARF-REDO  = One Size Only
```

---

## 🖨️ When Printing Labels

1. **Main product label** shows: `SHIRT-BLUE`
2. **Size S label** shows: `SHIRT-BLUES` with "SIZE: S" 
3. **Size M label** shows: `SHIRT-BLUEM` with "SIZE: M"
4. **Size L label** shows: `SHIRT-BLUEL` with "SIZE: L"
5. **Size XL label** shows: `SHIRT-BLUEX` with "SIZE: X"

---

## 🏪 At Checkout

**Customer brings shirt (Size Medium)**
- Barcode on label: `SHIRT-BLUEM`
- You scan it
- System shows: ✅ "Blue Shirt - Medium" added to cart
- Inventory: Size M stock -1, Main stock -1

---

## 📊 Stock Tracking

```
Product: Blue Shirt (SHIRT-BLUE)
├── Size S (SHIRT-BLUES):  Stock 5
├── Size M (SHIRT-BLUEM):  Stock 8   ← Most popular!
├── Size L (SHIRT-BLUEL):  Stock 3
└── Size XL (SHIRT-BLUEX): Stock 2

TOTAL STOCK: 5 + 8 + 3 + 2 = 18 pieces
```

---

## ⚡ Quick Scanning Guide

| See Barcode | Means | Stock to Check |
|------------|-------|---|
| `SHIRT001` | Main product (no size) | Total stock |
| `SHIRT001S` | Small size | Size S stock |
| `SHIRT001M` | Medium size | Size M stock |
| `SHIRT001L` | Large size | Size L stock |
| `SHIRT001X` | Extra Large | Size XL stock |

---

## 🎯 Staff Training

**Tell staff:**
1. ✓ **Last letter in barcode = Size code**
2. ✓ **S = Small, M = Medium, L = Large, X = Extra Large**
3. ✓ **Scan the barcode on each item** (auto-detects size)
4. ✓ **If scanner fails, type size code in manual entry**

---

## 📱 Mobile Quick Reference

**Screenshot this or print it out!**

```
Barcode ends with...  →  It's this size

S  →  Small (S)
M  →  Medium (M)
L  →  Large (L)
X  →  Extra Large (XL)
Y  →  Double XL (XXL)
Z  →  Triple XL (XXXL)
A  →  Extra Small (XS)
O  →  One Size
F  →  Freesize
```

---

## 🔧 Inventory Adjustments

When making manual adjustments:

**Remember:**
- Adjust SPECIFIC SIZE stock (not main product)
- System auto-aggregates to main product
- Always balance: Main Stock = S stock + M stock + L stock + XL stock

**Example:**
```
Main Product: 18 units ✓

✓ Correct:
  S: 5, M: 8, L: 3, XL: 2 = 18 ✓

✗ Wrong:
  S: 10, M: 5, L: 2, XL: 1 = 18
  (Doesn't match reality)
```

---

## 📞 Common Questions

**Q: Why is size code single letter?**
A: Keeps barcode short and scannable. Reduces print errors.

**Q: Can I customize size codes?**
A: Yes, but stick to single letter for best scanning.

**Q: What if product doesn't have size?**
A: Use main barcode only. Size system is optional.

**Q: Where do I see size inventory?**
A: Inventory Management → Product Details → Sizes section

---

**Print this page and keep it at checkout! 🖨️**

Last Updated: 2026-05-29
