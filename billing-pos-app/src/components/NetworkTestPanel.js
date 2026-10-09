// NetworkTestPanel.js - UI for testing network functionality
import React, { useState } from 'react';
import { useSyncedDB } from '../hooks/useSyncedDB';
import { getRemotePrintService } from '../services/RemotePrintService';
import { runAllTests, generateTestReport } from '../utils/networkTester';
import { Activity, PlayCircle, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const NetworkTestPanel = ({ onClose }) => {
  const db = useSyncedDB();
  const [testing, setTesting] = useState(false);
  const [testReport, setTestReport] = useState(null);
  const [serverIP, setServerIP] = useState('');

  /**
   * Run all tests
   */
  const handleRunTests = async () => {
    setTesting(true);
    setTestReport(null);

    try {
      const report = await runAllTests({
        serverIP: serverIP || null,
        db,
        printService: getRemotePrintService(),
      });

      setTestReport(report);
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setTesting(false);
    }
  };

  /**
   * Download test report
   */
  const handleDownloadReport = () => {
    if (!testReport) return;

    const html = generateTestReport(testReport);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-test-report-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Get status icon
   */
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pass':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'fail':
        return <XCircle size={16} className="text-red-600" />;
      case 'warning':
        return <AlertCircle size={16} className="text-orange-600" />;
      default:
        return <Activity size={16} className="text-gray-600" />;
    }
  };

  /**
   * Get status color
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'pass':
        return 'text-green-600';
      case 'fail':
        return 'text-red-600';
      case 'warning':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Activity size={24} className="text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Network Testing</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Test Configuration */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Server IP (optional - for connectivity test)
            </label>
            <input
              type="text"
              value={serverIP}
              onChange={(e) => setServerIP(e.target.value)}
              placeholder="192.168.1.100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to skip server connectivity test
            </p>
          </div>

          {/* Run Tests Button */}
          <div className="mb-6">
            <button
              onClick={handleRunTests}
              disabled={testing}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {testing ? (
                <>
                  <Activity size={20} className="animate-spin" />
                  <span>Running Tests...</span>
                </>
              ) : (
                <>
                  <PlayCircle size={20} />
                  <span>Run All Tests</span>
                </>
              )}
            </button>
          </div>

          {/* Test Results */}
          {testReport && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Test Summary</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{testReport.summary.passed}</div>
                    <div className="text-sm text-gray-600">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{testReport.summary.failed}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{testReport.summary.warnings}</div>
                    <div className="text-sm text-gray-600">Warnings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{testReport.summary.total}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                </div>
              </div>

              {/* Test Suites */}
              <div className="space-y-4">
                {testReport.suites.map((suite, suiteIndex) => (
                  <div key={suiteIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Suite Header */}
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(suite.overall)}
                        <h4 className="font-medium text-gray-900">{suite.name}</h4>
                      </div>
                      <span className={`text-sm font-medium ${getStatusColor(suite.overall)} uppercase`}>
                        {suite.overall}
                      </span>
                    </div>

                    {/* Tests */}
                    <div className="divide-y divide-gray-200">
                      {suite.tests.map((test, testIndex) => (
                        <div key={testIndex} className="px-4 py-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className="mt-0.5">{getStatusIcon(test.status)}</div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">{test.name}</div>
                                <div className="text-sm text-gray-600 mt-1">{test.message}</div>
                                {test.data && (
                                  <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-x-auto text-gray-600">
                                    {JSON.stringify(test.data, null, 2)}
                                  </pre>
                                )}
                              </div>
                            </div>
                            <span className={`text-xs font-medium ${getStatusColor(test.status)} uppercase ml-4`}>
                              {test.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Download Report */}
              <div className="flex justify-end">
                <button
                  onClick={handleDownloadReport}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <Download size={16} />
                  <span>Download Report</span>
                </button>
              </div>
            </div>
          )}

          {/* Instructions */}
          {!testReport && !testing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Testing Instructions</h4>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Tests will verify network connectivity, discovery, data sync, and printing</li>
                <li>Enter server IP for connectivity testing (optional)</li>
                <li>Tests will not affect your production data</li>
                <li>Download the report for troubleshooting if issues occur</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkTestPanel;
