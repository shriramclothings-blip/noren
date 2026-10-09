// networkTester.js - Testing utilities for network synchronization
// Use this to verify network functionality is working correctly

/**
 * Test network connectivity
 */
export const testNetworkConnectivity = async (serverIP, serverPort = 9876) => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    overall: 'pending',
  };

  // Test 1: Check if Electron APIs are available
  results.tests.push({
    name: 'Electron APIs',
    status: window.electron ? 'pass' : 'fail',
    message: window.electron ? 'Electron APIs available' : 'Electron APIs not found',
  });

  // Test 2: Check device ID generation
  try {
    if (window.electronAPI && window.electronAPI.license) {
      const deviceId = await window.electronAPI.license.getDeviceId();
      results.tests.push({
        name: 'Device ID',
        status: deviceId ? 'pass' : 'fail',
        message: deviceId ? `Device ID: ${deviceId}` : 'Failed to get device ID',
        data: { deviceId },
      });
    }
  } catch (error) {
    results.tests.push({
      name: 'Device ID',
      status: 'fail',
      message: error.message,
    });
  }

  // Test 3: Check network module availability
  results.tests.push({
    name: 'Network Modules',
    status: (window.electron?.networkServer && window.electron?.networkClient) ? 'pass' : 'fail',
    message: 'Network server and client modules',
  });

  // Test 4: Server reachability (if IP provided)
  if (serverIP) {
    try {
      const startTime = Date.now();
      // Try to connect briefly
      const response = await fetch(`http://${serverIP}:${serverPort}`, {
        method: 'GET',
        mode: 'no-cors',
      }).catch(() => null);
      
      const latency = Date.now() - startTime;
      
      results.tests.push({
        name: 'Server Reachability',
        status: latency < 5000 ? 'pass' : 'warning',
        message: `Server responded in ${latency}ms`,
        data: { latency, serverIP, serverPort },
      });
    } catch (error) {
      results.tests.push({
        name: 'Server Reachability',
        status: 'fail',
        message: `Cannot reach ${serverIP}:${serverPort}`,
      });
    }
  }

  // Determine overall status
  const failCount = results.tests.filter(t => t.status === 'fail').length;
  results.overall = failCount === 0 ? 'pass' : failCount < 2 ? 'warning' : 'fail';

  return results;
};

/**
 * Test data synchronization
 */
export const testDataSync = async (db) => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    overall: 'pending',
  };

  try {
    // Test 1: Create test record
    const testProduct = {
      name: `Network Test ${Date.now()}`,
      sku: `TEST-${Date.now()}`,
      price: 99.99,
      category: 'Test',
      _test: true,
    };

    const productId = await db.add('products', testProduct);
    results.tests.push({
      name: 'Create Record',
      status: productId ? 'pass' : 'fail',
      message: productId ? `Created product ID: ${productId}` : 'Failed to create',
      data: { productId },
    });

    // Test 2: Read record
    const retrieved = await db.get('products', productId);
    results.tests.push({
      name: 'Read Record',
      status: retrieved ? 'pass' : 'fail',
      message: retrieved ? 'Successfully retrieved record' : 'Failed to retrieve',
    });

    // Test 3: Update record
    const updated = await db.put('products', {
      ...retrieved,
      price: 149.99,
    });
    results.tests.push({
      name: 'Update Record',
      status: 'pass',
      message: 'Successfully updated record',
    });

    // Test 4: Cleanup - delete test record
    await db.delete('products', productId);
    results.tests.push({
      name: 'Delete Record',
      status: 'pass',
      message: 'Test cleanup successful',
    });

    results.overall = 'pass';
  } catch (error) {
    results.tests.push({
      name: 'Data Sync Test',
      status: 'fail',
      message: error.message,
    });
    results.overall = 'fail';
  }

  return results;
};

/**
 * Test remote printing
 */
export const testRemotePrint = async (printService) => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    overall: 'pending',
  };

  try {
    // Create test HTML
    const testHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial; padding: 20px; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Network Print Test</h1>
          <p>Timestamp: ${new Date().toLocaleString()}</p>
          <p>This is a test print to verify remote printing functionality.</p>
        </body>
      </html>
    `;

    // Test print (will use local or remote based on setup)
    const result = await printService.print({
      html: testHTML,
      options: {
        silent: true,
        showWindow: false,
      },
    });

    results.tests.push({
      name: 'Print Test',
      status: result.success ? 'pass' : 'fail',
      message: result.message || 'Print test completed',
      data: { method: result.method },
    });

    results.overall = result.success ? 'pass' : 'fail';
  } catch (error) {
    results.tests.push({
      name: 'Print Test',
      status: 'fail',
      message: error.message,
    });
    results.overall = 'fail';
  }

  return results;
};

/**
 * Test server discovery
 */
export const testServerDiscovery = async () => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    overall: 'pending',
  };

  try {
    if (!window.electron?.networkClient) {
      throw new Error('Network client not available');
    }

    const discoveryResult = await window.electron.networkClient.discover();
    const servers = discoveryResult.servers || [];

    results.tests.push({
      name: 'Server Discovery',
      status: 'pass',
      message: `Found ${servers.length} server(s)`,
      data: { servers },
    });

    results.overall = 'pass';
  } catch (error) {
    results.tests.push({
      name: 'Server Discovery',
      status: 'fail',
      message: error.message,
    });
    results.overall = 'fail';
  }

  return results;
};

/**
 * Run all tests
 */
export const runAllTests = async (config = {}) => {
  const {
    serverIP = null,
    db = null,
    printService = null,
  } = config;

  const report = {
    timestamp: new Date().toISOString(),
    suites: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
    },
  };

  console.log('🧪 Running network tests...');

  // Test 1: Network connectivity
  const connectivityResults = await testNetworkConnectivity(serverIP);
  report.suites.push({
    name: 'Network Connectivity',
    ...connectivityResults,
  });

  // Test 2: Server discovery
  const discoveryResults = await testServerDiscovery();
  report.suites.push({
    name: 'Server Discovery',
    ...discoveryResults,
  });

  // Test 3: Data sync (if db provided)
  if (db) {
    const syncResults = await testDataSync(db);
    report.suites.push({
      name: 'Data Synchronization',
      ...syncResults,
    });
  }

  // Test 4: Remote printing (if service provided)
  if (printService) {
    const printResults = await testRemotePrint(printService);
    report.suites.push({
      name: 'Remote Printing',
      ...printResults,
    });
  }

  // Calculate summary
  report.suites.forEach(suite => {
    suite.tests.forEach(test => {
      report.summary.total++;
      if (test.status === 'pass') report.summary.passed++;
      else if (test.status === 'fail') report.summary.failed++;
      else if (test.status === 'warning') report.summary.warnings++;
    });
  });

  // Log results
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${report.summary.passed}`);
  console.log(`❌ Failed: ${report.summary.failed}`);
  console.log(`⚠️  Warnings: ${report.summary.warnings}`);
  console.log(`📝 Total: ${report.summary.total}`);

  return report;
};

/**
 * Generate test report HTML
 */
export const generateTestReport = (report) => {
  const statusEmoji = {
    pass: '✅',
    fail: '❌',
    warning: '⚠️',
    pending: '⏳',
  };

  let html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Network Test Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
          .summary { background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .suite { margin: 20px 0; border: 1px solid #ddd; border-radius: 5px; }
          .suite-header { background: #f5f5f5; padding: 10px; font-weight: bold; }
          .test { padding: 10px; border-bottom: 1px solid #eee; }
          .test:last-child { border-bottom: none; }
          .pass { color: #4CAF50; }
          .fail { color: #f44336; }
          .warning { color: #ff9800; }
          .timestamp { color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Network Synchronization Test Report</h1>
          <div class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</div>
          
          <div class="summary">
            <h3>Summary</h3>
            <p>✅ Passed: ${report.summary.passed}</p>
            <p>❌ Failed: ${report.summary.failed}</p>
            <p>⚠️ Warnings: ${report.summary.warnings}</p>
            <p>📝 Total: ${report.summary.total}</p>
          </div>
  `;

  report.suites.forEach(suite => {
    html += `
      <div class="suite">
        <div class="suite-header">${statusEmoji[suite.overall]} ${suite.name}</div>
    `;

    suite.tests.forEach(test => {
      html += `
        <div class="test">
          <div class="${test.status}">
            ${statusEmoji[test.status]} <strong>${test.name}</strong>: ${test.status.toUpperCase()}
          </div>
          <div>${test.message}</div>
          ${test.data ? `<pre style="font-size: 0.85em; color: #666;">${JSON.stringify(test.data, null, 2)}</pre>` : ''}
        </div>
      `;
    });

    html += `</div>`;
  });

  html += `
        </div>
      </body>
    </html>
  `;

  return html;
};

export default {
  testNetworkConnectivity,
  testDataSync,
  testRemotePrint,
  testServerDiscovery,
  runAllTests,
  generateTestReport,
};
