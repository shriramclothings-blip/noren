import React, { useEffect, useMemo, useState } from 'react';
import { Barcode, HardDrive, Printer, Save, Settings, Sparkles, Tag } from 'lucide-react';
import { generateInvoicePrintHTML } from '../utils/helpers';
import { sanitizePrintSettings } from '../utils/printSettingsStore';
import { DEFAULT_PRINT_SETTINGS } from '../utils/printSettingsDefaults';

const BARCODE_FORMAT_OPTIONS = ['CODE128', 'CODE39', 'EAN13', 'UPC', 'QR_CODE'];
const LABEL_PRESETS = ['shelf', 'small sticker', 'clothing tag', 'price tag', 'warehouse label', 'custom'];

function cleanTemplateSettings(settings) {
  const { templates, activeTemplateId, ...rest } = settings;
  return rest;
}

function getPreviewInvoice(company) {
  return {
    invoiceNumber: 'PREVIEW-001',
    date: new Date().toISOString(),
    customerName: 'John Doe',
    customerPhone: '9876543210',
    customerAddress: '123 Market Road, City',
    paymentMode: 'Cash',
    subtotal: 1199.0,
    discountAmt: 50.0,
    taxAmt: 162.0,
    total: 1311.0,
    taxRate: 18,
    notes: 'Thank you for shopping with us!',
    items: [
      {
        name: 'Denim Jacket',
        qty: 1,
        price: 799.0,
        sku: 'DJ-001',
        size: 'M',
        variantName: 'Blue',
        taxRate: 18,
      },
      {
        name: 'Sneaker Shoes',
        qty: 2,
        price: 200.0,
        sku: 'SNK-045',
        size: '9',
        variantName: 'White',
        taxRate: 18,
      },
    ],
  };
}

export default function PrintSettingsPanel({ company, printSettings, savePrintSettings }) {
  const [settings, setSettings] = useState(() => sanitizePrintSettings(printSettings || {}));
  const [activeTab, setActiveTab] = useState('bill');
  const [templateName, setTemplateName] = useState('');
  const [previewScale, setPreviewScale] = useState(0.9);

  useEffect(() => {
    setSettings(sanitizePrintSettings(printSettings || {}));
  }, [printSettings]);

  const previewInvoice = useMemo(() => getPreviewInvoice(company), [company]);

  const previewHtml = useMemo(() => {
    const copy = { ...settings };
    return generateInvoicePrintHTML(previewInvoice, company, settings.billPrint.paperPreset?.startsWith('a4') ? 'a4' : 'thermal', { printSettings: copy });
  }, [company, previewInvoice, settings]);

  const updateSection = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const updateNested = (section, nestedSection, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [nestedSection]: {
          ...((prev[section] || {})[nestedSection]),
          [key]: value,
        },
      },
    }));
  };



  const saveCurrentSettings = () => {
    savePrintSettings(settings);
  };

  const resetToDefaults = () => {
    setSettings({ ...DEFAULT_PRINT_SETTINGS });
  };

  const handleSaveTemplate = () => {
    const name = templateName.trim() || `Template ${settings.templates.length + 1}`;
    const cleanSettings = cleanTemplateSettings(settings);
    const newTemplate = {
      id: `tpl-${Date.now()}`,
      name,
      settings: cleanSettings,
    };
    setSettings((prev) => ({
      ...prev,
      templates: [...(prev.templates || []), newTemplate],
      activeTemplateId: newTemplate.id,
    }));
    setTemplateName('');
  };

  const handleLoadTemplate = (templateId) => {
    const template = settings.templates?.find((item) => item.id === templateId);
    if (!template) return;
    setSettings((prev) => ({
      ...template.settings,
      templates: prev.templates,
      activeTemplateId: templateId,
    }));
  };

  const handleDuplicateTemplate = () => {
    const active = settings.templates?.find((item) => item.id === settings.activeTemplateId);
    if (!active) return;
    const duplicate = {
      id: `tpl-${Date.now()}`,
      name: `${active.name} Copy`,
      settings: { ...active.settings },
    };
    setSettings((prev) => ({
      ...prev,
      templates: [...(prev.templates || []), duplicate],
      activeTemplateId: duplicate.id,
    }));
  };

  const printerList = settings.printers?.detectedPrinters || [];
  const hasElectronPrinters = typeof window !== 'undefined' && (window.electronAPI?.getPrinters || window.electronAPI?.listPrinters);

  const detectPrinters = async () => {
    if (!hasElectronPrinters) return;
    try {
      const detected = await (window.electronAPI.listPrinters ? window.electronAPI.listPrinters() : window.electronAPI.getPrinters());
      setSettings((prev) => ({
        ...prev,
        printers: {
          ...prev.printers,
          detectedPrinters: detected,
          status: 'ready',
        },
      }));
    } catch (error) {
      setSettings((prev) => ({
        ...prev,
        printers: {
          ...prev.printers,
          status: 'error',
        },
      }));
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'bill', label: 'Bill Print', icon: Printer },
            { key: 'barcode', label: 'Barcode', icon: Barcode },
            { key: 'label', label: 'Label Print', icon: Tag },
            { key: 'recipe', label: 'KOT / Recipe', icon: Sparkles },
            { key: 'printer', label: 'Printer Setup', icon: HardDrive },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${activeTab === item.key ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon size={16} /> {item.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="card p-4 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{activeTab === 'bill' ? 'Bill Layout Settings' : activeTab === 'barcode' ? 'Barcode Settings' : activeTab === 'label' ? 'Label Print Settings' : activeTab === 'recipe' ? 'KOT / Recipe Settings' : 'Printer Detection & Defaults'}</h2>
              <p className="text-sm text-gray-500">Tune appearance, print targets and live preview behavior.</p>
            </div>
            <button onClick={saveCurrentSettings} className="btn-primary gap-2">
              <Save size={16} /> Save Settings
            </button>
          </div>

          {activeTab === 'bill' && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Paper Preset</label>
                  <select className="input w-full" value={settings.billPrint.paperPreset} onChange={(e) => updateSection('billPrint', 'paperPreset', e.target.value)}>
                    <option value="thermal58">58mm Receipt</option>
                    <option value="thermal72">72mm Receipt</option>
                    <option value="thermal80">80mm Receipt</option>
                    <option value="a4">A4 Invoice</option>
                    <option value="halfA4">Half A4</option>
                    <option value="custom">Custom Size</option>
                  </select>
                </div>
                {settings.billPrint.paperPreset === 'custom' && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-sm font-medium">Width (mm)</label>
                      <input type="number" className="input w-full" value={settings.billPrint.custom.widthMm} onChange={(e) => updateNested('billPrint', 'custom', 'widthMm', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Height (mm)</label>
                      <input type="number" className="input w-full" value={settings.billPrint.custom.heightMm} onChange={(e) => updateNested('billPrint', 'custom', 'heightMm', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Margins (mm)</label>
                      <input type="number" className="input w-full" value={settings.billPrint.custom.marginsMm} onChange={(e) => updateNested('billPrint', 'custom', 'marginsMm', Number(e.target.value))} />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="card p-4 bg-gray-50 dark:bg-gray-900/50">
                  <p className="font-semibold mb-3">Bill Content</p>
                  <div className="grid gap-3">
                    {[
                      ['showLogo', 'Show logo'],
                      ['showGstNumber', 'Show GST details'],
                      ['showBarcode', 'Print invoice barcode'],
                      ['showQrCode', 'Show QR code'],
                      ['showProductSku', 'Show SKU on items'],
                      ['showProductSize', 'Show product size'],
                      ['showDiscounts', 'Show discounts'],
                      ['showTaxes', 'Show tax rows'],
                      ['footerMessage', 'Show footer message'],
                    ].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={settings.billPrint.layout[key]} onChange={(e) => updateNested('billPrint', 'layout', key, e.target.checked)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="card p-4 bg-gray-50 dark:bg-gray-900/50">
                  <p className="font-semibold mb-3">Behavior</p>
                  <div className="grid gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={settings.billPrint.behavior.autoPrintAfterCheckout} onChange={(e) => updateNested('billPrint', 'behavior', 'autoPrintAfterCheckout', e.target.checked)} />
                      Auto print after checkout
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={settings.billPrint.behavior.printPreview} onChange={(e) => updateNested('billPrint', 'behavior', 'printPreview', e.target.checked)} />
                      Show preview before print
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={settings.billPrint.behavior.silentPrinting} onChange={(e) => updateNested('billPrint', 'behavior', 'silentPrinting', e.target.checked)} />
                      Silent printing when available
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      Copies
                      <input type="number" min="1" className="input w-20" value={settings.billPrint.behavior.multipleCopies} onChange={(e) => updateNested('billPrint', 'behavior', 'multipleCopies', Number(e.target.value) || 1)} />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={settings.billPrint.behavior.duplicateBillPrint} onChange={(e) => updateNested('billPrint', 'behavior', 'duplicateBillPrint', e.target.checked)} />
                      Print duplicate bill copy
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="card p-4 bg-gray-50 dark:bg-gray-900/50">
                  <p className="font-semibold mb-3">Thermal Performance</p>
                  <div className="grid gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={settings.billPrint.thermalOptimization.compactSpacing} onChange={(e) => updateNested('billPrint', 'thermalOptimization', 'compactSpacing', e.target.checked)} />
                      Compact spacing
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={settings.billPrint.thermalOptimization.darkModePrinting} onChange={(e) => updateNested('billPrint', 'thermalOptimization', 'darkModePrinting', e.target.checked)} />
                      Stronger contrast print
                    </label>
                    <div>
                      <label className="text-sm font-medium">Quality Mode</label>
                      <select className="input w-full" value={settings.billPrint.thermalOptimization.thermalQualityMode} onChange={(e) => updateNested('billPrint', 'thermalOptimization', 'thermalQualityMode', e.target.value)}>
                        <option value="economy">Economy</option>
                        <option value="standard">Standard</option>
                        <option value="high">High quality</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="card p-4 bg-gray-50 dark:bg-gray-900/50">
                  <p className="font-semibold mb-3">Manual Layout</p>
                  <div className="grid gap-3">
                    <div>
                      <label className="text-sm font-medium">Header align</label>
                      <select className="input w-full" value={settings.billPrint.typography.headerAlign || 'center'} onChange={(e) => updateNested('billPrint', 'typography', 'headerAlign', e.target.value)}>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Table align</label>
                      <select className="input w-full" value={settings.billPrint.typography.tableAlign || 'left'} onChange={(e) => updateNested('billPrint', 'typography', 'tableAlign', e.target.value)}>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Font size</label>
                      <input type="number" min="8" max="18" className="input w-full" value={settings.billPrint.custom.fontSizePt} onChange={(e) => updateNested('billPrint', 'custom', 'fontSizePt', Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'barcode' && (
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Barcode type</label>
                  <select className="input w-full" value={settings.barcode.defaultBarcodeFormat} onChange={(e) => updateSection('barcode', 'defaultBarcodeFormat', e.target.value)}>
                    {BARCODE_FORMAT_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Label preset</label>
                  <select className="input w-full" value={settings.barcode.labelPreset} onChange={(e) => updateSection('barcode', 'labelPreset', e.target.value)}>
                    {LABEL_PRESETS.map((label) => <option key={label} value={label}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium">Width (mm)</label>
                  <input type="number" className="input w-full" value={settings.barcode.custom.widthMm} onChange={(e) => updateSection('barcode', 'custom', { ...settings.barcode.custom, widthMm: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Height (mm)</label>
                  <input type="number" className="input w-full" value={settings.barcode.custom.heightMm} onChange={(e) => updateSection('barcode', 'custom', { ...settings.barcode.custom, heightMm: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Font size</label>
                  <input type="number" className="input w-full" value={settings.barcode.custom.fontSizePt} onChange={(e) => updateSection('barcode', 'custom', { ...settings.barcode.custom, fontSizePt: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={settings.barcode.display.showProductName} onChange={(e) => updateSection('barcode', 'display', { ...settings.barcode.display, showProductName: e.target.checked })} />
                  Display product name
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={settings.barcode.display.showSku} onChange={(e) => updateSection('barcode', 'display', { ...settings.barcode.display, showSku: e.target.checked })} />
                  Display SKU
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={settings.barcode.display.showPrice} onChange={(e) => updateSection('barcode', 'display', { ...settings.barcode.display, showPrice: e.target.checked })} />
                  Display price
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={settings.barcode.display.showQrCode} onChange={(e) => updateSection('barcode', 'display', { ...settings.barcode.display, showQrCode: e.target.checked })} />
                  Show QR on label
                </label>
              </div>
            </div>
          )}

          {activeTab === 'label' && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.label.sizeWiseLabels} onChange={(e) => updateSection('label', 'sizeWiseLabels', e.target.checked)} />
                Generate size-based labels
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.label.variantWiseLabels} onChange={(e) => updateSection('label', 'variantWiseLabels', e.target.checked)} />
                Generate variant-based labels
              </label>
              <div>
                <label className="text-sm font-medium">Labels per product</label>
                <input type="number" className="input w-full" min="1" value={settings.label.multipleLabelsPerProduct} onChange={(e) => updateSection('label', 'multipleLabelsPerProduct', Number(e.target.value))} />
              </div>
              <div>
                <label className="text-sm font-medium">Batch quantity</label>
                <input type="number" className="input w-full" min="1" value={settings.label.batchPrintQuantity} onChange={(e) => updateSection('label', 'batchPrintQuantity', Number(e.target.value))} />
              </div>
              <label className="flex items-center gap-2 text-sm col-span-2">
                <input type="checkbox" checked={settings.label.autoDuplicateLabels} onChange={(e) => updateSection('label', 'autoDuplicateLabels', e.target.checked)} />
                Automatically duplicate labels for bulk printing
              </label>
            </div>
          )}

          {activeTab === 'recipe' && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.kot.autoPrint} onChange={(e) => updateSection('kot', 'autoPrint', e.target.checked)} />
                Auto print KOT
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.kot.compactLayout} onChange={(e) => updateSection('kot', 'compactLayout', e.target.checked)} />
                Compact recipe layout
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.kot.categoryGrouping} onChange={(e) => updateSection('kot', 'categoryGrouping', e.target.checked)} />
                Group by category
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.kot.notesPrinting} onChange={(e) => updateSection('kot', 'notesPrinting', e.target.checked)} />
                Print notes/instructions
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.kot.timestampToggle} onChange={(e) => updateSection('kot', 'timestampToggle', e.target.checked)} />
                Print timestamp
              </label>
              <div>
                <label className="text-sm font-medium">Recipe font size</label>
                <input type="number" min="8" max="16" className="input w-full" value={settings.kot.fontSizePt} onChange={(e) => updateSection('kot', 'fontSizePt', Number(e.target.value))} />
              </div>
            </div>
          )}

          {activeTab === 'printer' && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Default printer</label>
                  <input type="text" className="input w-full" value={settings.printers.defaultPrinter} onChange={(e) => updateSection('printers', 'defaultPrinter', e.target.value)} placeholder="Printer name or device" />
                </div>
                <div>
                  <label className="text-sm font-medium">Bill printer</label>
                  <input type="text" className="input w-full" value={settings.printers.billPrinter} onChange={(e) => updateSection('printers', 'billPrinter', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Barcode printer</label>
                  <input type="text" className="input w-full" value={settings.printers.barcodePrinter} onChange={(e) => updateSection('printers', 'barcodePrinter', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Kitchen printer</label>
                  <input type="text" className="input w-full" value={settings.printers.kitchenPrinter} onChange={(e) => updateSection('printers', 'kitchenPrinter', e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <button type="button" onClick={detectPrinters} className="btn-secondary gap-2">
                  <Settings size={16} /> Detect Printers
                </button>
                <span className="text-sm text-gray-500">{printerList.length ? `${printerList.length} printers found` : 'Printer detection available in desktop build'}</span>
              </div>
              {printerList.length > 0 && (
                <div className="grid gap-2">
                  {printerList.map((printer) => (
                    <div key={printer.name} className="rounded-lg border border-gray-200 p-3 text-sm">
                      <div className="font-medium">{printer.name}</div>
                      <div className="text-gray-500">{printer.description || 'Desktop printer device'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Saved layout templates</label>
                <select className="input w-full" value={settings.activeTemplateId || ''} onChange={(e) => handleLoadTemplate(e.target.value)}>
                  <option value="">Select template</option>
                  {(settings.templates || []).map((template) => (
                    <option key={template.id} value={template.id}>{template.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button type="button" onClick={handleDuplicateTemplate} className="btn-secondary">Duplicate</button>
                <button type="button" onClick={resetToDefaults} className="btn-secondary">Reset Defaults</button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
              <input type="text" className="input w-full" placeholder="Template name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
              <button type="button" onClick={handleSaveTemplate} className="btn-primary">Save Template</button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Live print preview</h3>
            <p className="text-sm text-gray-500">Preview updates instantly for active layout and paper settings.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Scale</span>
            <input type="range" min="0.5" max="1.2" step="0.05" value={previewScale} onChange={(e) => setPreviewScale(Number(e.target.value))} />
            <span className="text-sm font-semibold">{Math.round(previewScale * 100)}%</span>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700">Receipt preview</div>
          <div className="relative overflow-hidden" style={{ minHeight: 480, background: '#f7fafc' }}>
            <iframe
              title="Print preview"
              srcDoc={previewHtml}
              className="w-full border-0"
              style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left', width: `${100 / previewScale}%`, minHeight: 480, background: '#ffffff' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
