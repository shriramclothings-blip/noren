import React, { useState, useEffect } from 'react';
import localLogo from '../logo.jpg.PNG';
import { Printer, Download, Eye, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { normalizeBarcodeFormat } from '../utils/barcodeEngine';
import { generateSizeBarcode } from '../utils/variantUtils';
import BarcodeLabelPreview from './BarcodeLabelPreview';
import {
  LABEL_DIMENSIONS,
  drawProfessionalLabel,
  processLogoForLabel,
  setupLabelPageFormat,
  addLabelPage,
} from '../utils/thermalLabelTemplate';

/**
 * BarcodeLabelPrinter Component - Production Ready
 * Industrial-grade barcode label printing with thermal printer support
 * Now with professional template engine and store logo support
 * Optimal standard format: 50×25mm landscape (thermal printer ready)
 */
export function BarcodeLabelPrinter({ 
  products = [], 
  items = null,
  open = false,
  onClose = () => {},
  company = {}, 
  barcodeFormat = 'CODE128',
  printSettings = {},
}) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [preview, setPreview] = useState(false);
  const [previewItemId, setPreviewItemId] = useState(null);
  const [copies, setCopies] = useState(1);
  const [productOnlyMode, setProductOnlyMode] = useState(false);
  const [processedLogo, setProcessedLogo] = useState(null);

  // Process store logo — use company logo if set, otherwise fall back to local logo
  useEffect(() => {
    const logoSrc = company?.logoSrc || localLogo;
    processLogoForLabel(logoSrc)
      .then(processed => setProcessedLogo(processed))
      .catch(() => setProcessedLogo(null));
  }, [company?.logoSrc]);

  const barcodeConfig = printSettings?.barcode || {};
  const resolvedBarcodeFormat = normalizeBarcodeFormat(barcodeFormat || barcodeConfig.defaultBarcodeFormat || 'CODE128');
  const displaySettings = barcodeConfig.display || {};

  // Handle both products array and items from props
  const printableProducts = items && Array.isArray(items) ? items : products;

  const normalizeItem = (item) => {
    const rawProductId = item.productId ?? item.id ?? '';
    const productId = String(rawProductId);
    // Use label/variantLabel/variantName/sizeLabel as the variant display name
    const sizeLabel = String(
      item.variantLabel || item.label || item.variantName || item.sizeLabel || item.size || ''
    ).trim();
    const name = String(
      item.name || item.productName || item.sku || item.barcode || `Product ${productId}`
    ).trim();
    const displayName = sizeLabel ? `${name} - ${sizeLabel}` : name;
    // batchNumber displayed below the barcode instead of SKU
    const batchNumber = String(item.batchNumber || '').trim();

    return {
      ...item,
      id: String(item.id ?? item.variantId ?? `product-${productId}${sizeLabel ? `-${sizeLabel}` : ''}`),
      productId,
      name,
      displayName,
      barcode: String(item.barcode || item.sku || `SKU${productId}`),
      sku: String(item.sku || item.barcode || `SKU${productId}`),
      batchNumber,
      price: Number(item.price ?? item.salePrice ?? item.costPrice ?? 0),
      sizeLabel,
      variantLabel: sizeLabel,
    };
  };

  const expandProductItems = (product) => {
    const productItem = normalizeItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      productName: product.name,
      barcode: product.barcode,
      sku: product.sku,
      price: product.price ?? product.salePrice ?? 0,
      sizeLabel: product.size || '',
    });

    const sizeItems = (!productOnlyMode && printSettings?.label?.sizeWiseLabels !== false && product.sizes && typeof product.sizes === 'object')
      ? Object.entries(product.sizes).map(([sizeKey, sizeData]) => normalizeItem({
          id: `size-${product.id}-${sizeKey}`,
          productId: product.id,
          name: product.name,
          productName: product.name,
          barcode: sizeData?.barcode || generateSizeBarcode(product.barcode || product.sku || product.id, sizeKey) || `SKU${product.id}-${sizeKey}`,
          sku: sizeData?.sku || `${product.sku || product.id}-${sizeKey}`,
          price: sizeData?.price ?? product.salePrice ?? product.price ?? 0,
          sizeLabel: sizeKey,
          variantName: sizeKey,
        }))
      : [];

    const variantItems = (!productOnlyMode && printSettings?.label?.variantWiseLabels !== false && Array.isArray(product.variants))
      ? product.variants.filter(Boolean).map((variant) => {
          // Use the stored label, falling back to size/color
          const variantDisplayLabel = variant.label
            || [variant.size, variant.color].filter(Boolean).join(' / ')
            || `Variant ${variant.id}`;
          return normalizeItem({
            id: `variant-${variant.id}`,
            productId: product.id,
            name: product.name,
            productName: product.name,
            barcode: variant.barcode || product.barcode || `SKU${product.id}`,
            sku: variant.sku || product.sku || `SKU${product.id}`,
            batchNumber: variant.batchNumber || '',
            price: variant.price ?? product.salePrice ?? product.price ?? 0,
            sizeLabel: variantDisplayLabel,
            variantLabel: variantDisplayLabel,
            variantName: variantDisplayLabel,
            label: variantDisplayLabel,
          });
        })
      : [];

    return [productItem, ...sizeItems, ...variantItems];
  };

  const normalizeToProductOnly = (item) => {
    const parentProduct = products.find((p) => String(p.id) === String(item.productId));
    return normalizeItem({
      ...item,
      name: parentProduct?.name || item.name,
      productName: parentProduct?.name || item.productName,
      barcode: parentProduct?.barcode || item.barcode,
      sku: parentProduct?.sku || item.sku,
      price: Number(parentProduct?.salePrice ?? parentProduct?.price ?? item.price ?? 0),
      sizeLabel: '',
    });
  };

  const baseItems = Array.isArray(items)
    ? items.map(normalizeItem)
    : printableProducts.flatMap(expandProductItems);

  const printableItems = productOnlyMode
    ? Array.from(new Map(baseItems.map((item) => {
      const key = String(item.productId || item.id);
      return [key, normalizeToProductOnly(item)];
    })).values())
    : baseItems;

  const totalLabels = selectedItems.reduce((sum, id) => sum + (quantities[id] || 1), 0);

  const updateQuantity = (id, qty) => {
    const q = parseInt(qty) || 1;
    setQuantities(prev => ({ ...prev, [id]: Math.max(1, q) }));
  };

  const handleProductOnlyModeChange = (checked) => {
    setProductOnlyMode(checked);
    setSelectedItems([]);
    setQuantities({});
  };


  const generateLabelsPDF = () => {
    if (!selectedItems.length) {
      toast.error('Please select products');
      return;
    }

    try {
      const selectedData = selectedItems.flatMap(itemId => {
        const item = printableItems.find((p) => String(p.id) === String(itemId));
        const qty = quantities[itemId] || 1;
        return Array(qty * copies).fill(item).filter(Boolean);
      });

      if (!selectedData.length) {
        toast.error('No valid products selected');
        return;
      }

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [LABEL_DIMENSIONS.WIDTH_MM, LABEL_DIMENSIONS.HEIGHT_MM],
        compress: true,
      });

      setupLabelPageFormat(doc);

      // Safely resolve logo — only use if it's a valid data URL string
      const safeLogoImage = (typeof processedLogo === 'string' && processedLogo.startsWith('data:')) ? processedLogo : null;

      let generatedCount = 0;
      selectedData.forEach((product, idx) => {
        try {
          if (generatedCount > 0) {
            addLabelPage(doc);
          }
          drawProfessionalLabel(doc, product, {
            startX: 0,
            startY: 0,
            logoImage: safeLogoImage,
            showLogo: displaySettings.showLogo !== false && !!safeLogoImage,
            showSize: displaySettings.showProductSize !== false,
            showPrice: displaySettings.showPrice !== false,
            barcodeFormat: resolvedBarcodeFormat,
          });
          generatedCount++;
        } catch (labelErr) {
          console.error(`Label ${idx + 1} failed:`, labelErr);
        }
      });

      if (generatedCount === 0) {
        toast.error('All labels failed to generate. Check product barcode values.');
        return;
      }

      const filename = `barcode-labels-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      toast.success(`✓ Generated ${generatedCount} label(s) as PDF`);
      onClose();
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error(`Failed to generate PDF: ${err?.message || 'Unknown error'}`);
    }
  };

  const generatePreview = () => {
    if (!selectedItems.length) {
      toast.error('Please select products');
      return;
    }
    setPreviewItemId(selectedItems[0]);
    setPreview(true);
  };

  /**
   * Build a barcode PNG data-URL using JsBarcode on an off-screen canvas.
   * Returns null if the value is empty or JsBarcode throws.
   */
  const buildBarcodeDataUrl = (value) => {
    try {
      const safeValue = String(value || '').trim();
      if (!safeValue) return null;
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 120;
      JsBarcode(canvas, safeValue, {
        format: resolvedBarcodeFormat,
        width: 2,
        height: 100,
        displayValue: false,
        margin: 4,
        lineColor: '#000000',
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Barcode canvas failed:', err);
      return null;
    }
  };

  /**
   * Direct browser print — opens a dedicated print window with all labels
   * rendered as 50×25mm HTML, then triggers window.print().
   * Download PDF is unaffected.
   */
  const handlePrint = () => {
    if (!selectedItems.length) {
      toast.error('Please select products');
      return;
    }

    // Build the flat list of label data (respects qty × copies)
    const labelData = selectedItems.flatMap((itemId) => {
      const item = printableItems.find((p) => String(p.id) === String(itemId));
      if (!item) return [];
      const qty = (quantities[itemId] || 1) * copies;
      return Array(qty).fill(item);
    });

    if (!labelData.length) {
      toast.error('No valid products selected');
      return;
    }

    const W = LABEL_DIMENSIONS.WIDTH_MM;
    const H = LABEL_DIMENSIONS.HEIGHT_MM;
    const showPrice = displaySettings.showPrice !== false;
    const showSize  = displaySettings.showProductSize !== false;
    const showLogo  = displaySettings.showLogo !== false;
    const safeLogoImage = (typeof processedLogo === 'string' && processedLogo.startsWith('data:')) ? processedLogo : null;
    const currency = company?.currency || '₹';

    // Build HTML for each label
    const labelsHtml = labelData.map((product) => {
      const barcodeValue  = String(product.barcode || product.sku || `SKU${product.id}`).trim();
      const displayCode   = String(product.batchNumber || product.barcode || product.sku || `SKU${product.id}`).trim();
      const productName   = String(product.name || 'Product').trim();
      const variantLabel  = showSize ? String(product.sizeLabel || product.variantLabel || product.variantName || '').trim() : '';
      const nameLabel     = variantLabel ? `${productName}  [${variantLabel.toUpperCase()}]` : productName;
      const price         = showPrice ? `${currency}${Number(product.price || 0).toFixed(2)}` : '';
      const barcodeImg    = buildBarcodeDataUrl(barcodeValue);

      const logoHtml = (showLogo && safeLogoImage)
        ? `<img src="${safeLogoImage}" style="max-height:6mm;max-width:18mm;object-fit:contain;display:block;margin:0 auto 0.5mm auto;" alt="logo" />`
        : '';

      const barcodeHtml = barcodeImg
        ? `<img src="${barcodeImg}" style="width:100%;height:8mm;object-fit:contain;display:block;" alt="${barcodeValue}" />`
        : `<div style="width:100%;height:8mm;display:flex;align-items:center;justify-content:center;font-size:4pt;color:#999;">NO BARCODE</div>`;

      return `
<div class="label">
  ${logoHtml}
  <div class="barcode-wrap">${barcodeHtml}</div>
  <div class="display-code">${displayCode}</div>
  <div class="footer">
    <span class="name">${nameLabel.replace(/</g, '&lt;')}</span>
    ${price ? `<span class="price">${price}</span>` : ''}
  </div>
</div>`;
    }).join('\n');

    const printWindow = window.open('', '_blank', 'width=300,height=200');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups for this app and try again.');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Barcode Labels</title>
<style>
  @page {
    size: ${W}mm ${H}mm landscape;
    margin: 0;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    width: ${W}mm;
  }
  .label {
    width: ${W}mm;
    height: ${H}mm;
    box-sizing: border-box;
    padding: 1mm 1.2mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-family: Arial, Helvetica, sans-serif;
    page-break-after: always;
    overflow: hidden;
    border: 0.2mm solid #ccc;
  }
  .barcode-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .display-code {
    text-align: center;
    font-size: 4.5pt;
    font-family: monospace;
    letter-spacing: 0.3px;
    margin: 0.3mm 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 0.3mm solid #ddd;
    padding-top: 0.3mm;
    gap: 1mm;
  }
  .name {
    font-size: 4.5pt;
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
  .price {
    font-size: 5.5pt;
    font-weight: bold;
    white-space: nowrap;
    flex-shrink: 0;
  }
  @media print {
    html, body { margin: 0; padding: 0; }
    .label { border-color: transparent; }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
</style>
</head>
<body>
${labelsHtml}
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 400);
  };
${'<'}/script>
</body>
</html>`);
    printWindow.document.close();
    toast.success(`Sending ${labelData.length} label(s) to printer…`);
  };

  return (
    <Modal open={open} onClose={onClose} title="Professional Barcode Label Printer - Production Ready" size="2xl">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Production Standard Format Notice */}
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">
            <strong>✓ Production Ready Format:</strong> 50mm × 25mm Landscape (Thermal Printer Optimized)
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            Compatible with: Zebra, TSC, XPrinter, TVS, Rongta, and generic thermal printers
          </p>
        </div>

        {/* Printer Settings */}
        <div className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <label className="label text-sm font-semibold">Copies Per Label</label>
            <input
              type="number"
              min="1"
              max="10"
              value={copies}
              onChange={e => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
              className="input text-sm w-20"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={productOnlyMode}
              onChange={(e) => handleProductOnlyModeChange(e.target.checked)}
            />
            Print product barcode only (ignore size/variant labels)
          </label>

          <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
            <p className="text-gray-700 dark:text-gray-300">
              Selected: <span className="font-bold">{selectedItems.length}</span> products | 
              Total labels: <span className="font-bold">{totalLabels * copies}</span>
            </p>
          </div>
        </div>

        {/* Products Selection */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <label className="label text-sm font-semibold">Select Products to Print</label>
          {printableItems.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No products available</p>
          ) : (
            printableItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => {
                    setSelectedItems(prev =>
                      prev.includes(item.id) ? prev.filter(p => p !== item.id) : [...prev, item.id]
                    );
                    if (!quantities[item.id]) setQuantities(prev => ({ ...prev, [item.id]: 1 }));
                  }}
                  className="w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.displayName}</p>
                  <p className="text-xs text-gray-400">{item.barcode || `SKU-${item.sku || item.id}`}</p>
                </div>
                {selectedItems.includes(item.id) && (
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={quantities[item.id] || 1}
                    onChange={e => updateQuantity(item.id, e.target.value)}
                    className="w-12 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded"
                    placeholder="Qty"
                  />
                )}
              </div>
            ))
          )}
        </div>

        {/* Live Preview */}
        {preview && previewItemId && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold mb-3 text-sm">Live WYSIWYG Preview</h4>
            {printableItems.find(p => String(p.id) === String(previewItemId)) && (
              <BarcodeLabelPreview
                product={printableItems.find(p => String(p.id) === String(previewItemId))}
                logoImage={company?.logoSrc}
                showLogo={displaySettings.showLogo !== false}
                showSize={displaySettings.showProductSize !== false}
                showSku={displaySettings.showSku !== false}
                showPrice={displaySettings.showPrice !== false}
                currencySymbol={company?.currency || '₹'}
                className="mx-auto"
              />
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={generatePreview}
            disabled={!selectedItems.length}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Eye size={16} /> Preview (WYSIWYG)
          </button>
          <button
            onClick={generateLabelsPDF}
            disabled={!selectedItems.length}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Download size={16} /> Download PDF
          </button>
          <button
            onClick={handlePrint}
            disabled={!selectedItems.length}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <Printer size={16} /> Print Now
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-sm"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default BarcodeLabelPrinter;
