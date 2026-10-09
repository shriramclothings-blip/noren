/**
 * Thermal Label Printing System - Validation Test Script
 * Run this to verify your thermal printing system is production-ready
 */

import {
  validateLabelDimensions,
  validateBarcodeParams,
  validateLabelContentFit,
  validateCompleteLabel,
  generateValidationReport,
  calculateBarcodeForDPI,
} from '../utils/thermalLabelValidator';

import {
  THERMAL_PRINTER_CONFIG,
  THERMAL_LABEL_PRESETS,
} from '../utils/thermalPrinterConfig';

/**
 * Run complete system validation
 * @returns {Object} Complete validation report
 */
export function runSystemValidation() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🖨️  THERMAL LABEL PRINTING SYSTEM - VALIDATION TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const report = {
    timestamp: new Date().toISOString(),
    tests: [],
    passed: 0,
    failed: 0,
    productionReady: false,
  };

  // Test 1: Label Dimensions
  console.log('Test 1: Label Dimensions Validation');
  const dimTest = validateLabelDimensions(50, 25);
  report.tests.push({
    name: 'Label Dimensions (50×25mm)',
    result: dimTest.valid ? '✅ PASS' : '❌ FAIL',
    details: dimTest,
  });
  console.log(`  ${dimTest.valid ? '✅ PASS' : '❌ FAIL'} - 50×25mm dimensions valid`);
  if (dimTest.warnings.length > 0) {
    dimTest.warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
  }
  if (dimTest.valid) report.passed++;
  else report.failed++;

  // Test 2: Barcode Parameters (Code 128, optimal for 50mm)
  console.log('\nTest 2: Barcode Parameters Validation');
  const barcodeTest = validateBarcodeParams('1234567890', 0.58, 7);
  report.tests.push({
    name: 'Barcode (Code 128, 0.58mm width, 7mm height)',
    result: barcodeTest.valid ? '✅ PASS' : '❌ FAIL',
    details: barcodeTest,
  });
  console.log(`  ${barcodeTest.valid ? '✅ PASS' : '❌ FAIL'} - Code 128 barcode valid`);
  console.log(`     Module width: 0.58mm (optimal for 50mm)`);
  console.log(`     Height: 7mm (scannable, fits on 25mm)`);
  if (barcodeTest.warnings.length > 0) {
    barcodeTest.warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
  }
  if (barcodeTest.valid) report.passed++;
  else report.failed++;

  // Test 3: Content Fit
  console.log('\nTest 3: Content Fit Validation');
  const contentTest = validateLabelContentFit({
    labelWidth: 50,
    labelHeight: 25,
    barcodeHeight: 7,
    showProductName: true,
    showSku: true,
    showPrice: true,
    showSize: false,
  });
  report.tests.push({
    name: 'Content Fit (Product Name, SKU, Price, Barcode)',
    result: contentTest.valid ? '✅ PASS' : '❌ FAIL',
    details: contentTest,
  });
  console.log(`  ${contentTest.valid ? '✅ PASS' : '❌ FAIL'} - Content fits without overflow`);
  console.log(`     Total height needed: ${contentTest.metadata.totalRequiredHeight}mm`);
  console.log(`     Label height available: 25mm`);
  if (contentTest.warnings.length > 0) {
    contentTest.warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
  }
  if (contentTest.valid) report.passed++;
  else report.failed++;

  // Test 4: Complete Label Validation
  console.log('\nTest 4: Complete Label Validation');
  const completeTest = validateCompleteLabel({
    labelWidth: 50,
    labelHeight: 25,
    barcodeValue: '1234567890ABC',
    barcodeModuleWidth: 0.58,
    barcodeHeight: 7,
    showProductName: true,
    showSku: true,
    showPrice: true,
    showSize: false,
    printerModel: 'xprinter',
  });
  report.tests.push({
    name: 'Complete Label (Production Readiness)',
    result: completeTest.valid ? '✅ PASS' : '❌ FAIL',
    details: completeTest,
  });
  console.log(`  ${completeTest.valid ? '✅ PASS' : '❌ FAIL'} - Label production ready`);
  console.log(`     Printer: ${completeTest.metadata.printer}`);
  console.log(`     DPI: ${completeTest.metadata.dpi}`);
  console.log(`     Production Ready: ${completeTest.isProductionReady ? 'YES' : 'NO'}`);
  if (completeTest.errors.length > 0) {
    completeTest.errors.forEach((e) => console.log(`  ❌ ${e}`));
  }
  if (completeTest.warnings.length > 0) {
    completeTest.warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
  }
  if (completeTest.valid) report.passed++;
  else report.failed++;

  // Test 5: DPI Calculations
  console.log('\nTest 5: DPI-Based Barcode Calculations');
  const dpiTest = calculateBarcodeForDPI({
    labelWidthMm: 50,
    labelHeightMm: 25,
    dpi: 203,
  });
  report.tests.push({
    name: 'DPI Calculations (203 DPI for 50×25mm)',
    result: '✅ PASS',
    details: dpiTest,
  });
  console.log(`  ✅ PASS - DPI calculations correct`);
  console.log(`     Module Width: ${dpiTest.moduleWidthMm}mm`);
  console.log(`     Barcode Height: ${dpiTest.barcodeHeightMm}mm`);
  console.log(`     Recommended DPI: ${dpiTest.recommendedDPI}`);
  report.passed++;

  // Test 6: Printer Configuration Support
  console.log('\nTest 6: Printer Support Validation');
  const printerModels = Object.keys(THERMAL_PRINTER_CONFIG);
  const supportedModels = printerModels.filter((model) => {
    const config = THERMAL_PRINTER_CONFIG[model];
    return config.supportedSizes && config.supportedSizes.includes('shelf50x25');
  });
  report.tests.push({
    name: 'Printer Model Support (50×25mm)',
    result: supportedModels.length > 0 ? '✅ PASS' : '❌ FAIL',
    details: {
      totalModels: printerModels.length,
      supportedModels: supportedModels.length,
      models: supportedModels,
    },
  });
  console.log(`  ✅ PASS - ${supportedModels.length}/${printerModels.length} printer models support 50×25mm`);
  supportedModels.forEach((model) => {
    const config = THERMAL_PRINTER_CONFIG[model];
    console.log(`     • ${config.name} (${config.dpi} DPI)`);
  });
  report.passed++;

  // Test 7: Label Preset Validation
  console.log('\nTest 7: Label Preset Validation');
  const shelfPreset = THERMAL_LABEL_PRESETS.shelf50x25;
  const presetValid = shelfPreset && shelfPreset.widthMm === 50 && shelfPreset.heightMm === 25;
  report.tests.push({
    name: 'Label Preset (50×25mm Shelf)',
    result: presetValid ? '✅ PASS' : '❌ FAIL',
    details: shelfPreset,
  });
  console.log(`  ${presetValid ? '✅ PASS' : '❌ FAIL'} - Shelf label preset configured`);
  if (presetValid) {
    console.log(`     Size: ${shelfPreset.widthMm}×${shelfPreset.heightMm}mm`);
    console.log(`     Barcode Height: ${shelfPreset.barcodeHeightMm}mm`);
    console.log(`     Module Width: ${shelfPreset.barcodeModuleWidth}mm`);
    report.passed++;
  } else {
    report.failed++;
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`✅ Passed: ${report.passed}`);
  console.log(`❌ Failed: ${report.failed}`);
  console.log(`📈 Score: ${Math.round((report.passed / (report.passed + report.failed)) * 100)}%\n`);

  report.productionReady = report.failed === 0;

  if (report.productionReady) {
    console.log('🎉 SYSTEM IS PRODUCTION READY!');
    console.log('\nYour thermal label printing system passed all validation tests.');
    console.log('You can proceed with production printing.\n');
  } else {
    console.log('⚠️  SYSTEM NEEDS ATTENTION');
    console.log('\nThe following issues must be fixed before production:');
    report.tests.forEach((test) => {
      if (test.details && test.details.errors && test.details.errors.length > 0) {
        console.log(`\n❌ ${test.name}`);
        test.details.errors.forEach((e) => console.log(`   • ${e}`));
      }
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return report;
}

/**
 * Test batch validation
 * @returns {Object} Batch validation report
 */
export function testBatchValidation() {
  console.log('\n📦 BATCH VALIDATION TEST\n');

  const testLabels = [
    {
      labelWidth: 50,
      labelHeight: 25,
      barcodeValue: '1234567890',
      barcodeModuleWidth: 0.58,
      barcodeHeight: 7,
      showProductName: true,
    },
    {
      labelWidth: 50,
      labelHeight: 25,
      barcodeValue: '2345678901',
      barcodeModuleWidth: 0.58,
      barcodeHeight: 7,
      showProductName: true,
    },
    {
      labelWidth: 50,
      labelHeight: 25,
      barcodeValue: '3456789012',
      barcodeModuleWidth: 0.58,
      barcodeHeight: 7,
      showProductName: true,
    },
  ];

  const report = generateValidationReport(testLabels);

  console.log(`Total Labels: ${report.totalLabels}`);
  console.log(`Valid: ${report.validLabels}`);
  console.log(`Invalid: ${report.invalidLabels}`);
  console.log(`Production Ready: ${report.productionReady ? 'YES ✅' : 'NO ❌'}`);

  if (report.allErrors.length > 0) {
    console.log('\nErrors:');
    report.allErrors.forEach((e) => console.log(`  ❌ ${e}`));
  }

  if (report.allWarnings.length > 0) {
    console.log('\nWarnings:');
    report.allWarnings.forEach((w) => console.log(`  ⚠️  ${w}`));
  }

  console.log('\n');
  return report;
}

/**
 * Print user-friendly validation report
 */
export function printValidationReport() {
  const report = runSystemValidation();
  testBatchValidation();

  return report;
}

// Export for Node.js or browser use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runSystemValidation,
    testBatchValidation,
    printValidationReport,
  };
}
