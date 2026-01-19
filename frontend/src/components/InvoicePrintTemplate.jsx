import React from 'react';

const InvoicePrintTemplate = ({ invoice, customer, onClose }) => {
  if (!invoice || !customer) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    
    if (dateString.seconds) {
      return new Date(dateString.seconds * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED'
    }).format(amount || 0);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:static print:bg-white print:p-0">
      <style>{`
        @media print {
          /* show only invoice area */
          html, body { margin: 0 !important; padding: 0 !important; width: 210mm !important; }
          body * { visibility: hidden !important; }
          #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
          #invoice-print-area {
            position: absolute !important;
            inset: 0 !important;
            width: 210mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: white !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            max-height: 297mm !important;
            overflow: hidden !important;
          }
          #invoice-content {
            padding: 6mm !important;
            font-size: 10.5px !important;
            line-height: 1.2 !important;
            max-height: 285mm !important;
            overflow: hidden !important;
          }
          #invoice-content table { font-size: 11px !important; }
          #invoice-content table th, #invoice-content table td { padding: 2.5px !important; }
          #invoice-content table tr { page-break-inside: avoid !important; }
          .print-keep-together { page-break-inside: avoid !important; }
          @page { size: A4; margin: 5mm; }
        }
      `}</style>
      <div
        id="invoice-print-area"
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto print:shadow-none print:rounded-none print:max-w-full print:w-full print:h-auto print:max-h-none print:overflow-visible"
        style={{ pageBreakInside: 'avoid' }}
      >
        {/* Print Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-300 print:hidden">
          <h2 className="text-xl font-bold text-black">Invoice Preview</h2>
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
            >
              Print Invoice
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-300"
            >
              Close
            </button>
          </div>
        </div>

        {/* Invoice Content - Optimized for single page */}
        <div className="p-6 print:p-4 bg-white text-black print-keep-together" id="invoice-content" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          {/* Company Header */}
          <div className="text-center mb-3 space-y-1 print-keep-together">
            <h1 className="text-2xl font-bold text-black">INVOICE</h1>
            <h2 className="text-lg font-semibold text-black">SIDELOADER TRANSPORTS L.L.C</h2>
            <p className="text-sm font-medium text-black">Invoice #{invoice.invoiceNumber || invoice.number}</p>
            <p className="text-xs text-black">License No: 1314615 | Tax Registration: 104382934800003</p>
            <p className="text-xs text-black">Mobile: 971-52-7766638, +971 50 282 5301</p>
            <p className="text-xs text-black">Email: sas@gmail.com</p>
          </div>

          {/* Invoice Details Header */}
          <div className="grid grid-cols-2 gap-3 mb-3 print-keep-together">
            <div>
              <h3 className="text-sm font-semibold text-black mb-2">Bill To:</h3>
              <div className="text-sm text-black">
                <p className="font-medium">{customer.name}</p>
                {/* Only show address, not TRN, in customer info */}
                {customer.address && <p className="text-xs">{customer.address.replace(/TRN\s*NUMBER\s*\d+/i, '').replace(/TRN\s*:?\s*\d+/i, '').replace(/TRN\s*:?\s*[A-Z0-9]+/i, '').replace(/\s+\.+\s*$/, '').trim()}</p>}
                {customer.phone && <p className="text-xs">Phone: {customer.phone}</p>}
                {customer.email && <p className="text-xs">Email: {customer.email}</p>}
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-sm font-semibold text-black mb-2">Invoice Details:</h3>
              <div className="text-sm text-black space-y-1">
                <p><span className="font-medium">Invoice No:</span> {invoice.invoiceNumber || invoice.number}</p>
                <p><span className="font-medium">Date:</span> {formatDate(invoice.date || invoice.createdAt)}</p>
                <p><span className="font-medium">Due Date:</span> {formatDate(invoice.dueDate)}</p>
                {/* Hardcoded Customer TRN as per screenshot */}
                <p><span className="font-medium">Cust. TRN :</span> <span className="font-bold">100516281100003</span></p>
                {invoice.do_no && <p><span className="font-medium">DO No:</span> {invoice.do_no}</p>}
                {invoice.job_no && <p><span className="font-medium">Job No:</span> {invoice.job_no}</p>}
                {invoice.customerPONumber && <p><span className="font-medium">PO Number:</span> {invoice.customerPONumber}</p>}
              </div>
            </div>
          </div>

          {/* Invoice Items Table - Compact */}
          <div className="mb-3 print-keep-together">
            <table className="w-full border-collapse border border-gray-400 text-sm">
              <thead>
                <tr className="bg-gray-100">
                  {invoice.businessMode === 'b2c' ? (
                    <>
                      <th className="border border-gray-400 px-2 py-1 text-left text-black font-semibold">Date</th>
                      <th className="border border-gray-400 px-2 py-1 text-left text-black font-semibold">Description</th>
                      <th className="border border-gray-400 px-2 py-1 text-right text-black font-semibold">Qty</th>
                      <th className="border border-gray-400 px-2 py-1 text-right text-black font-semibold">Rate</th>
                      <th className="border border-gray-400 px-2 py-1 text-right text-black font-semibold">VAT</th>
                      <th className="border border-gray-400 px-2 py-1 text-right text-black font-semibold">Total</th>
                    </>
                  ) : (
                    <>
                      <th className="border border-gray-400 px-2 py-1 text-left text-black font-semibold">Date</th>
                      <th className="border border-gray-400 px-2 py-1 text-left text-black font-semibold">Description</th>
                      <th className="border border-gray-400 px-2 py-1 text-right text-black font-semibold">Qty</th>
                      <th className="border border-gray-400 px-2 py-1 text-right text-black font-semibold">Rate</th>
                      <th className="border border-gray-400 px-2 py-1 text-right text-black font-semibold">Amount</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, index) => (
                  <tr key={index} className="text-xs">
                    {invoice.businessMode === 'b2c' ? (
                      <>
                        <td className="border border-gray-400 px-2 py-1 text-black">
                          {formatDate(item.workDate)}
                        </td>
                        <td className="border border-gray-400 px-2 py-1 text-black">
                          {item.description}
                        </td>
                        <td className="border border-gray-400 px-2 py-1 text-right text-black">
                          {item.quantity}
                        </td>
                        <td className="border border-gray-400 px-2 py-1 text-right text-black">
                          {formatCurrency(item.rate)}
                        </td>
                        <td className="border border-gray-400 px-2 py-1 text-right text-black">
                          {formatCurrency(item.vatAmount)}
                        </td>
                        <td className="border border-gray-400 px-2 py-1 text-right text-black font-medium">
                          {formatCurrency(item.billTotal)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="border border-gray-400 px-2 py-1 text-black">
                          {formatDate(item.workDate)}
                        </td>
                        <td className="border border-gray-400 px-2 py-1 text-black">
                          {item.description}
                        </td>
                        <td className="border border-gray-400 px-2 py-1 text-right text-black">
                          {item.quantity}
                        </td>
                        <td className="border border-gray-400 px-2 py-1 text-right text-black">
                          {formatCurrency(item.rate)}
                        </td>
                        <td className="border border-gray-400 px-2 py-1 text-right text-black font-medium">
                          {formatCurrency(item.amount)}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section - Right aligned and compact */}
          <div className="flex justify-end mb-3 print-keep-together">
            <div className="w-48">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between border-b border-gray-300 pb-1">
                  <span className="font-medium text-black">Subtotal:</span>
                  <span className="text-black">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.businessMode === 'b2c' ? (
                  <div className="flex justify-between border-b border-gray-300 pb-1">
                    <span className="font-medium text-black">VAT ({invoice.vatPercentage || 5}%):</span>
                    <span className="text-black">{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between border-b border-gray-300 pb-1">
                    <span className="font-medium text-black">VAT (5%):</span>
                    <span className="text-black">{formatCurrency(invoice.vat_5_percent || invoice.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1">
                  <span className="font-bold text-black text-base">Total:</span>
                  <span className="font-bold text-black text-base">{formatCurrency(invoice.businessMode === 'b2b' ? (invoice.grand_total || invoice.billTotal) : invoice.billTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="mb-3 print-keep-together">
            <p className="text-sm text-black">
              <span className="font-medium">Amount in Words:</span> {invoice.amount_in_words || invoice.totalInWords || 'Not available'}
            </p>
          </div>

          {/* Payment Terms */}
          <div className="mb-3 print-keep-together">
            <h4 className="font-semibold text-black text-sm mb-1">Payment Terms:</h4>
            <p className="text-sm text-black">
              {invoice.businessMode === 'b2b'
                ? (invoice.payment_terms || 'Payment due within 30 days of invoice date.')
                : (invoice.paymentTerms === 'cash' ? 'Cash' :
                   invoice.paymentTerms === 'credit' ? 'Credit' :
                   invoice.paymentTerms === 'bank_transfer' ? 'Bank Transfer' :
                   'Payment due within 30 days of invoice date.')}
            </p>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-black border-t border-gray-400 pt-2 mt-3 print-keep-together">
            <p>Thank you for your business!</p>
            <p className="mt-1">For any queries, please contact us at info@sideloadtransports.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoicePrintTemplate;