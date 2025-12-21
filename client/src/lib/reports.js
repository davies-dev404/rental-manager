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
 * Triggers a browser print for the current view or a specialized report view.
 * For now, simple window.print() is used.
 */
export const exportToPDF = () => {
    window.print();
};

export const generateReport = generateCSVReport;
