import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useDarkMode } from '../contexts/DarkModeContext';
import B2CInvoiceForm from '../components/B2CInvoiceForm';
import InvoicePrintTemplate from '../components/InvoicePrintTemplate';
const debounce = (fn, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

const fetchJson = async (url, options) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Request failed');
  }
  return res.json();
};

const formatCurrency = (value = 0) => `AED ${Number(value || 0).toFixed(2)}`;
const formatDate = (dateVal) => {
  if (!dateVal) return '—';
  const d = new Date(dateVal);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB');
};
const formatInputDate = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
};
const formatStatusLabel = (status) => {
  if (!status) return 'Pending';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};
const getStatusColor = (status, isDark) => {
  const s = (status || '').toLowerCase();
  if (s === 'paid') return isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800';
  if (s === 'overdue') return isDark ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800';
  if (s === 'cancelled') return isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-700';
  return isDark ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800';
};
const getCargoStatusColor = (status, isDark) => {
  const s = (status || '').toLowerCase();
  if (s === 'delivered') return isDark ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800';
  if (s === 'in_transit') return isDark ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800';
  if (s === 'returned') return isDark ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800';
  return isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-200 text-gray-700';
};
const getPaymentStatusColor = (status, isDark) => {
  const s = (status || '').toLowerCase();
  if (s === 'paid') return isDark ? 'bg-emerald-900 text-emerald-200' : 'bg-emerald-100 text-emerald-800';
  return isDark ? 'bg-orange-900 text-orange-200' : 'bg-orange-100 text-orange-800';
};

const emptyItem = { workDate: '', description: '', quantity: 1, rate: 0, amount: 0 };

function Invoices({ businessMode, sidebarCollapsed = false }) {
  const { isDarkMode } = useDarkMode();
  const queryClient = useQueryClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      customerName: '',
      customerTRN: '',
      customerAddress: '',
      do_no: '',
      job_no: '',
      payment_terms: '',
      date: '',
      dueDate: '',
      origin: '',
      destination: '',
      notes: '',
      items: [emptyItem]
    }
  });

  // Queries
  const { data: invoices = [], isLoading: invoicesLoading, error: invoicesError } = useQuery(
    ['invoices', businessMode],
    () => fetchJson(`/api/invoices?businessMode=${businessMode}`),
    { keepPreviousData: true }
  );

  const { data: customers = [] } = useQuery(['customers'], () => fetchJson('/api/customers'));
  const { data: products = [] } = useQuery(['products'], () => fetchJson('/api/products'));
  const { data: transporters = [] } = useQuery(['transporters'], () => fetchJson('/api/transporters'));
  const { data: vehicles = [] } = useQuery(['vehicles'], () => fetchJson('/api/vehicles'));

  const transporterVehicles = useMemo(() => {
    const selectedTransporterId = watch('transporterId');
    if (!selectedTransporterId) return [];
    const transporter = transporters.find((t) => t.id === selectedTransporterId);
    return transporter?.vehicles || [];
  }, [watch, transporters]);

  // Mutations
  const createMutation = useMutation(
    (payload) =>
      fetchJson('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }),
    {
      onSuccess: () => queryClient.invalidateQueries(['invoices', businessMode])
    }
  );

  const updateMutation = useMutation(
    ({ id, payload }) =>
      fetchJson(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(['invoices', businessMode]);
        queryClient.invalidateQueries(['invoice', variables.id]);
      }
    }
  );

  const deleteMutation = useMutation(
    (id) => fetchJson(`/api/invoices/${id}`, { method: 'DELETE' }),
    {
      onSuccess: () => queryClient.invalidateQueries(['invoices', businessMode])
    }
  );

  const statusMutation = useMutation(
    ({ id, payload }) =>
      fetchJson(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }),
    {
      onSuccess: () => queryClient.invalidateQueries(['invoices', businessMode])
    }
  );

  const fullInvoiceQuery = useQuery(
    ['invoice', selectedInvoice?.id],
    () => fetchJson(`/api/invoices/${selectedInvoice.id}`),
    { enabled: !!selectedInvoice?.id }
  );

  const debouncedStatusUpdate = useMemo(
    () =>
      debounce((id, status, field, extra) => {
        const payload = {};
        if (field === 'cargo') payload.cargoStatus = extra;
        else if (field === 'payment') payload.transporterPaymentStatus = extra;
        else payload.status = status;
        statusMutation.mutate({ id, payload });
      }, 300),
    [statusMutation]
  );

  // Helpers
  const buildB2BPayload = (formData) => {
    const items = (formData.items || [])
      .map((item) => {
        const quantity = Number(item.quantity) || 0;
        const rate = Number(item.rate) || 0;
        return {
          workDate: item.workDate || null,
          description: (item.description || '').trim(),
          quantity,
          rate: Math.round(rate * 100) / 100,
          amount: Math.round(quantity * rate * 100) / 100
        };
      })
      // Keep only rows with some meaningful value to avoid backend "items required" errors
      .filter((row) => row.description || row.quantity > 0 || row.rate > 0 || row.amount > 0);

    return {
      businessMode: 'b2b',
      customerId: formData.customerId || undefined,
      transporterId: formData.transporterId || undefined,
      customerName: formData.customerName?.trim(),
      customerTRN: formData.customerTRN?.trim(),
      customerAddress: formData.customerAddress?.trim(),
      do_no: formData.do_no?.trim(),
      job_no: formData.job_no?.trim(),
      payment_terms: formData.payment_terms?.trim(),
      date: formData.date,
      dueDate: formData.dueDate,
      origin: formData.origin?.trim(),
      destination: formData.destination?.trim(),
      notes: formData.notes?.trim(),
      items
    };
  };

  const resetB2BForm = (invoice = null) => {
    if (!invoice) {
      reset({
        customerName: '',
        customerTRN: '',
        customerAddress: '',
        do_no: '',
        job_no: '',
        payment_terms: '',
        date: '',
        dueDate: '',
        origin: '',
        destination: '',
        notes: '',
        items: [emptyItem]
      });
      return;
    }

    reset({
      customerName: invoice.customer?.name || '',
      customerTRN: invoice.customer?.trn || '',
      customerAddress: invoice.customer?.address || '',
      do_no: invoice.do_no || '',
      job_no: invoice.job_no || '',
      payment_terms: invoice.payment_terms || '',
      date: formatInputDate(invoice.date || invoice.createdAt),
      dueDate: formatInputDate(invoice.dueDate),
      origin: invoice.origin || '',
      destination: invoice.destination || '',
      notes: invoice.notes || '',
      items:
        invoice.items && invoice.items.length
          ? invoice.items.map((i) => ({
              workDate: formatInputDate(i.workDate) || '',
              description: i.description || '',
              quantity: i.quantity || 0,
              rate: i.rate || 0,
              amount: i.amount ?? Math.round((i.quantity || 0) * (i.rate || 0) * 100) / 100
            }))
          : [emptyItem]
    });
  };

  // Actions
  const handleCreate = async (formData) => {
    setFormError('');
    try {
      if (businessMode === 'b2c') {
        await createMutation.mutateAsync({ ...formData, businessMode: 'b2c' });
      } else {
        const payload = buildB2BPayload(formData);
        if (!payload.items || payload.items.length === 0) {
          throw new Error('Add at least one item (quantity/rate/description) before saving.');
        }
        if (!payload.customerName) {
          throw new Error('Customer name is required.');
        }
        await createMutation.mutateAsync(payload);
      }
      resetB2BForm();
      setEditingInvoice(null);
      setShowCreateForm(false);
    } catch (err) {
      setFormError(err?.message || 'Failed to save invoice.');
    }
  };

  const handleUpdate = async (formData) => {
    if (!editingInvoice) return;
    setFormError('');
    try {
      if (businessMode === 'b2c') {
        await updateMutation.mutateAsync({ id: editingInvoice.id, payload: { ...formData, businessMode: 'b2c' } });
      } else {
        await updateMutation.mutateAsync({ id: editingInvoice.id, payload: buildB2BPayload(formData) });
      }
      resetB2BForm();
      setEditingInvoice(null);
      setShowCreateForm(false);
    } catch (err) {
      setFormError(err?.message || 'Failed to save invoice.');
    }
  };

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    setFormError('');
    if (invoice.businessMode === 'b2b') {
      resetB2BForm(invoice);
    }
    setShowCreateForm(true);
  };

  const handleDelete = async (id) => {
    const ok = window.confirm('Delete this invoice?');
    if (!ok) return;
    await deleteMutation.mutateAsync(id);
    if (selectedInvoice?.id === id) setSelectedInvoice(null);
  };

  const invoiceDetail = fullInvoiceQuery.data || selectedInvoice;
  const invoicesEmpty = !invoicesLoading && invoices.length === 0;

  // Auto-print when enabled
  useEffect(() => {
    if (isPrinting) {
      setTimeout(() => window.print(), 100);
    }
  }, [isPrinting]);

  const textPrimary = isDarkMode ? 'text-gray-100' : 'text-gray-800';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const isSaving = isSubmitting || createMutation.isLoading || updateMutation.isLoading;

  return (
    <>
      <div
        className={`w-full max-w-full overflow-hidden transition-colors duration-300 ${
          isDarkMode
            ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-gray-100'
            : 'bg-gradient-to-br from-slate-100 via-white to-indigo-50 text-gray-900'
        }`}
      >
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-full">
          <div
            className={`rounded-2xl border ${
              isDarkMode ? 'border-slate-800/70 bg-slate-900/70' : 'border-slate-200 bg-white'
            } shadow-xl backdrop-blur-md px-4 sm:px-6 lg:px-8 py-6 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}
          >
            <div className="space-y-1">
              <p className="text-xs sm:text-sm uppercase tracking-[0.15em] text-indigo-400 font-semibold">Invoices</p>
              <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{businessMode === 'b2c' ? 'Customer Invoices' : 'Contract Invoices (B2B)'}</h1>
              <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Track, update, and print invoices in one place.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setEditingInvoice(null);
                  resetB2BForm();
                  setFormError('');
                  setShowCreateForm(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
              >
                {businessMode === 'b2c' ? 'Create Customer Invoice' : 'Create Contract Invoice'}
              </button>
            </div>
          </div>

          {/* List */}
          <div
            className={`rounded-3xl shadow-2xl border overflow-hidden w-full ${
              isDarkMode ? 'bg-slate-900/80 border-slate-800/70' : 'bg-white border-slate-200'
            }`}
          >
            {invoicesLoading && (
              <div className="p-6 text-center text-sm">Loading invoices...</div>
            )}
            {invoicesError && (
              <div className="p-6 text-center text-sm text-red-500">{invoicesError.message}</div>
            )}
            {!invoicesLoading && !invoicesError && (
              <div className="overflow-x-auto w-full">
                <table className="w-full divide-y divide-gray-800/60">
                  <thead className={isDarkMode ? 'bg-slate-900 text-gray-200' : 'bg-slate-50 text-gray-700'}>
                    <tr>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400">Invoice</th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400">Customer</th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400">Total</th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400">Status</th>
                      {businessMode === 'b2b' && (
                        <>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400">Cargo</th>
                          <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400">Transporter Payment</th>
                        </>
                      )}
                      <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={isDarkMode ? 'divide-y divide-gray-800/60' : 'divide-y divide-gray-200'}>
                    {invoices.map((invoice) => {
                      const invoiceComplete =
                        invoice.status?.toLowerCase() === 'paid' &&
                        (invoice.cargoStatus?.toLowerCase() === 'delivered' || businessMode === 'b2c') &&
                        (invoice.transporterPaymentStatus?.toLowerCase() === 'paid' || businessMode === 'b2c');
                      return (
                        <tr
                          key={invoice.id}
                          className={
                            isDarkMode
                              ? 'hover:bg-slate-800/60 transition-colors'
                              : 'hover:bg-slate-50 transition-colors'
                          }
                        >
                          <td className={`px-6 py-4 text-sm font-semibold ${textPrimary}`}>
                            <div className="flex items-center gap-2">
                              {invoiceComplete ? (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white" title="Complete">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white" title="Incomplete">
                                  !
                                </span>
                              )}
                              <div>
                                <div>{invoice.invoiceNumber || invoice.number}</div>
                                <div className={`text-xs ${textSecondary}`}>{formatDate(invoice.date || invoice.createdAt)}</div>
                              </div>
                            </div>
                          </td>
                          <td className={`px-6 py-4 text-sm ${textPrimary}`}>
                            {businessMode === 'b2c'
                              ? invoice.customer?.name
                              : invoice.customer?.name || invoice.customer?.companyName || 'N/A'}
                          </td>
                          <td className={`px-6 py-4 text-sm ${textPrimary}`}>{formatCurrency(invoice.billTotal)}</td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.status, isDarkMode)}`}>
                                {formatStatusLabel(invoice.status)}
                              </span>
                              <select
                                value={invoice.status || ''}
                                onChange={(e) => debouncedStatusUpdate(invoice.id, e.target.value)}
                                className={`px-2 py-1 text-xs rounded border ${
                                  isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                                }`}
                              >
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="overdue">Overdue</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>
                          </td>

                          {businessMode === 'b2b' && (
                            <>
                              <td className="px-6 py-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getCargoStatusColor(
                                      invoice.cargoStatus,
                                      isDarkMode
                                    )}`}
                                  >
                                    {formatStatusLabel(invoice.cargoStatus)}
                                  </span>
                                  <select
                                    value={invoice.cargoStatus || ''}
                                    onChange={(e) => debouncedStatusUpdate(invoice.id, invoice.status, 'cargo', e.target.value)}
                                    className={`px-2 py-1 text-xs rounded border ${
                                      isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                  >
                                    <option value="">Select</option>
                                    <option value="awaiting_pickup">Awaiting Pickup</option>
                                    <option value="in_transit">In Transit</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="returned">Returned</option>
                                  </select>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusColor(
                                      invoice.transporterPaymentStatus,
                                      isDarkMode
                                    )}`}
                                  >
                                    {formatStatusLabel(invoice.transporterPaymentStatus)}
                                  </span>
                                  <select
                                    value={invoice.transporterPaymentStatus || ''}
                                    onChange={(e) => debouncedStatusUpdate(invoice.id, invoice.status, 'payment', e.target.value)}
                                    className={`px-2 py-1 text-xs rounded border ${
                                      isDarkMode ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                  >
                                    <option value="unpaid">Unpaid</option>
                                    <option value="paid">Paid</option>
                                  </select>
                                </div>
                              </td>
                            </>
                          )}

                          <td className="px-6 py-4 text-sm text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setSelectedInvoice(invoice)}
                                className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-700 shadow-sm"
                              >
                                View
                              </button>
                              <button
                                onClick={() => {
                                  setIsPrinting(true);
                                  setSelectedInvoice(invoice);
                                }}
                                className="px-3 py-1.5 rounded-md bg-green-600 text-white text-xs hover:bg-green-700 shadow-sm"
                              >
                                Print
                              </button>
                              <button
                                onClick={() => handleEdit(invoice)}
                                className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs hover:bg-indigo-700 shadow-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(invoice.id)}
                                className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs hover:bg-red-700 shadow-sm"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {invoicesEmpty && (
                  <div className="p-8 text-center text-sm text-gray-500">No invoices found. Create your first invoice.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl ${
            isDarkMode ? 'bg-slate-900 text-gray-100 border border-slate-800/70' : 'bg-white text-gray-900 border border-slate-200'
          }`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">{editingInvoice ? 'Edit Invoice' : 'Create Invoice'}</h3>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingInvoice(null);
                    resetB2BForm();
                    setFormError('');
                  }}
                  className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  ×
                </button>
              </div>
            </div>

            {businessMode === 'b2c' ? (
              <B2CInvoiceForm
                customers={customers || []}
                onSubmit={editingInvoice ? handleUpdate : handleCreate}
                onCancel={() => {
                  setShowCreateForm(false);
                  setEditingInvoice(null);
                  setFormError('');
                }}
                initialData={editingInvoice}
              />
            ) : (
              <form onSubmit={handleSubmit(editingInvoice ? handleUpdate : handleCreate)} className="p-6 space-y-6">
                {/* Customer Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Customer Name</label>
                    <input
                      {...register('customerName', { required: 'Customer name is required' })}
                      type="text"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                    {errors.customerName && <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Customer TRN</label>
                    <input
                      {...register('customerTRN')}
                      type="text"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Customer Address</label>
                    <textarea
                      {...register('customerAddress')}
                      rows={3}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Invoice Meta */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">DO No.</label>
                    <input
                      {...register('do_no')}
                      type="text"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Job No.</label>
                    <input
                      {...register('job_no')}
                      type="text"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Invoice Date</label>
                    <input
                      {...register('date')}
                      type="date"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Due Date</label>
                    <input
                      {...register('dueDate')}
                      type="date"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Payment Terms</label>
                    <input
                      {...register('payment_terms')}
                      type="text"
                      placeholder="e.g. Within 30 days"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Route & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Origin</label>
                    <input
                      {...register('origin')}
                      type="text"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Destination</label>
                    <input
                      {...register('destination')}
                      type="text"
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Notes</label>
                    <textarea
                      {...register('notes')}
                      rows={3}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">Invoice Items</label>
                    <button
                      type="button"
                      onClick={() => {
                        const items = watch('items') || [];
                        setValue('items', [...items, emptyItem]);
                      }}
                      className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700"
                    >
                      Add Item
                    </button>
                  </div>
                  <div className="space-y-4">
                    {(watch('items') || []).map((item, index) => {
                      const qty = Number(item.quantity) || 0;
                      const rate = Number(item.rate) || 0;
                      const amount = Math.round(qty * rate * 100) / 100;
                      return (
                        <div key={index} className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                              <label className="block text-xs font-medium mb-1">Work Date</label>
                              <input
                                {...register(`items.${index}.workDate`)}
                                type="date"
                                className={`w-full px-2 py-1 text-sm rounded border ${
                                  isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                                }`}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium mb-1">Description</label>
                              <input
                                {...register(`items.${index}.description`)}
                                type="text"
                                className={`w-full px-2 py-1 text-sm rounded border ${
                                  isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">Quantity</label>
                              <input
                                {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                                type="number"
                                min="0"
                                step="0.01"
                                onChange={(e) => {
                                  const newQty = Number(e.target.value) || 0;
                                  const newRate = Number(watch(`items.${index}.rate`)) || 0;
                                  setValue(`items.${index}.quantity`, newQty);
                                  setValue(`items.${index}.amount`, Math.round(newQty * newRate * 100) / 100);
                                }}
                                className={`w-full px-2 py-1 text-sm rounded border ${
                                  isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">Rate</label>
                              <input
                                {...register(`items.${index}.rate`, { valueAsNumber: true })}
                                type="number"
                                min="0"
                                step="0.01"
                                onChange={(e) => {
                                  const newRate = Number(e.target.value) || 0;
                                  const newQty = Number(watch(`items.${index}.quantity`)) || 0;
                                  setValue(`items.${index}.rate`, newRate);
                                  setValue(`items.${index}.amount`, Math.round(newQty * newRate * 100) / 100);
                                }}
                                className={`w-full px-2 py-1 text-sm rounded border ${
                                  isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">Amount</label>
                              <input
                                {...register(`items.${index}.amount`, { valueAsNumber: true })}
                                value={amount}
                                readOnly
                                className={`w-full px-2 py-1 text-sm rounded border ${
                                  isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-gray-100 border-gray-200 text-gray-700'
                                }`}
                              />
                            </div>
                          </div>
                          {(watch('items') || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const items = watch('items') || [];
                                setValue(
                                  'items',
                                  items.filter((_, i) => i !== index)
                                );
                              }}
                              className="mt-3 w-full py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                            >
                              Remove Item
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Totals */}
                <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex justify-between w-full md:w-1/2">
                      <span className="text-sm font-medium">Subtotal</span>
                      <span className="text-sm font-semibold">
                        {formatCurrency((watch('items') || []).reduce((sum, itm) => sum + (Number(itm.amount) || 0), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between w-full md:w-1/2">
                      <span className="text-sm font-medium">VAT (5%)</span>
                      <span className="text-sm font-semibold">
                        {formatCurrency(((watch('items') || []).reduce((sum, itm) => sum + (Number(itm.amount) || 0), 0) * 0.05))}
                      </span>
                    </div>
                    <div className="flex justify-between w-full md:w-1/2">
                      <span className="text-base font-bold">Grand Total</span>
                      <span className="text-base font-bold">
                        {formatCurrency(((watch('items') || []).reduce((sum, itm) => sum + (Number(itm.amount) || 0), 0) * 1.05))}
                      </span>
                    </div>
                  </div>
                </div>

                {formError && <p className="text-sm text-red-500">{formError}</p>}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingInvoice(null);
                      resetB2BForm();
                      setFormError('');
                    }}
                    className={`px-4 py-2 rounded-lg ${
                      isDarkMode ? 'bg-gray-700 text-gray-100' : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {isSaving ? 'Saving...' : editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedInvoice && invoiceDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-40">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
            isDarkMode ? 'bg-gray-900 text-gray-100 border border-gray-700' : 'bg-white text-gray-900'
          }`}>
            <div className={`px-6 py-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Invoice Details</h3>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold">INVOICE</h2>
                <h3 className="text-lg font-semibold">SIDELOADER TRANSPORTS L.L.C</h3>
                <p className="font-medium">Invoice #{invoiceDetail.invoiceNumber || invoiceDetail.number}</p>
                <p className={`text-sm ${textSecondary}`}>
                  License No: 1314615 | Tax Registration: 104382934800003
                </p>
                <p className={`text-sm ${textSecondary}`}>
                  Mobile: 971-52-7766638, +971 50 282 5301
                </p>
                <p className={`text-sm ${textSecondary}`}>Email: sas@gmail.com</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold mb-2">Invoice Information</h4>
                  <p className="text-sm">Invoice #: {invoiceDetail.invoiceNumber || invoiceDetail.number}</p>
                  <p className="text-sm">Date: {formatDate(invoiceDetail.date || invoiceDetail.createdAt)}</p>
                  <p className="text-sm">Due: {formatDate(invoiceDetail.dueDate)}</p>
                  {invoiceDetail.do_no && <p className="text-sm">DO: {invoiceDetail.do_no}</p>}
                  {invoiceDetail.job_no && <p className="text-sm">Job: {invoiceDetail.job_no}</p>}
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-2">Customer</h4>
                  <p className="text-sm">Name: {invoiceDetail.customer?.name || 'N/A'}</p>
                  <p className="text-sm">TRN: {invoiceDetail.customer?.trn || 'N/A'}</p>
                  <p className="text-sm">Address: {invoiceDetail.customer?.address || 'N/A'}</p>
                </div>
              </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2">Items</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-800/60 text-sm">
                      <thead className={isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}>
                      <tr>
                          <th className="px-4 py-2 text-left text-[11px] uppercase tracking-[0.1em] text-gray-400">Date</th>
                          <th className="px-4 py-2 text-left text-[11px] uppercase tracking-[0.1em] text-gray-400">Description</th>
                          <th className="px-4 py-2 text-right text-[11px] uppercase tracking-[0.1em] text-gray-400">Qty</th>
                          <th className="px-4 py-2 text-right text-[11px] uppercase tracking-[0.1em] text-gray-400">Rate</th>
                          <th className="px-4 py-2 text-right text-[11px] uppercase tracking-[0.1em] text-gray-400">Amount</th>
                      </tr>
                    </thead>
                      <tbody className={isDarkMode ? 'divide-y divide-gray-800/60' : 'divide-y divide-gray-200'}>
                      {(invoiceDetail.items || []).map((item, idx) => (
                        <tr key={idx}>
                            <td className={`px-4 py-2 ${textPrimary}`}>{formatDate(item.workDate)}</td>
                            <td className={`px-4 py-2 ${textPrimary}`}>{item.description}</td>
                            <td className={`px-4 py-2 text-right ${textPrimary}`}>{item.quantity}</td>
                            <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatCurrency(item.rate)}</td>
                            <td className={`px-4 py-2 text-right ${textPrimary}`}>{formatCurrency(item.amount || item.billTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex flex-col items-end space-y-2 w-full md:w-1/2 ml-auto">
                  <div className="flex justify-between w-full text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(invoiceDetail.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between w-full text-sm">
                    <span>VAT (5%)</span>
                    <span>{formatCurrency(invoiceDetail.vat_5_percent || invoiceDetail.taxAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between w-full text-base font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(invoiceDetail.grand_total || invoiceDetail.billTotal || 0)}</span>
                  </div>
                </div>
              </div>

              {invoiceDetail.notes && (
                <div>
                  <h4 className="text-lg font-semibold mb-2">Notes</h4>
                  <p className="text-sm">{invoiceDetail.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Template */}
      {isPrinting && selectedInvoice && (
        <InvoicePrintTemplate
          invoice={selectedInvoice}
          customer={selectedInvoice.customer}
          onClose={() => {
            setIsPrinting(false);
            setSelectedInvoice(null);
          }}
        />
      )}
    </>
  );
}

export default Invoices;



