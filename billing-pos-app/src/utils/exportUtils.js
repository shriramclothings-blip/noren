import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export data to Excel file (.xlsx)
 */
export const exportToExcel = (data, filename, sheetName = 'Sheet1') => {
  if (!data || !data.length) {
    console.warn('No data to export');
    return;
  }
  
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    const colWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(
        key.length,
        Math.max(...data.map(row => String(row[key] || '').length)) || 15
      )
    }));
    worksheet['!cols'] = colWidths;
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    
    // Write file
    XLSX.writeFile(workbook, filename);
    return { success: true };
  } catch (err) {
    console.error('Excel export failed:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Export multiple sheets to Excel
 */
export const exportMultipleSheets = (sheetsData, filename) => {
  if (!sheetsData || !Object.keys(sheetsData).length) {
    console.warn('No data to export');
    return;
  }
  
  try {
    const workbook = XLSX.utils.book_new();
    
    Object.entries(sheetsData).forEach(([sheetName, data]) => {
      if (data && data.length) {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const colWidths = Object.keys(data[0]).map(key => ({
          wch: Math.max(
            key.length,
            Math.max(...data.map(row => String(row[key] || '').length)) || 15
          )
        }));
        worksheet['!cols'] = colWidths;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      }
    });
    
    XLSX.writeFile(workbook, filename);
    return { success: true };
  } catch (err) {
    console.error('Multi-sheet export failed:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Export to CSV
 */
export const exportToCSV = (data, filename) => {
  if (!data || !data.length) {
    console.warn('No data to export');
    return;
  }
  
  try {
    const keys = Object.keys(data[0]);
    const csv = [
      keys.join(','),
      ...data.map(row => 
        keys.map(key => {
          const value = row[key] ?? '';
          const stringValue = String(value);
          // Escape quotes and wrap in quotes if contains comma
          return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    return { success: true };
  } catch (err) {
    console.error('CSV export failed:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Export to PDF (simple table format)
 */
export const exportToPDF = (data, filename, company) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header: company name centred
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(company?.name || 'Business Report', pageWidth / 2, 10, { align: 'center' });

    // Subtitle: generated date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, 16, { align: 'center' });

    // Table
    const columns = Object.keys(data[0]);
    const rows = data.map(item => columns.map(col => item[col] ?? ''));

    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 22,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [25, 85, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 245, 255] },
    });

    doc.save(filename);
    return { success: true };
  } catch (err) {
    console.error('PDF export failed:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Generate a professional multi-section Master Business Report PDF.
 * Includes company logo (centred), store name, report date, and one section per data sheet.
 *
 * @param {Object} sheetsData  - Same shape as exportMultipleSheets: { sheetName: rowsArray }
 * @param {string} filename    - Output filename (e.g. "Master-Report-2026.pdf")
 * @param {Object} company     - Company object with name, address, phone, gstin, currency, logoSrc
 */
export const exportMasterPDF = async (sheetsData, filename, company = {}) => {
  try {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const accentColor = [15, 82, 186]; // Professional blue

    // ── Helper: add page header (logo + company name + report title) ──────────
    const addPageHeader = (sectionTitle, isFirstPage = false) => {
      // Top accent bar
      doc.setFillColor(...accentColor);
      doc.rect(0, 0, pageW, 2, 'F');

      let curY = 8;

      if (isFirstPage) {
        // Try to embed logo
        if (company.logoSrc && /^data:image\//i.test(company.logoSrc)) {
          try {
            const fmt = company.logoSrc.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            doc.addImage(company.logoSrc, fmt, pageW / 2 - 12, curY, 24, 12);
          } catch { /* skip if logo fails */ }
          curY += 15;
        }

        // Store name (large, bold, centred)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(...accentColor);
        doc.text(company.name || 'Business Report', pageW / 2, curY, { align: 'center' });
        curY += 6;

        // Address / phone / GSTIN
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(90, 90, 90);
        const meta = [company.address, company.phone ? `Ph: ${company.phone}` : null, company.gstin ? `GSTIN: ${company.gstin}` : null].filter(Boolean).join('   |   ');
        if (meta) { doc.text(meta, pageW / 2, curY, { align: 'center' }); curY += 5; }

        // Generated date
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text(`Master Business Report  —  Generated: ${new Date().toLocaleString('en-IN')}`, pageW / 2, curY, { align: 'center' });
        curY += 4;

        // Divider
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.4);
        doc.line(margin, curY, pageW - margin, curY);
        curY += 5;
      }

      // Section title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...accentColor);
      doc.text(sectionTitle, margin, curY);

      // Footer line
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, curY + 2, pageW - margin, curY + 2);

      return curY + 5;
    };

    // ── Helper: draw page number footer ──────────────────────────────────────
    const addFooter = (pageNum, totalPages) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`${company.name || ''} · Confidential`, margin, pageH - 6);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageW - margin, pageH - 6, { align: 'right' });
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(margin, pageH - 9, pageW - margin, pageH - 9);
    };

    // ── Render all sections ───────────────────────────────────────────────────
    const sheetEntries = Object.entries(sheetsData).filter(([, rows]) => Array.isArray(rows) && rows.length > 0);
    let isFirst = true;

    for (const [sheetName, rows] of sheetEntries) {
      if (!isFirst) doc.addPage();

      const startY = addPageHeader(sheetName, isFirst);
      isFirst = false;

      // Build columns
      const columns = Object.keys(rows[0]);
      const tableRows = rows.map(r => columns.map(c => {
        const v = r[c];
        return v === null || v === undefined ? '—' : String(v);
      }));

      autoTable(doc, {
        head: [columns],
        body: tableRows,
        startY,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak', textColor: [30, 30, 30] },
        headStyles: { fillColor: accentColor, textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 248, 255] },
        tableLineColor: [210, 215, 230],
        tableLineWidth: 0.2,
        didDrawPage: (data) => {
          // Top accent on continuation pages
          doc.setFillColor(...accentColor);
          doc.rect(0, 0, pageW, 2, 'F');
        },
      });
    }

    // Stamp page numbers on all pages
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      addFooter(p, totalPages);
    }

    doc.save(filename);
    return { success: true };
  } catch (err) {
    console.error('Master PDF export failed:', err);
    return { success: false, error: err.message };
  }
};
export const formatRevenueReport = (dailySales, company) => {
  return dailySales.map(day => ({
    'Date': day.date,
    'Revenue': `${company.currency || '₹'}${Number(day.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    'Orders': day.orders,
    'Avg Order Value': `${company.currency || '₹'}${Number((day.revenue / (day.orders || 1)).toFixed(2))}`,
  }));
};

/**
 * Format data for products report
 */
export const formatProductsReport = (products, company) => {
  return products.map(p => ({
    'Product': p.name || 'N/A',
    'Barcode': p.barcode || 'N/A',
    'SKU': p.sku || 'N/A',
    'Quantity Sold': p.quantity || 0,
    'Revenue': `${company.currency || '₹'}${Number(p.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    'Orders': p.orders || 0,
  }));
};

/**
 * Format data for customers report
 */
export const formatCustomersReport = (customers, company) => {
  return customers.map(c => ({
    'Customer Name': c.name || 'N/A',
    'Total Spent': `${company.currency || '₹'}${Number(c.totalSpent || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    'Order Count': c.orderCount || 0,
    'Last Purchase': new Date(c.lastPurchase).toLocaleDateString('en-IN'),
    'Avg Order Value': `${company.currency || '₹'}${Number((c.totalSpent / (c.orderCount || 1)).toFixed(2))}`,
  }));
};

/**
 * Format data for invoices report
 */
export const formatInvoicesReport = (invoices, company) => {
  return invoices.map(inv => ({
    'Invoice No': inv.invoiceNumber || 'N/A',
    'Customer': inv.customerName || 'Walking Customer',
    'Date': new Date(inv.date).toLocaleDateString('en-IN'),
    'Items': inv.items?.length || 0,
    'Subtotal': `${company.currency || '₹'}${Number(inv.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    'Discount': `${company.currency || '₹'}${Number(inv.discountAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    'Tax': `${company.currency || '₹'}${Number(inv.taxAmt || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    'Total': `${company.currency || '₹'}${Number(inv.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    'Payment': inv.paymentMode || 'Cash',
    'Status': inv.status || 'Paid',
  }));
};

/**
 * Format data for inventory report
 */
export const formatInventoryReport = (products, company) => {
  return products.map(p => ({
    'Product Name': p.name || 'N/A',
    'Barcode': p.barcode || 'N/A',
    'SKU': p.sku || 'N/A',
    'Category': p.category || 'N/A',
    'Current Stock': p.stock || 0,
    'Cost Price': `${company.currency || '₹'}${Number(p.costPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    'Selling Price': `${company.currency || '₹'}${Number(p.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    'Total Value': `${company.currency || '₹'}${((p.costPrice || 0) * (p.stock || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  }));
};
