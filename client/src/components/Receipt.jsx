import React from 'react';

const Receipt = React.forwardRef(({ payment, currency = 'KES', businessInfo }, ref) => {
  if (!payment) return null;

  const dt = new Date(payment.date || Date.now());
  const formattedDateTime = isNaN(dt.getTime())
    ? '—'
    : dt.toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' });
  const period = payment.monthCovered || (!isNaN(dt.getTime()) ? `${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}` : '—');

  const receiptRef = payment.reference || String(payment._id || payment.id || '').slice(-8).toUpperCase() || 'REF-000000';
  const invoiceRef = String(
    payment.invoiceNumber ||
    (typeof payment.invoiceId === 'object' ? payment.invoiceId?.invoiceNumber : '') ||
    ''
  ).trim();

  const tenantName = typeof payment.tenantId === 'object' ? (payment.tenantId?.name || 'Tenant') : (payment.tenantId || 'Tenant');
  const unitInfo = typeof payment.unitId === 'object'
    ? (payment.unitId?.unitNumber || payment.unitId?.number || 'N/A')
    : (payment.unitId || 'N/A');
  const businessName = businessInfo?.companyName || businessInfo?.orgName || businessInfo?.name || 'Property Management';
  const amountFormatted = Number(payment.amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const rawStatus = String(payment.status || 'PAID').toUpperCase();
  const isPaid = ['PAID', 'COMPLETED', 'CONFIRMED'].includes(rawStatus);

  const resolveUiPurpose = () => {
    const tags = [];
    const add = (t) => { if (t && !tags.includes(t)) tags.push(t); };
    if (Number(payment.rentAmount || 0) > 0) add('Rent');
    if (Number(payment.utilityAmount || 0) > 0 || (Array.isArray(payment.utilities) && payment.utilities.length > 0)) add('Utilities');
    if (Number(payment.depositAmount || 0) > 0) add('Security Deposit');
    if (Number(payment.serviceChargeAmount || 0) > 0) add('Service Charge');
    if (Number(payment.penaltyAmount || 0) > 0) add('Late Payment Penalty');
    const items = typeof payment.invoiceId === 'object' && Array.isArray(payment.invoiceId?.items) ? payment.invoiceId.items : [];
    items.forEach((it) => {
      const s = `${it.category || ''} ${it.description || ''}`.toLowerCase();
      if (/maint|repair|plumb|paint|clean/.test(s)) add('Maintenance');
      else if (/util|water|elect|power|garbage|sewer|gas/.test(s)) add('Utilities');
      else if (/rent/.test(s)) add('Rent');
      else if (/service/.test(s)) add('Service Charge');
      else if (/penalt/.test(s)) add('Late Payment Penalty');
      else if (/deposit/.test(s)) add('Security Deposit');
    });
    if (tags.length === 0) {
      const hint = `${payment.category || ''} ${payment.type || ''} ${payment.notes || ''}`.toLowerCase();
      if (/maint|repair|plumb|paint|clean/.test(hint)) add('Maintenance');
      else if (/util|water|elect|power|garbage|sewer|gas/.test(hint)) add('Utilities');
      else if (/deposit/.test(hint)) add('Security Deposit');
      else if (/service/.test(hint)) add('Service Charge');
      else if (/penalt|late/.test(hint)) add('Late Payment Penalty');
      else if (payment.type && !/^(combined|rental payment|invoice payment)$/i.test(String(payment.type).trim())) add(String(payment.type).trim());
      else add('Rent');
    }
    return tags.join(' & ');
  };
  const purposeText = resolveUiPurpose();
  const explicitPurposeDisplay = (() => {
    if (!invoiceRef) return purposeText;
    if (/^rent$/i.test(purposeText)) return 'Rent Invoice';
    if (/^maintenance$/i.test(purposeText)) return 'Invoice for Maintenance';
    if (/^utilities$/i.test(purposeText)) return 'Invoice for Utilities';
    return `Invoice for ${purposeText}`;
  })();

  return (
    <div
      ref={ref}
      id="receipt-content"
      className="bg-white max-w-3xl mx-auto shadow-none print:shadow-none print:w-full print:max-w-none text-slate-900 font-sans border border-slate-200"
    >
      {/* Top Navy -> Teal Bar */}
      <div className="h-2.5 w-full bg-linear-to-r from-[#0a1e35] via-[#0d2240] to-[#00a99d]" />

      <div className="p-8 space-y-6">
        {/* Top-right Organization Header */}
        <div className="text-right">
          <h3 className="text-base font-bold text-[#0d2240]">{businessName}</h3>
          {(businessInfo?.phone || businessInfo?.email) && (
            <p className="text-xs text-slate-500 mt-0.5">
              {[businessInfo?.phone, businessInfo?.email].filter(Boolean).join(' | ')}
            </p>
          )}
        </div>

        {/* Centered Title */}
        <div className="text-center space-y-1">
          <h1 className="text-lg font-extrabold tracking-widest text-slate-900 uppercase">
            {invoiceRef ? 'INVOICE PAYMENT RECEIPT' : 'PAYMENT RECEIPT'}
          </h1>
          <p className="text-xs font-bold tracking-wider text-[#00a99d] uppercase">
            {invoiceRef
              ? `RECEIPT FOR INVOICE #${invoiceRef} — ${explicitPurposeDisplay.toUpperCase()}`
              : `PAYMENT FOR: ${explicitPurposeDisplay.toUpperCase()}`}
          </p>
        </div>

        {/* 3-Column Metadata Grid (matching Rent Receipt PDF) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs pt-2">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-0.5 h-3.5 bg-[#00a99d] inline-block" />
              <span className="font-bold text-[#00a99d] uppercase tracking-wide">TENANT DETAILS</span>
            </div>
            <p className="font-bold text-[#0d2240]">NAME:</p>
            <p className="mb-2 uppercase">{tenantName}</p>
            <p className="font-bold text-[#0d2240]">PROPERTY / UNIT:</p>
            <p>{payment.property ? `${payment.property} — Unit ${unitInfo}` : `Unit ${unitInfo}`}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-0.5 h-3.5 bg-[#00a99d] inline-block" />
              <span className="font-bold text-[#00a99d] uppercase tracking-wide">RECEIPT DETAILS</span>
            </div>
            <p className="font-bold text-[#0d2240]">Receipt Number:</p>
            <p className="mb-2 font-mono">{receiptRef}</p>
            {invoiceRef ? (
              <>
                <p className="font-bold text-[#0d2240]">Receipt For:</p>
                <p className="mb-2 font-semibold text-[#00a99d]">Invoice #{invoiceRef}</p>
                <p className="font-bold text-[#0d2240]">Invoice For:</p>
                <p className="mb-2 font-semibold">{explicitPurposeDisplay}</p>
              </>
            ) : (
              <>
                <p className="font-bold text-[#0d2240]">Payment For:</p>
                <p className="mb-2 font-semibold">{explicitPurposeDisplay}</p>
              </>
            )}
            <p className="font-bold text-[#0d2240]">Period Covered:</p>
            <p className="mb-2">{period}</p>
            <p className="font-bold text-[#0d2240]">Date Generated:</p>
            <p>{formattedDateTime}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-0.5 h-3.5 bg-[#00a99d] inline-block" />
              <span className="font-bold text-[#00a99d] uppercase tracking-wide">PAYMENT DETAILS</span>
            </div>
            <p className="font-bold text-[#0d2240]">Organisation:</p>
            <p className="mb-2">{businessName}</p>
            <p className="font-bold text-[#0d2240]">Payment Mode:</p>
            <p className="mb-2 uppercase">{String(payment.method || 'CASH').replace(/_/g, ' ')}</p>
            {(() => {
              const isTill = businessInfo?.mpesaType === 'Till';
              const shortcode = String(businessInfo?.integrations?.mpesa?.shortcode || businessInfo?.paybillNumber || '').trim();
              const rawSettingsAcct = String(businessInfo?.paybillAccount || '').trim();
              const acctNo = /^unit\s+number\b/i.test(rawSettingsAcct) ? '' : rawSettingsAcct;
              return (
                <>
                  {shortcode && (
                    <>
                      <p className="font-bold text-[#0d2240]">{isTill ? 'Till Number:' : 'Paybill Number:'}</p>
                      <p className="mb-2 font-mono">{shortcode}</p>
                    </>
                  )}
                  {!isTill && acctNo && (
                    <>
                      <p className="font-bold text-[#0d2240]">Account Number:</p>
                      <p className="mb-2 font-mono">{acctNo}</p>
                    </>
                  )}
                </>
              );
            })()}
            <p className="font-bold text-[#0d2240]">Amount Paid:</p>
            <p className="font-bold">{currency} {amountFormatted}</p>
          </div>
        </div>

        {/* Full-Width Bold Status Banner */}
        <div
          className={`w-full py-2.5 text-center font-bold text-sm tracking-widest text-white uppercase ${isPaid ? 'bg-[#00a99d]' : rawStatus === 'PARTIAL' ? 'bg-amber-600' : 'bg-rose-600'
            }`}
        >
          {isPaid ? 'PAID' : rawStatus}
        </div>

        {/* Payment Summary Table */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-0.5 h-3.5 bg-[#00a99d] inline-block" />
            <span className="text-xs font-bold text-[#00a99d] uppercase tracking-wide">PAYMENT SUMMARY</span>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#0d2240] text-white text-[11px] uppercase">
                <th className="py-2 px-3 text-left">Billing Period</th>
                <th className="py-2 px-3 text-left">Category</th>
                <th className="py-2 px-3 text-left">Description</th>
                <th className="py-2 px-3 text-right">Total Paid</th>
                <th className="py-2 px-3 text-right">Date Generated</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-2.5 px-3">{period}</td>
                <td className="py-2.5 px-3 font-semibold text-[#00a99d]">{purposeText}</td>
                <td className="py-2.5 px-3">
                  {invoiceRef
                    ? `${explicitPurposeDisplay} — Invoice #${invoiceRef} (Unit ${unitInfo})`
                    : `${explicitPurposeDisplay} (Unit ${unitInfo})`}
                </td>
                <td className="py-2.5 px-3 text-right font-semibold">{currency} {amountFormatted}</td>
                <td className="py-2.5 px-3 text-right">{formattedDateTime}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Centered Footer */}
        <div className="pt-4 text-center text-xs text-slate-500">
          Thank you for being a valued resident | {businessName} | Ref # {receiptRef}
        </div>
      </div>
    </div>
  );
});

export default Receipt;
