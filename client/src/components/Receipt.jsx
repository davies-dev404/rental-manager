import React from 'react';
import { format } from 'date-fns';

const Receipt = React.forwardRef(({ payment, currency, businessInfo }, ref) => {
    if (!payment) return null;

    const formattedDate = new Date(payment.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div ref={ref} className="bg-white p-8 max-w-2xl mx-auto shadow-none print:shadow-none print:w-full print:max-w-none text-slate-800 font-sans" id="receipt-content">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">RECEIPT</h1>
                    <p className="text-slate-500 mt-1 text-sm uppercase tracking-wider">Payment Confirmation</p>
                </div>
                <div className="text-right">
                    <h3 className="text-xl font-bold text-slate-900">{businessInfo?.name || "Rental Manager"}</h3>
                    <p className="text-sm text-slate-500 mt-1">{businessInfo?.email || "admin@rentalmanager.com"}</p>
                    {businessInfo?.phone && <p className="text-sm text-slate-500">{businessInfo.phone}</p>}
                </div>
            </div>

            {/* Receipt Details & Amount */}
            <div className="flex justify-between items-center mb-12 bg-slate-50 p-6 rounded-lg border border-slate-100 print:bg-slate-50 print:border-slate-200">
                <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">Total Paid</p>
                    <div className="text-4xl font-bold text-emerald-600 flex items-baseline">
                        <span className="text-2xl mr-1">{currency}</span>
                        {Number(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                </div>
                <div className="text-right">
                     <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-1">Receipt No</p>
                     <p className="font-mono text-lg font-semibold text-slate-700">#{payment.id?.substring(0, 8).toUpperCase()}</p>
                </div>
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-8 mb-12">
                <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Billed To</p>
                    <p className="text-lg font-semibold text-slate-900">{payment.tenantId}</p>
                    <p className="text-slate-600 mt-1">
                        Unit: {typeof payment.unitId === 'object' ? (payment.unitId.unitNumber || payment.unitId.number || 'N/A') : payment.unitId}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payment Details</p>
                    <p className="text-slate-700"><span className="font-medium text-slate-900">Date:</span> {formattedDate}</p>
                    <p className="text-slate-700 mt-1 capitalize"><span className="font-medium text-slate-900">Method:</span> {payment.method?.replace('_', ' ') || 'Cash'}</p>
                    <p className="text-slate-700 mt-1 capitalize"><span className="font-medium text-slate-900">Status:</span> 
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                            payment.status === 'partial' ? 'bg-amber-100 text-amber-700' : 
                            'bg-slate-100 text-slate-700'
                        }`}>
                            {payment.status}
                        </span>
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t-2 border-slate-100 pt-8 text-center print:mt-16">
                <p className="text-slate-900 font-medium mb-2">Thank you for your payment!</p>
                <p className="text-slate-500 text-sm">If you have any questions about this receipt, please contact our property management office.</p>
                <div className="w-full flex justify-center mt-6">
                     <p className="text-xs text-slate-300 font-mono">{payment._id || payment.id} • Authorized Electronically</p>
                </div>
            </div>
        </div>
    );
});

export default Receipt;
