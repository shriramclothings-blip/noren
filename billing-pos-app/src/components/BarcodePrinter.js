import React, { useEffect, useState } from 'react';
import { Printer, Download, Eye, Plus, Minus } from 'lucide-react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import Modal from './Modal';
import { normalizeBarcodeFormat } from '../utils/barcodeEngine';
import { generateBarcodeLabelImage } from '../utils/barcodeGenerator';

const getItemName = (item) => item?.name || item?.productName || 'Product';
const getItemSize = (item) => item?.sizeLabel || item?.label || null;
const getItemSku = (item) => item?.sku || null;
const getItemBarcode = (item) => item?.barcode || item?.sku || item?.id;

export default function BarcodePrinter({
  products = [],
  items = null,
  buttonLabel = 'Print Barcodes',
  modalTitle = 'Barcode Label Printer',
  emptyStateText = 'No products available',
  printSettings = {},
}) {
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState([]);
  const [format, setFormat] = useState('a4');
  const [labelSize, setLabelSize] = useState('medium');
  const [preview, setPreview] = useState(false);

  const barcodeConfig = printSettings?.barcode || {};
  const defaultBarcodeFormat = barcodeConfig.defaultBarcodeFormat || 'CODE128';
  const displaySettings = barcodeConfig.display || {};

  useEffect(() => {
    const presetToLabelSizeLocal = {
      shelf: 'medium',
      'small sticker': 'small',
      'clothing tag': 'medium',
      'price tag': 'small',
      'warehouse label': 'large',
      custom: 'medium',
    };

    setLabelSize(presetToLabelSizeLocal[barcodeConfig.labelPreset] || 'medium');
  }, [barcodeConfig.labelPreset]);

  const hasCustomItems = Array.isArray(items);

  const printableItems = hasCustomItems ? items : products;

  const handleSelectItem = (item) => {
    const exists = selected.find((entry) => entry.id === item.id);
    if (exists) {
      setSelected(selected.filter((entry) => entry.id !== item.id));
    } else {
      setSelected([...selected, { ...item, printQty: 1 }]);
    }
  };

  const updatePrintQty = (itemId, qty) => {
    if (qty <= 0) return;
    setSelected(selected.map((entry) => (entry.id === itemId ? { ...entry, printQty: qty } : entry)));
  };

  const getBarcodeMetrics = () => {
    const labelWidthMm = Number(barcodeConfig.custom?.widthMm) || (labelSize === 'small' ? 40 : labelSize === 'medium' ? 50 : 66);
    const labelHeightMm = Number(barcodeConfig.custom?.heightMm) || (labelSize === 'small' ? 28 : labelSize === 'medium' ? 46 : 66);
    const moduleWidthMm = Math.min(1.0, Math.max(0.45, labelWidthMm * 0.015));
    const heightMm = Math.min(20, Math.max(12, labelHeightMm * 0.40));
    return { moduleWidthMm, heightMm };
  };

  const generateBarcodeImage = (value) => {
    try {
      const { moduleWidthMm, heightMm } = getBarcodeMetrics();
      return generateBarcodeLabelImage(value, moduleWidthMm, heightMm, normalizeBarcodeFormat(defaultBarcodeFormat));
    } catch (error) {
      console.error('Barcode generation failed:', error);
      return null;
    }
  };

  const generateBarcodePDF = () => {
    if (selected.length === 0) {
      toast.error('Select items first');
      return;
    }

    let doc;
    const labels = [];

    selected.forEach((item) => {
      for (let index = 0; index < item.printQty; index += 1) {
        const barcodeImg = generateBarcodeImage(getItemBarcode(item));
        if (barcodeImg) {
          labels.push({ item, barcodeImg });
        }
      }
    });

    if (format === 'a4') {
      doc = new jsPDF();
      const margin = 10;

      let labelWidth;
      let labelHeight;
      let labelsPerRow;
      let labelsPerCol;

      if (labelSize === 'small') {
        labelWidth = 40;
        labelHeight = 30;
        labelsPerRow = 4;
        labelsPerCol = 9;
      } else if (labelSize === 'medium') {
        labelWidth = 60;
        labelHeight = 50;
        labelsPerRow = 3;
        labelsPerCol = 5;
      } else {
        labelWidth = 90;
        labelHeight = 70;
        labelsPerRow = 2;
        labelsPerCol = 3;
      }

      const { heightMm: barcodeHeightMm } = getBarcodeMetrics();
      const labelMargin = 3;
      let labelIndex = 0;

      labels.forEach((label) => {
        if (labelIndex > 0 && labelIndex % (labelsPerRow * labelsPerCol) === 0) {
          doc.addPage();
          labelIndex = 0;
        }

        const row = Math.floor((labelIndex % (labelsPerRow * labelsPerCol)) / labelsPerRow);
        const col = labelIndex % labelsPerRow;

        const x = margin + col * (labelWidth + labelMargin * 2);
        const y = margin + row * (labelHeight + labelMargin * 2);

        doc.setDrawColor(200, 200, 200);
        doc.rect(x, y, labelWidth, labelHeight);

        const barcodeY = y + 5;
        doc.addImage(label.barcodeImg, 'PNG', x + 2, barcodeY, labelWidth - 4, barcodeHeightMm);

        let infoY = barcodeY + barcodeHeightMm + 2;
        doc.setFontSize(labelSize === 'small' ? 5 : labelSize === 'medium' ? 6 : 7);
        doc.setFont('helvetica', 'normal');
        doc.text(getItemBarcode(label.item), x + labelWidth / 2, infoY, { align: 'center' });
        infoY += labelSize === 'small' ? 3 : 4;

        doc.setFontSize(labelSize === 'small' ? 6 : labelSize === 'medium' ? 7 : 8);
        doc.setFont('helvetica', 'bold');

        const showProductName = displaySettings.showProductName !== false;
        const showSku = displaySettings.showSku !== false;
        const showPrice = displaySettings.showPrice !== false;
        const showSize = displaySettings.showProductSize !== false;

        const productName = showProductName
          ? getItemName(label.item).substring(
              0,
              labelSize === 'small' ? 10 : labelSize === 'medium' ? 15 : 20,
            )
          : '';

        if (productName) {
          doc.text(productName, x + 2, infoY);
          infoY += labelSize === 'small' ? 3 : 4;
        }

        doc.setFontSize(labelSize === 'small' ? 5 : labelSize === 'medium' ? 6 : 7);
        doc.setFont('helvetica', 'normal');

        const sizeLabel = getItemSize(label.item);
        if (showSize && sizeLabel) {
          doc.text(`Size: ${sizeLabel}`, x + 2, infoY);
          infoY += labelSize === 'small' ? 2 : 3;
        }

        if (showPrice && label.item.price) {
          doc.text(`₹${Number(label.item.price).toFixed(2)}`, x + 2, infoY);
          infoY += labelSize === 'small' ? 2 : 3;
        }

        if (showSku && getItemSku(label.item)) {
          doc.text(`SKU: ${getItemSku(label.item)}`, x + 2, infoY);
        }

        labelIndex += 1;
      });

      doc.save('barcode-labels-a4.pdf');
      toast.success(`Generated ${labels.length} A4 barcode labels`);
    } else if (format === 'thermal58' || format === 'thermal80') {
      const thermalWidth = format === 'thermal58' ? 58 : 80;
      const { heightMm: thermalBarcodeHeightMm } = getBarcodeMetrics();
      doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [thermalWidth, 200] });
      const margin = 2;
      let y = margin;
      const docWidth = doc.internal.pageSize.getWidth();
      const contentWidth = docWidth - margin * 2;

      labels.forEach((label) => {
        if (y > doc.internal.pageSize.getHeight() - 30) {
          doc.addPage();
          y = margin;
        }

        const barcodeHeight = thermalBarcodeHeightMm;
        doc.addImage(label.barcodeImg, 'PNG', margin, y, contentWidth, barcodeHeight);
        y += barcodeHeight + 1;
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text(getItemBarcode(label.item), margin + contentWidth / 2, y, { align: 'center' });
        y += 3;

        const showProductName = displaySettings.showProductName !== false;
        const showSku = displaySettings.showSku !== false;
        const showPrice = displaySettings.showPrice !== false;
        const showSize = displaySettings.showProductSize !== false;

        if (showProductName) {
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          const nameLines = doc.splitTextToSize(getItemName(label.item) || 'Product', contentWidth - 1);
          doc.text(nameLines[0], margin + 1, y);
          y += 3;
        }

        const sizeLabel = getItemSize(label.item);
        if (showSize && sizeLabel) {
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.text(`Size: ${sizeLabel}`, margin + 1, y);
          y += 3;
        }

        const infoText = [];
        if (showPrice && label.item.price) infoText.push(`₹${Number(label.item.price).toFixed(2)}`);
        if (showSku && getItemSku(label.item)) infoText.push(`SKU: ${getItemSku(label.item)}`);
        if (infoText.length) {
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.text(infoText.join(' | '), margin + 1, y);
          y += 3;
        }

        doc.setDrawColor(150, 150, 150);
        doc.line(margin, y, docWidth - margin, y);
        y += 2;
      });

      doc.save(`barcode-labels-${format}.pdf`);
      toast.success(`Generated ${labels.length} thermal barcode labels`);
    }

    setShowModal(false);
    setSelected([]);
  };

  const handlePreview = () => {
    setPreview(true);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={hasCustomItems && printableItems.length === 0}
        className="btn-secondary gap-2 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Printer size={16} /> {buttonLabel}
      </button>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={modalTitle} size="lg">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Label Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'a4', label: 'A4 Paper' },
                { id: 'thermal58', label: '58mm Thermal' },
                { id: 'thermal80', label: '80mm Thermal' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setFormat(fmt.id)}
                  className={`p-3 rounded-lg text-sm font-medium transition-all ${
                    format === fmt.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          {format === 'a4' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Label Size
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'small', label: 'Small (40×30mm)' },
                  { id: 'medium', label: 'Medium (60×50mm)' },
                  { id: 'large', label: 'Large (90×70mm)' },
                ].map((sizeOption) => (
                  <button
                    key={sizeOption.id}
                    onClick={() => setLabelSize(sizeOption.id)}
                    className={`p-3 rounded-lg text-sm font-medium transition-all ${
                      labelSize === sizeOption.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {sizeOption.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Items ({selected.length} selected)
            </label>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-96 overflow-y-auto">
              {printableItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.some((entry) => entry.id === item.id)}
                    onChange={() => handleSelectItem(item)}
                    className="rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{getItemName(item)}</p>
                    <p className="text-xs text-gray-500">
                      {getItemSku(item) && `SKU: ${getItemSku(item)}`}
                      {getItemBarcode(item) && ` • ${getItemBarcode(item)}`}
                      {getItemSize(item) && ` • Size: ${getItemSize(item)}`}
                    </p>
                  </div>
                  {selected.some((entry) => entry.id === item.id) && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const selectedItem = selected.find((entry) => entry.id === item.id);
                          if (selectedItem && selectedItem.printQty > 1) {
                            updatePrintQty(item.id, selectedItem.printQty - 1);
                          }
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-medium">
                        {selected.find((entry) => entry.id === item.id)?.printQty || 1}
                      </span>
                      <button
                        onClick={() => {
                          const selectedItem = selected.find((entry) => entry.id === item.id);
                          if (selectedItem) {
                            updatePrintQty(item.id, selectedItem.printQty + 1);
                          }
                        }}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {printableItems.length === 0 && (
                <div className="p-6 text-center text-gray-500">{emptyStateText}</div>
              )}
            </div>
          </div>

          {selected.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Total labels to print: <span className="font-bold">{selected.reduce((sum, item) => sum + item.printQty, 0)}</span>
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handlePreview}
              disabled={selected.length === 0}
              className="btn-secondary flex-1 justify-center gap-2"
            >
              <Eye size={16} /> Preview
            </button>
            <button
              onClick={generateBarcodePDF}
              disabled={selected.length === 0}
              className="btn-primary flex-1 justify-center gap-2"
            >
              <Download size={16} /> Generate PDF
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={preview} onClose={() => setPreview(false)} title="Barcode Label Preview" size="lg">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-lg max-h-96 overflow-y-auto">
          <div className="grid grid-cols-4 gap-4">
            {selected.map((item, index) => (
              <div key={`${item.id}-${index}`} className="border border-gray-300 p-2 rounded text-center">
                <div className="bg-gray-100 p-2 rounded mb-1 flex items-center justify-center h-16">
                  <span className="text-xs font-mono">[BARCODE]</span>
                </div>
                <p className="text-xs font-semibold truncate">{getItemName(item)}</p>
                {getItemSize(item) && <p className="text-xs text-gray-600">Size: {getItemSize(item)}</p>}
                {item.price && <p className="text-xs text-gray-600">₹{Number(item.price).toFixed(2)}</p>}
                {getItemSku(item) && <p className="text-xs text-gray-500">{getItemSku(item)}</p>}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
