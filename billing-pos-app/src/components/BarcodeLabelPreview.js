/**
 * Barcode Label Preview - WYSIWYG Live Preview
 * 
 * Displays exact representation of how the label will print
 * Updates in real-time as product data changes
 * Shows: Logo, Product Name, Barcode, SKU, Price
 */

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { generateBarcodeLabelImage } from '../utils/barcodeGenerator';
import { LABEL_DIMENSIONS, TYPOGRAPHY, processLogoForLabel } from '../utils/thermalLabelTemplate';

export default function BarcodeLabelPreview({
  product = {},
  logoImage = null,
  showLogo = true,
  showSize = true,
  showSku = true,
  showPrice = true,
  currencySymbol = '₹',
  className = '',
}) {
  const containerRef = useRef(null);
  const [processedLogo, setProcessedLogo] = useState(null);
  const [barcodeImage, setBarcodeImage] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Process logo on mount and when logoImage changes
  useEffect(() => {
    if (showLogo && logoImage) {
      processLogoForLabel(logoImage)
        .then(processed => setProcessedLogo(processed))
        .catch(() => setProcessedLogo(null));
    } else {
      setProcessedLogo(null);
    }
  }, [logoImage, showLogo]);

  // Generate barcode image
  useEffect(() => {
    const barcodeValue = product.barcode || product.sku || `SKU${product.id}`;
    if (barcodeValue) {
      const img = generateBarcodeLabelImage(barcodeValue);
      setBarcodeImage(img);
    }
  }, [product.barcode, product.sku, product.id]);

  // Convert mm to pixels (96 DPI for screen display)
  const mmToPx = (mm) => (mm * 96) / 25.4;
  const labelWidthPx = mmToPx(LABEL_DIMENSIONS.WIDTH_MM) * zoomLevel;
  const labelHeightPx = mmToPx(LABEL_DIMENSIONS.HEIGHT_MM) * zoomLevel;

  const containerStyle = {
    width: `${labelWidthPx}px`,
    height: `${labelHeightPx}px`,
    border: '2px solid #e5e7eb',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    padding: `${mmToPx(LABEL_DIMENSIONS.MARGIN_LEFT) * zoomLevel}px`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    position: 'relative',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
  };

  const topSectionStyle = {
    display: 'flex',
    gap: `${mmToPx(LABEL_DIMENSIONS.LOGO_MARGIN_RIGHT) * zoomLevel}px`,
    alignItems: 'flex-start',
    marginBottom: `${mmToPx(LABEL_DIMENSIONS.SECTION_GAP) * zoomLevel}px`,
  };

  const logoStyle = {
    width: `${mmToPx(LABEL_DIMENSIONS.LOGO_MAX_WIDTH_MM) * zoomLevel}px`,
    height: `${mmToPx(LABEL_DIMENSIONS.LOGO_MAX_HEIGHT_MM) * zoomLevel}px`,
    flexShrink: 0,
    backgroundColor: '#f0f0f0',
    border: '1px solid #d0d0d0',
    borderRadius: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const productInfoStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  };

  const productNameStyle = {
    fontSize: `${TYPOGRAPHY.PRODUCT_NAME_SIZE_PT * zoomLevel}px`,
    fontWeight: 700,
    lineHeight: 1.1,
    color: '#000000',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  };

  const productSizeStyle = {
    fontSize: `${TYPOGRAPHY.PRODUCT_SIZE_SIZE_PT * zoomLevel}px`,
    fontStyle: 'italic',
    color: '#666666',
    marginTop: '0.2em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const middleSectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: `${mmToPx(0.3) * zoomLevel}px`,
    margin: `${mmToPx(LABEL_DIMENSIONS.SECTION_GAP) * zoomLevel}px 0`,
  };

  const barcodeContainerStyle = {
    width: '100%',
    height: `${mmToPx(LABEL_DIMENSIONS.BARCODE_IDEAL_HEIGHT_MM) * zoomLevel}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
    borderRadius: '2px',
  };

  const barcodeImageStyle = {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  };

  const barcodeNumberStyle = {
    fontSize: `${TYPOGRAPHY.BARCODE_NUMBER_SIZE_PT * zoomLevel}px`,
    fontWeight: 400,
    color: '#000000',
    fontFamily: 'monospace',
    letterSpacing: '0.5px',
    textAlign: 'center',
  };

  const bottomSectionStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '10px',
    paddingTop: `${mmToPx(0.3) * zoomLevel}px`,
    borderTop: '1px solid #f0f0f0',
  };

  const skuStyle = {
    fontSize: `${TYPOGRAPHY.SKU_LABEL_SIZE_PT * zoomLevel}px`,
    color: '#666666',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const priceStyle = {
    fontSize: `${TYPOGRAPHY.PRICE_SIZE_PT * zoomLevel}px`,
    fontWeight: 700,
    color: '#000000',
    textAlign: 'right',
    whiteSpace: 'nowrap',
  };

  const barcodeValue = product.barcode || product.sku || `SKU${product.id || 'N/A'}`;
  // Prefer batchNumber as the display code below the barcode
  const displayCode = product.batchNumber || product.barcode || product.sku || `SKU${product.id || 'N/A'}`;
  // Variant label to show on the label
  const variantLabel = product.sizeLabel || product.variantLabel || product.variantName || '';

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Preview Zoom:
        </label>
        <div className="flex gap-1">
          <button
            onClick={() => setZoomLevel(0.5)}
            className={`px-2 py-1 text-sm rounded ${
              zoomLevel === 0.5
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            50%
          </button>
          <button
            onClick={() => setZoomLevel(0.75)}
            className={`px-2 py-1 text-sm rounded ${
              zoomLevel === 0.75
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            75%
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className={`px-2 py-1 text-sm rounded ${
              zoomLevel === 1
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            100%
          </button>
          <button
            onClick={() => setZoomLevel(1.5)}
            className={`px-2 py-1 text-sm rounded ${
              zoomLevel === 1.5
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            150%
          </button>
        </div>
      </div>

      {/* Label Preview Container */}
      <div
        ref={containerRef}
        className="mx-auto bg-gray-50 dark:bg-gray-900 p-6 rounded-lg flex items-center justify-center"
      >
        <div style={containerStyle}>
          {/* Top Section: Logo + Product Info */}
          <div style={topSectionStyle}>
            {showLogo && processedLogo && (
              <div style={logoStyle}>
                <img
                  src={processedLogo}
                  alt="Store Logo"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>
            )}

            <div style={productInfoStyle}>
              <div style={productNameStyle}>
                {product.name || 'Product Name'}
              </div>

              {showSize && variantLabel && (
                <div style={productSizeStyle}>
                  [{variantLabel.toUpperCase()}]
                </div>
              )}
            </div>
          </div>

          {/* Middle Section: Barcode */}
          <div style={middleSectionStyle}>
            <div style={barcodeContainerStyle}>
              {barcodeImage ? (
                <img src={barcodeImage} alt={barcodeValue} style={barcodeImageStyle} />
              ) : (
                <div className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle size={12} />
                  Barcode error
                </div>
              )}
            </div>

            {/* Show batch number below barcode instead of SKU */}
            <div style={barcodeNumberStyle}>
              {displayCode}
            </div>
          </div>

          {/* Bottom Section: Variant Name + Price */}
          <div style={bottomSectionStyle}>
            {showSku && (
              <div style={skuStyle}>
                {variantLabel ? `[${variantLabel.toUpperCase()}]` : (product.sku || product.id || 'N/A')}
              </div>
            )}

            {showPrice && (
              <div style={priceStyle}>
                {currencySymbol}
                {Number(product.price || 0).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Label Specifications */}
      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 px-2">
        <p>
          <strong>Dimensions:</strong> {LABEL_DIMENSIONS.WIDTH_MM}mm × {LABEL_DIMENSIONS.HEIGHT_MM}mm (Landscape)
        </p>
        <p>
          <strong>Format:</strong> Code128 Barcode (Thermal Printer Ready)
        </p>
        <p>
          <strong>DPI:</strong> 203 (Standard) / 300 (Premium)
        </p>
        <p className="text-gray-500 dark:text-gray-500">
          This preview shows exactly how the label will appear when printed on a 50×25mm thermal sticker.
        </p>
      </div>
    </div>
  );
}
