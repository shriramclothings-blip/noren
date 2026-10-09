import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { exportToExcel, exportMultipleSheets, exportMasterPDF } from '../utils/exportUtils';
import {
  BarChart3, TrendingUp, Users, UserCog, Download, DollarSign,
  Package, FileSpreadsheet, Layers, Receipt,
  Truck, Star, Zap, AlertTriangle, FileText,
} from 'lucide-react';
import { subDays, format } from 'date-fns';

const fmt = (n, cur = '₹') =>
  `${cur}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── TAB: Per-Item Profit Report ─────────────────────────────────────────────
function PerItemProfit({ invoices, products, company }) {
  const [dateRange, setDateRange] = useState('30days');
  const [catFilter, setCatFilter] = useState('All');

  const from = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case '7days': return subDays(now, 7);
      case '30days': return subDays(now, 30);
      case '90days': return subDays(now, 90);
      case 'all': return new Date('2000-01-01');
      default: return subDays(now, 30);
    }
  }, [dateRange]);

  const categories = useMemo(() => ['All', ...new Set(products.map(p => p.category).filter(Boolean))], [products]);

  const itemProfits = useMemo(() => {
    const map = {};
    invoices
      .filter(inv => new Date(inv.date) >= from && inv.status !== 'Refund')
      .forEach(inv => {
        (inv.items || []).forEach(item => {
          const prod = products.find(p => p.id === item.productId);
          const cost = Number(item.costPrice ?? prod?.costPrice ?? 0);
          const sale = Number(item.price || 0);
          const qty = Number(item.qty || 0);
          const profit = (sale - cost) * qty;
          const revenue = sale * qty;
          const key = item.productId || item.name;

          if (!map[key]) {
            map[key] = {
              productId: item.productId,
              name: item.name || prod?.name || 'Unknown',
              category: prod?.category || '—',
              sku: prod?.sku || '—',
              totalQty: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0,
              invoiceCount: 0,
            };
          }
          map[key].totalQty += qty;
          map[key].totalRevenue += revenue;
          map[key].totalCost += cost * qty;
          map[key].totalProfit += profit;
          map[key].invoiceCount += 1;
        });
      });

    return Object.values(map)
      .filter(p => catFilter === 'All' || p.category === catFilter)
      .map(p => ({
        ...p,
        margin: p.totalRevenue > 0 ? (p.totalProfit / p.totalRevenue) * 100 : 0,
        avgProfit: p.totalQty > 0 ? p.totalProfit / p.totalQty : 0,
      }))
      .sort((a, b) => b.totalProfit - a.totalProfit);
  }, [invoices, products, from, catFilter]);

  const totals = useMemo(() => ({
    revenue: itemProfits.reduce((s, p) => s + p.totalRevenue, 0),
    cost: itemProfits.reduce((s, p) => s + p.totalCost, 0),
    profit: itemProfits.reduce((s, p) => s + p.totalProfit, 0),
    qty: itemProfits.reduce((s, p) => s + p.totalQty, 0),
  }), [itemProfits]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <div className="card p-4 border-l-4 border-primary-500">
          <p className="text-xl font-bold text-primary-600">{fmt(totals.revenue, company.currency)}</p>
          <p className="text-xs text-gray-400">Total Revenue</p>
        </div>
        <div className="card p-4 border-l-4 border-red-400">
          <p className="text-xl font-bold text-red-500">{fmt(totals.cost, company.currency)}</p>
          <p className="text-xs text-gray-400">Total Cost</p>
        </div>
        <div className="card p-4 border-l-4 border-emerald-500">
          <p className="text-xl font-bold text-emerald-600">{fmt(totals.profit, company.currency)}</p>
          <p className="text-xs text-gray-400">Total Profit</p>
        </div>
        <div className="card p-4 border-l-4 border-amber-500">
          <p className="text-xl font-bold text-amber-600">
            {totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) : 0}%
          </p>
          <p className="text-xs text-gray-400">Overall Margin</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {['7days', '30days', '90days', 'all'].map(r => (
          <button key={r} onClick={() => setDateRange(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${dateRange === r ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
            {r === 'all' ? 'All Time' : r === '7days' ? 'Last 7 Days' : r === '30days' ? 'Last 30 Days' : 'Last 90 Days'}
          </button>
        ))}
        <select className="input text-sm" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <button
          onClick={() => exportToExcel(itemProfits.map(p => ({
            Product: p.name, Category: p.category, SKU: p.sku,
            UnitsSold: p.totalQty, Revenue: p.totalRevenue.toFixed(2),
            TotalCost: p.totalCost.toFixed(2), TotalProfit: p.totalProfit.toFixed(2),
            Margin: `${p.margin.toFixed(1)}%`, AvgProfitPerUnit: p.avgProfit.toFixed(2),
          })), `per-item-profit-${new Date().toISOString().split('T')[0]}.xlsx`, 'ItemProfit')}
          className="btn-secondary btn-sm gap-2 ml-auto"
        >
          <Download size={14} /> Export
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['#', 'Product', 'Category', 'Units Sold', 'Revenue', 'Total Cost', 'Total Profit', 'Margin', 'Avg Profit/Unit'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {itemProfits.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="table-cell text-gray-400">{i + 1}</td>
                  <td className="table-cell font-medium">{p.name}</td>
                  <td className="table-cell text-gray-500">{p.category}</td>
                  <td className="table-cell font-semibold">{p.totalQty}</td>
                  <td className="table-cell">{fmt(p.totalRevenue, company.currency)}</td>
                  <td className="table-cell text-red-500">{fmt(p.totalCost, company.currency)}</td>
                  <td className="table-cell font-semibold text-emerald-600">{fmt(p.totalProfit, company.currency)}</td>
                  <td className="table-cell">
                    <span className={`font-medium ${p.margin >= 40 ? 'text-emerald-600' : p.margin >= 20 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {p.margin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="table-cell font-semibold text-primary-600">{fmt(p.avgProfit, company.currency)}</td>
                </tr>
              ))}
              {itemProfits.length === 0 && <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-12">No sales data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: Supplier-Wise Profit ───────────────────────────────────────────────
function SupplierProfit({ invoices, products, suppliers, purchases, company }) {
  const supplierData = useMemo(() => {
    return suppliers.map(sup => {
      const supProducts = products.filter(p => p.supplierId === sup.id);
      const supProductIds = new Set(supProducts.map(p => p.id));

      let revenue = 0, cost = 0, profit = 0, unitsSold = 0;
      invoices.forEach(inv => {
        (inv.items || []).forEach(item => {
          if (!supProductIds.has(item.productId)) return;
          const prod = products.find(p => p.id === item.productId);
          const c = Number(item.costPrice ?? prod?.costPrice ?? 0);
          const s = Number(item.price || 0);
          const q = Number(item.qty || 0);
          revenue += s * q;
          cost += c * q;
          profit += (s - c) * q;
          unitsSold += q;
        });
      });

      const totalPurchased = purchases
        .filter(p => p.supplierId === sup.id)
        .reduce((s, p) => s + (p.total || 0), 0);

      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        ...sup, revenue, cost, profit, unitsSold, totalPurchased, margin,
        productCount: supProducts.length,
        roi: totalPurchased > 0 ? (profit / totalPurchased) * 100 : 0,
      };
    }).sort((a, b) => b.profit - a.profit);
  }, [suppliers, products, invoices, purchases]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => exportToExcel(supplierData.map(s => ({
            Supplier: s.name, Products: s.productCount, UnitsSold: s.unitsSold,
            Revenue: s.revenue.toFixed(2), Cost: s.cost.toFixed(2),
            Profit: s.profit.toFixed(2), Margin: `${s.margin.toFixed(1)}%`,
            TotalPurchased: s.totalPurchased.toFixed(2), ROI: `${s.roi.toFixed(1)}%`,
          })), `supplier-profit-${new Date().toISOString().split('T')[0]}.xlsx`, 'SupplierProfit')}
          className="btn-secondary btn-sm gap-2"
        >
          <Download size={14} /> Export
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {supplierData.slice(0, 4).map((s, i) => (
          <div key={s.id} className="card p-4 relative overflow-hidden">
            <div className="absolute top-2 right-2 text-xs font-bold text-gray-300">#{i + 1}</div>
            <p className="font-semibold text-sm truncate">{s.name}</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{fmt(s.profit, company.currency)}</p>
            <p className="text-xs text-gray-400">Profit · {s.margin.toFixed(1)}% margin</p>
            <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, s.margin)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['#', 'Supplier', 'Products', 'Units Sold', 'Revenue', 'Profit', 'Margin', 'Total Purchased', 'ROI'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {supplierData.map((s, i) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="table-cell text-gray-400">{i + 1}</td>
                  <td className="table-cell font-medium">{s.name}</td>
                  <td className="table-cell">{s.productCount}</td>
                  <td className="table-cell">{s.unitsSold}</td>
                  <td className="table-cell">{fmt(s.revenue, company.currency)}</td>
                  <td className="table-cell font-semibold text-emerald-600">{fmt(s.profit, company.currency)}</td>
                  <td className="table-cell">
                    <span className={`font-medium ${s.margin >= 40 ? 'text-emerald-600' : s.margin >= 20 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {s.margin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="table-cell text-red-400">{fmt(s.totalPurchased, company.currency)}</td>
                  <td className="table-cell">
                    <span className={`font-bold ${s.roi >= 30 ? 'text-emerald-600' : s.roi >= 10 ? 'text-yellow-500' : 'text-gray-400'}`}>
                      {s.roi.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {supplierData.length === 0 && <tr><td colSpan={9} className="table-cell text-center text-gray-400 py-12">No supplier data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: Staff Sales Performance ───────────────────────────────────────────
function StaffPerformance({ invoices, products, staff, company }) {
  const [dateRange, setDateRange] = useState('30days');

  const from = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case '7days': return subDays(now, 7);
      case '30days': return subDays(now, 30);
      case '90days': return subDays(now, 90);
      default: return subDays(now, 30);
    }
  }, [dateRange]);

  const staffData = useMemo(() => {
    const filteredInv = invoices.filter(inv => new Date(inv.date) >= from && inv.status !== 'Refund');

    const staffMap = {};
    filteredInv.forEach(inv => {
      const staffName = inv.staffName || inv.cashierName || inv.addedBy || 'Unknown';
      if (!staffMap[staffName]) {
        staffMap[staffName] = { name: staffName, bills: 0, revenue: 0, profit: 0, units: 0, avgBill: 0 };
      }
      staffMap[staffName].bills += 1;
      staffMap[staffName].revenue += inv.total || 0;
      (inv.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const cost = Number(item.costPrice ?? prod?.costPrice ?? 0);
        staffMap[staffName].profit += (Number(item.price || 0) - cost) * Number(item.qty || 0);
        staffMap[staffName].units += Number(item.qty || 0);
      });
    });

    return Object.values(staffMap).map(s => ({
      ...s,
      avgBill: s.bills > 0 ? s.revenue / s.bills : 0,
      margin: s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [invoices, products, from]);

  const topRevenue = staffData[0]?.revenue || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {['7days', '30days', '90days'].map(r => (
            <button key={r} onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${dateRange === r ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
              {r === '7days' ? 'Last 7 Days' : r === '30days' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
        </div>
        <button
          onClick={() => exportToExcel(staffData.map(s => ({
            Staff: s.name, Bills: s.bills, Revenue: s.revenue.toFixed(2),
            Profit: s.profit.toFixed(2), Units: s.units, AvgBill: s.avgBill.toFixed(2),
            Margin: `${s.margin.toFixed(1)}%`,
          })), `staff-performance-${new Date().toISOString().split('T')[0]}.xlsx`, 'StaffPerf')}
          className="btn-secondary btn-sm gap-2"
        >
          <Download size={14} /> Export
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {staffData.slice(0, 4).map((s, i) => (
          <div key={s.name} className="card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-primary-400'
              }`}>
                {s.name[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm">{s.name}</p>
                <p className="text-xs text-gray-400">{s.bills} bills</p>
              </div>
            </div>
            <p className="text-lg font-bold text-primary-600">{fmt(s.revenue, company.currency)}</p>
            <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
              <div className="h-full bg-primary-500 rounded-full" style={{ width: `${(s.revenue / topRevenue) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {['#', 'Staff', 'Bills Generated', 'Revenue', 'Profit', 'Units Sold', 'Avg Bill Value', 'Margin'].map(h => (
                  <th key={h} className="table-head">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {staffData.map((s, i) => (
                <tr key={s.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="table-cell">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                    }`}>{i + 1}</span>
                  </td>
                  <td className="table-cell font-medium">{s.name}</td>
                  <td className="table-cell text-center font-semibold text-primary-600">{s.bills}</td>
                  <td className="table-cell font-semibold">{fmt(s.revenue, company.currency)}</td>
                  <td className="table-cell text-emerald-600 font-semibold">{fmt(s.profit, company.currency)}</td>
                  <td className="table-cell">{s.units}</td>
                  <td className="table-cell">{fmt(s.avgBill, company.currency)}</td>
                  <td className="table-cell">
                    <span className={`font-medium ${s.margin >= 40 ? 'text-emerald-600' : s.margin >= 20 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {s.margin.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {staffData.length === 0 && <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-12">No staff sales data found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TAB: Master Excel Export ────────────────────────────────────────────────
function MasterExport({ invoices, products, customers, suppliers, purchases, expenses, company, staff }) {
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Builds the full data payload used by both Excel and PDF exports
  const buildReportData = (now) => {
    const last30 = subDays(now, 30);
    const filteredInv = invoices.filter(inv => new Date(inv.date) >= last30 && inv.status !== 'Refund');

    // Sheet 1: Sales Summary
    const salesByDay = {};
    filteredInv.forEach(inv => {
      const d = format(new Date(inv.date), 'dd-MM-yyyy');
      if (!salesByDay[d]) salesByDay[d] = { Date: d, Revenue: 0, Orders: 0, AvgOrderValue: 0 };
      salesByDay[d].Revenue += inv.total || 0;
      salesByDay[d].Orders += 1;
    });
    const salesSummary = Object.values(salesByDay).map(d => ({
      ...d,
      Revenue: d.Revenue.toFixed(2),
      AvgOrderValue: d.Orders > 0 ? (d.Revenue / d.Orders).toFixed(2) : '0.00',
    }));

    // Sheet 2: Top Products
    const prodMap = {};
    filteredInv.forEach(inv => {
      (inv.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const cost = Number(item.costPrice ?? prod?.costPrice ?? 0);
        if (!prodMap[item.name]) prodMap[item.name] = { Product: item.name, Category: prod?.category || '—', UnitsSold: 0, Revenue: 0, Profit: 0 };
        prodMap[item.name].UnitsSold += item.qty || 0;
        prodMap[item.name].Revenue += (item.price || 0) * (item.qty || 0);
        prodMap[item.name].Profit += (Number(item.price || 0) - cost) * (item.qty || 0);
      });
    });
    const topProducts = Object.values(prodMap).sort((a, b) => b.Revenue - a.Revenue).map(p => ({
      ...p, Revenue: p.Revenue.toFixed(2), Profit: p.Profit.toFixed(2),
      Margin: p.Revenue > 0 ? `${((p.Profit / p.Revenue) * 100).toFixed(1)}%` : '0%',
    }));

    // Sheet 3: GST Report
    const gstMap = {};
    filteredInv.forEach(inv => {
      const rate = inv.taxRate || 0;
      if (!gstMap[rate]) gstMap[rate] = { TaxRate: `${rate}%`, Taxable: 0, CGST: 0, SGST: 0, TotalGST: 0 };
      gstMap[rate].Taxable += (inv.subtotal || 0) - (inv.discountAmt || 0);
      gstMap[rate].CGST += (inv.taxAmt || 0) / 2;
      gstMap[rate].SGST += (inv.taxAmt || 0) / 2;
      gstMap[rate].TotalGST += inv.taxAmt || 0;
    });
    const gstReport = Object.values(gstMap).map(g => ({
      ...g, Taxable: g.Taxable.toFixed(2), CGST: g.CGST.toFixed(2), SGST: g.SGST.toFixed(2), TotalGST: g.TotalGST.toFixed(2),
    }));

    // Sheet 4: Stock Valuation
    const stockVal = products.filter(p => (p.stock || 0) > 0).map(p => ({
      Product: p.name, SKU: p.sku, Category: p.category,
      Stock: p.stock, CostPrice: p.costPrice || 0, SalePrice: p.salePrice || p.price || 0,
      CostValue: ((p.stock || 0) * (p.costPrice || 0)).toFixed(2),
      RetailValue: ((p.stock || 0) * (p.salePrice || p.price || 0)).toFixed(2),
      PotentialProfit: ((p.stock || 0) * ((p.salePrice || p.price || 0) - (p.costPrice || 0))).toFixed(2),
    }));

    // Sheet 5: Low Stock
    const lowStock = products
      .filter(p => p.stock <= (p.minStock ?? 5))
      .map(p => ({
        Product: p.name, SKU: p.sku, Category: p.category,
        CurrentStock: p.stock, MinStock: p.minStock ?? 5, Status: p.stock === 0 ? 'Out of Stock' : 'Low Stock',
      }));

    // Sheet 6: Dead Stock (no sales in 60 days)
    const dead60 = subDays(now, 60);
    const deadStock = products.filter(p => {
      if (!p.stock) return false;
      const recentSale = invoices.some(inv => new Date(inv.date) >= dead60 && (inv.items || []).some(i => i.productId === p.id));
      return !recentSale;
    }).map(p => ({
      Product: p.name, SKU: p.sku, Category: p.category,
      Stock: p.stock, CostPrice: p.costPrice || 0,
      BlockedCapital: ((p.stock || 0) * (p.costPrice || 0)).toFixed(2),
      Suggestion: 'Apply 20-30% discount',
    }));

    // Sheet 7: Customer Report
    const customerReport = customers.map(c => {
      const custInv = invoices.filter(i => i.customerId === c.id);
      const totalSpent = custInv.reduce((s, i) => s + (i.total || 0), 0);
      return {
        Customer: c.name, Phone: c.phone || '—',
        TotalOrders: custInv.length, TotalSpent: totalSpent.toFixed(2),
        AvgOrderValue: custInv.length > 0 ? (totalSpent / custInv.length).toFixed(2) : '0.00',
        Dues: (c.dues || 0).toFixed(2), Points: c.points || 0,
        LastPurchase: custInv.sort((a, b) => new Date(b.date) - new Date(a.date))[0]?.date || '—',
      };
    }).sort((a, b) => parseFloat(b.TotalSpent) - parseFloat(a.TotalSpent));

    // Sheet 8: P&L Statement
    const totalRevenue = filteredInv.reduce((s, i) => s + (i.total || 0), 0);
    const totalCOGS = filteredInv.reduce((s, inv) =>
      s + (inv.items || []).reduce((is, item) => {
        const prod = products.find(p => p.id === item.productId);
        return is + (Number(item.costPrice ?? prod?.costPrice ?? 0)) * Number(item.qty || 0);
      }, 0), 0);
    const grossProfit = totalRevenue - totalCOGS;
    const totalExp = expenses.filter(e => new Date(e.date) >= last30).reduce((s, e) => s + (e.amount || 0), 0);
    const netProfit = grossProfit - totalExp;
    const plStatement = [
      { Item: 'Gross Sales', Amount: totalRevenue.toFixed(2), Note: 'Last 30 Days' },
      { Item: 'Cost of Goods Sold', Amount: `-${totalCOGS.toFixed(2)}`, Note: '' },
      { Item: 'Gross Profit', Amount: grossProfit.toFixed(2), Note: `${totalRevenue > 0 ? ((grossProfit/totalRevenue)*100).toFixed(1) : 0}% margin` },
      { Item: 'Operating Expenses', Amount: `-${totalExp.toFixed(2)}`, Note: '' },
      { Item: 'Net Profit / Loss', Amount: netProfit.toFixed(2), Note: `${totalRevenue > 0 ? ((netProfit/totalRevenue)*100).toFixed(1) : 0}% net margin` },
    ];

    // Sheet 9: Purchase History
    const purchaseHistory = [...purchases].sort((a, b) => new Date(b.date) - new Date(a.date)).map(p => ({
      Date: p.date, Supplier: suppliers.find(s => s.id === p.supplierId)?.name || 'Walk-in',
      InvoiceRef: p.invoiceRef || '—', Items: p.items?.length || 0,
      Total: (p.total || 0).toFixed(2), Notes: p.notes || '—',
    }));

    // Sheet 10: Expense Summary
    const expMap = {};
    expenses.forEach(e => {
      const cat = e.category || 'Other';
      if (!expMap[cat]) expMap[cat] = { Category: cat, Count: 0, Total: 0 };
      expMap[cat].Count += 1;
      expMap[cat].Total += e.amount || 0;
    });
    const expenseSummary = Object.values(expMap).sort((a, b) => b.Total - a.Total).map(e => ({
      ...e, Total: e.Total.toFixed(2),
    }));

    return {
      'Sales Summary':    salesSummary.length ? salesSummary : [{ Note: 'No sales in last 30 days' }],
      'Top Products':     topProducts.length ? topProducts : [{ Note: 'No product sales data' }],
      'GST Report':       gstReport.length ? gstReport : [{ Note: 'No GST data' }],
      'Stock Valuation':  stockVal.length ? stockVal : [{ Note: 'No stock data' }],
      'Low Stock':        lowStock.length ? lowStock : [{ Note: 'All products well stocked' }],
      'Dead Stock':       deadStock.length ? deadStock : [{ Note: 'No dead stock found' }],
      'Customer Report':  customerReport.length ? customerReport : [{ Note: 'No customer data' }],
      'Profit & Loss':    plStatement,
      'Purchase History': purchaseHistory.length ? purchaseHistory : [{ Note: 'No purchase history' }],
      'Expense Summary':  expenseSummary.length ? expenseSummary : [{ Note: 'No expense data' }],
    };
  };

  const generateMasterReport = async () => {
    setExporting(true);
    try {
      const now = new Date();
      const sheetsData = buildReportData(now);
      const filename = `Business-Report-${format(now, 'dd-MM-yyyy')}.xlsx`;
      exportMultipleSheets(sheetsData, filename);
      setTimeout(() => setExporting(false), 1000);
    } catch (err) {
      console.error('Master export failed:', err);
      setExporting(false);
    }
  };

  const generateMasterPDF = async () => {
    setExportingPdf(true);
    try {
      const now = new Date();
      const sheetsData = buildReportData(now);

      // Resolve logo to base64 for PDF embedding
      let logoSrc = company.logoSrc || '';
      if (logoSrc && !/^data:image\//i.test(logoSrc)) {
        // Convert relative URL to base64 via canvas
        try {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = logoSrc;
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d').drawImage(img, 0, 0);
          logoSrc = canvas.toDataURL('image/png');
        } catch {
          logoSrc = '';
        }
      }

      const filename = `Master-Business-Report-${format(now, 'dd-MM-yyyy')}.pdf`;
      await exportMasterPDF(sheetsData, filename, { ...company, logoSrc });
    } catch (err) {
      console.error('Master PDF export failed:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  const sheets = [
    { icon: TrendingUp, label: 'Sales Summary', desc: 'Daily revenue, orders, avg value' },
    { icon: Star, label: 'Top Products', desc: 'Revenue + profit per product' },
    { icon: Receipt, label: 'GST Report', desc: 'CGST/SGST breakup for filing' },
    { icon: Package, label: 'Stock Valuation', desc: 'Cost + retail value per product' },
    { icon: AlertTriangle, label: 'Low Stock', desc: 'Items to reorder with quantities' },
    { icon: Layers, label: 'Dead Stock', desc: 'Blocked capital report' },
    { icon: Users, label: 'Customer Report', desc: 'Top customers, dues, points' },
    { icon: BarChart3, label: 'Profit & Loss', desc: 'Full P&L statement' },
    { icon: Truck, label: 'Purchase History', desc: 'All purchases by supplier' },
    { icon: DollarSign, label: 'Expense Summary', desc: 'Category-wise expenses' },
  ];

  return (
    <div className="space-y-6">
      <div className="card p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
          <FileSpreadsheet size={32} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Master Business Report</h2>
          <p className="text-gray-500 text-sm mt-1">One Excel file with 10 sheets — your accountant's best friend.</p>
          <p className="text-xs text-gray-400 mt-1">Covers last 30 days of data + full inventory snapshot</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={generateMasterReport}
            disabled={exporting}
            className="btn-primary px-6 py-3 text-base gap-3"
          >
            <FileSpreadsheet size={20} />
            {exporting ? 'Generating Excel...' : 'Download Excel Report'}
          </button>
          <button
            onClick={generateMasterPDF}
            disabled={exportingPdf}
            className="btn-secondary px-6 py-3 text-base gap-3"
          >
            <FileText size={20} />
            {exportingPdf ? 'Generating PDF...' : 'Download PDF Report'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {sheets.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="card p-4 flex gap-3 items-start">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
              <Icon size={15} className="text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'itemprofit',  label: 'Per-Item Profit',     icon: BarChart3 },
  { key: 'supplier',   label: 'Supplier-Wise Profit', icon: Truck },
  { key: 'staff',      label: 'Staff Performance',    icon: UserCog },
  { key: 'master',     label: 'Master Excel Export',  icon: FileSpreadsheet },
];

export default function ProfitReports() {
  const { invoices, products, customers, suppliers, purchases, expenses, company, staff } = useApp();
  const [tab, setTab] = useState('itemprofit');

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="text-primary-600" size={26} /> Advanced Profit Reports
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Per-item · Supplier-wise · Staff performance · Master Excel export</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Zap size={16} className="text-amber-500" />
          <span>Professional reporting suite</span>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-white dark:bg-gray-900 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'itemprofit' && <PerItemProfit invoices={invoices} products={products} company={company} />}
      {tab === 'supplier'   && <SupplierProfit invoices={invoices} products={products} suppliers={suppliers} purchases={purchases} company={company} />}
      {tab === 'staff'      && <StaffPerformance invoices={invoices} products={products} staff={staff} company={company} />}
      {tab === 'master'     && <MasterExport invoices={invoices} products={products} customers={customers} suppliers={suppliers} purchases={purchases} expenses={expenses} company={company} staff={staff} />}
    </div>
  );
}
