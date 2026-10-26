import { api } from "./api";

/**
 * Generates and downloads a CSV report for the given entity type.
 */
export const generateCSVReport = async (type) => {
    let data = [];
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `report_${type}_${dateStr}.csv`;

    try {
        switch (type) {
            case 'properties':
                data = await api.getProperties();
                break;
            case 'tenants':
                data = await api.getTenants();
                break;
            case 'payments':
                data = await api.getPayments();
                break;
            case 'activity-logs':
                data = await api.getActivityLogs();
                break;
            default:
                throw new Error("Unknown report type");
        }

        if (!data || data.length === 0) {
            return { success: false, message: "No data available to generate report." };
        }

        // Convert JSON to CSV
        // Flatten nested objects for CSV
        const flattenObject = (obj, prefix = '') => {
            return Object.keys(obj).reduce((acc, k) => {
                const pre = prefix.length ? prefix + '_' : '';
                if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
                    Object.assign(acc, flattenObject(obj[k], pre + k));
                } else {
                    acc[pre + k] = obj[k];
                }
                return acc;
            }, {});
        };

        const flatData = data.map(item => flattenObject(item));
        if (flatData.length === 0 || Object.keys(flatData[0]).length === 0) {
             return { success: false, message: "Data is empty or invalid." };
        }

        const headers = Object.keys(flatData[0]);
        const csvContent = [
            headers.join(','),
            ...flatData.map(row => headers.map(header => {
                const val = row[header];
                return JSON.stringify(val === null || val === undefined ? '' : val);
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        return { success: true, count: data.length };
    } catch (error) {
        console.error("Failed to generate report:", error);
        return { success: false, message: error.message };
    }
};

/**
 * Exports a clean, formatted statement document to PDF (Print preview).
 * Instead of printing the raw application UI (sidebars, navbar, buttons),
 * this opens a beautifully styled, print-ready document window with
 * letterhead, metadata, summary statistics, and clean tabular records.
 */
export const exportToPDF = (reportOptions = {}) => {
    const {
        title = "Statement Report",
        subtitle = "MakaziFlow Rental Management Statement",
        dateRange = "",
        records = [],
        columns = [],
        summary = null
    } = reportOptions;

    const printWindow = window.open("", "_blank", "width=900,height=800");
    if (!printWindow) {
        window.print();
        return;
    }

    const currentDateStr = new Date().toLocaleDateString("en-KE", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    // Generate table headers
    const tableHeadersHtml = columns.length > 0
        ? columns.map(c => `<th>${c.label || c.key}</th>`).join("")
        : `<th>#</th><th>Date</th><th>Description / Tenant</th><th>Reference</th><th>Amount</th><th>Status</th>`;

    // Generate table rows
    let tableRowsHtml = "";
    if (records && records.length > 0) {
        tableRowsHtml = records.map((row, idx) => {
            if (columns.length > 0) {
                const cells = columns.map(c => {
                    const val = typeof c.render === 'function' ? c.render(row) : (row[c.key] ?? "—");
                    return `<td class="${c.align === 'right' ? 'text-right' : ''}">${val}</td>`;
                }).join("");
                return `<tr>${cells}</tr>`;
            } else {
                return `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>${row.date ? new Date(row.date).toLocaleDateString() : (row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—")}</td>
                        <td>${row.tenantName || row.tenant || row.title || row.description || "—"}</td>
                        <td>${row.reference || row.unit || row.type || "—"}</td>
                        <td class="text-right">${typeof row.amount === 'number' ? 'KES ' + row.amount.toLocaleString() : (row.amount || "—")}</td>
                        <td><span class="badge ${String(row.status || '').toLowerCase()}">${row.status || "Completed"}</span></td>
                    </tr>
                `;
            }
        }).join("");
    } else {
        tableRowsHtml = `
            <tr>
                <td colspan="${columns.length || 6}" style="text-align: center; padding: 30px; color: #64748b;">
                    No records found for the selected period / criteria.
                </td>
            </tr>
        `;
    }

    // Generate summary cards
    let summaryHtml = "";
    if (summary && Object.keys(summary).length > 0) {
        summaryHtml = `
            <div class="summary-grid">
                ${Object.entries(summary).map(([key, val]) => `
                    <div class="summary-card">
                        <div class="summary-label">${key}</div>
                        <div class="summary-value">${val}</div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    const htmlDoc = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${title} - MakaziFlow</title>
            <style>
                @page {
                    size: A4 portrait;
                    margin: 15mm 12mm 15mm 12mm;
                }
                * {
                    box-sizing: border-box;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    color: #0f172a;
                    background: #ffffff;
                    margin: 0;
                    padding: 24px;
                    font-size: 11px;
                    line-height: 1.5;
                }
                .header-wrapper {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 2px solid #00a99d;
                    padding-bottom: 16px;
                    margin-bottom: 18px;
                }
                .brand-title {
                    font-size: 20px;
                    font-weight: 800;
                    color: #0d2240;
                    margin: 0;
                    letter-spacing: -0.5px;
                }
                .brand-subtitle {
                    font-size: 11px;
                    color: #64748b;
                    margin-top: 3px;
                }
                .report-meta {
                    text-align: right;
                    font-size: 10px;
                    color: #475569;
                }
                .report-meta strong {
                    color: #0d2240;
                }
                .statement-title-bar {
                    margin-bottom: 16px;
                }
                .statement-title-bar h2 {
                    margin: 0;
                    font-size: 15px;
                    font-weight: 700;
                    color: #0d2240;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .statement-title-bar p {
                    margin: 2px 0 0 0;
                    color: #64748b;
                    font-size: 11px;
                }
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .summary-card {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 10px 12px;
                }
                .summary-label {
                    font-size: 9px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: #64748b;
                    font-weight: 600;
                }
                .summary-value {
                    font-size: 14px;
                    font-weight: 700;
                    color: #0d2240;
                    margin-top: 4px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 24px;
                    font-size: 10.5px;
                }
                th {
                    background: #f1f5f9;
                    color: #1e293b;
                    font-weight: 700;
                    text-align: left;
                    padding: 8px 10px;
                    border-top: 1px solid #cbd5e1;
                    border-bottom: 2px solid #cbd5e1;
                    text-transform: uppercase;
                    font-size: 9px;
                    letter-spacing: 0.4px;
                }
                td {
                    padding: 8px 10px;
                    border-bottom: 1px solid #e2e8f0;
                    color: #334155;
                }
                tr:nth-child(even) td {
                    background-color: #f8fafc;
                }
                .text-right {
                    text-align: right;
                }
                .badge {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 9px;
                    font-weight: 600;
                    text-transform: capitalize;
                    background: #e2e8f0;
                    color: #334155;
                }
                .badge.paid, .badge.completed, .badge.confirmed {
                    background: #dcfce7;
                    color: #15803d;
                }
                .badge.pending, .badge.partial {
                    background: #fef3c7;
                    color: #b45309;
                }
                .badge.overdue, .badge.failed {
                    background: #ffe4e6;
                    color: #b91c1c;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 12px;
                    border-top: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    font-size: 9px;
                    color: #94a3b8;
                }
                @media print {
                    body {
                        padding: 0;
                    }
                    .no-print {
                        display: none !important;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header-wrapper">
                <div>
                    <h1 class="brand-title">MakaziFlow</h1>
                    <div class="brand-subtitle">Rental & Property Management Solutions</div>
                </div>
                <div class="report-meta">
                    <div>Generated: <strong>${currentDateStr}</strong></div>
                    ${dateRange ? `<div>Period: <strong>${dateRange}</strong></div>` : ""}
                    <div>System ID: <strong>MKZ-${Math.floor(100000 + Math.random() * 900000)}</strong></div>
                </div>
            </div>

            <div class="statement-title-bar">
                <h2>${title}</h2>
                <p>${subtitle}</p>
            </div>

            ${summaryHtml}

            <table>
                <thead>
                    <tr>${tableHeadersHtml}</tr>
                </thead>
                <tbody>
                    ${tableRowsHtml}
                </tbody>
            </table>

            <div class="footer">
                <div>Official Computer Generated Document &bull; Valid Without Physical Signature</div>
                <div>Page 1 of 1</div>
            </div>

            <script>
                window.onload = function() {
                    window.focus();
                    window.print();
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlDoc);
    printWindow.document.close();
};

export const generateReport = generateCSVReport;
