import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, Cloud, QrCode, Sparkles, Shield, 
  Building2, Printer, Globe, Database, Bell, Zap 
} from 'lucide-react';
import CloudSyncSettingsPanelEnhanced from '../components/CloudSyncSettingsPanelEnhanced';
import OnlineInvoiceQRPanel from '../components/OnlineInvoiceQRPanel';
import EnhancedAISettingsPanel from '../components/EnhancedAISettingsPanel';
import AIInventorySettingsPanel from '../components/AIInventorySettingsPanel';
import PrintSettingsPanel from '../components/PrintSettingsPanel';
import PaymentGatewaySettingsPanel from '../components/PaymentGatewaySettingsPanel';
import WhatsAppSettingsPanel from '../components/WhatsAppSettingsPanel';
import NetworkSettingsPanelEmbedded from '../components/NetworkSettingsPanelEmbedded';

export default function SettingsEnhanced() {
  const [activeTab, setActiveTab] = useState('cloud-sync');

  const tabs = [
    { id: 'cloud-sync', label: 'Cloud Sync', icon: Cloud, color: 'blue' },
    { id: 'invoice-qr', label: 'Invoice QR', icon: QrCode, color: 'green' },
    { id: 'ai-features', label: 'AI Features', icon: Sparkles, color: 'purple' },
    { id: 'ai-inventory', label: 'AI Inventory', icon: Zap, color: 'purple' },
    { id: 'network', label: 'Network', icon: Globe, color: 'cyan' },
    { id: 'printing', label: 'Printing', icon: Printer, color: 'gray' },
    { id: 'payments', label: 'Payments', icon: Database, color: 'yellow' },
    { id: 'whatsapp', label: 'WhatsApp', icon: Bell, color: 'green' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'cloud-sync':
        return <CloudSyncSettingsPanelEnhanced />;
      case 'invoice-qr':
        return <OnlineInvoiceQRPanel />;
      case 'ai-features':
        return <EnhancedAISettingsPanel />;
      case 'ai-inventory':
        return <AIInventorySettingsPanel />;
      case 'network':
        return <NetworkSettingsPanelEmbedded />;
      case 'printing':
        return <PrintSettingsPanel />;
      case 'payments':
        return <PaymentGatewaySettingsPanel />;
      case 'whatsapp':
        return <WhatsAppSettingsPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Configure your VENDEXA RetailOS™ system</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar Tabs */}
        <div className="col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sticky top-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                    isActive
                      ? `bg-${tab.color}-50 text-${tab.color}-700 font-medium`
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? `text-${tab.color}-600` : 'text-gray-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="col-span-9">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Quick Stats Footer */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Cloud Status</div>
              <div className="text-lg font-semibold text-green-600">Connected</div>
            </div>
            <Cloud className="w-8 h-8 text-green-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">AI Features</div>
              <div className="text-lg font-semibold text-purple-600">6 Active</div>
            </div>
            <Sparkles className="w-8 h-8 text-purple-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">QR Type</div>
              <div className="text-lg font-semibold text-blue-600">Online</div>
            </div>
            <QrCode className="w-8 h-8 text-blue-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">System Health</div>
              <div className="text-lg font-semibold text-green-600">Excellent</div>
            </div>
            <Zap className="w-8 h-8 text-green-600 opacity-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
