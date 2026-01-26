import { useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useDarkMode } from '../contexts/DarkModeContext';

const defaultLine = () => ({
  workDate: new Date().toISOString().split('T')[0],
  description: '',
  quantity: 1,
  rate: 0
});

function B2CInvoiceForm({ customers = [], onSubmit, onCancel, initialData }) {
  const { isDarkMode } = useDarkMode();
  const form = useForm({
    defaultValues: initialData || {
      customerId: '',
      customerPONumber: '',
      paymentTerms: 'cash',
      vatPercentage: 5,
      dueDate: '',
      items: [defaultLine()],
      miscCharges: []
    }
  });

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const { fields: miscFields, append: appendMisc, remove: removeMisc } = useFieldArray({ control, name: 'miscCharges' });

  // Compute totals from watched form values so UI updates in real time
  const watchedItems = watch('items') || [];
  const watchedMisc = watch('miscCharges') || [];
  const watchedVat = watch('vatPercentage');

  const subtotal = (watchedItems || []).reduce((sum, item) => {
    const qty = parseFloat(item?.quantity) || 0;
    const rate = parseFloat(item?.rate) || 0;
    return sum + qty * rate;
  }, 0);
  const vatPercentage = parseFloat(watchedVat) || 5;
  const vatAmount = (subtotal * vatPercentage) / 100;
  const misc = (watchedMisc || []).reduce((s, c) => s + (parseFloat(c?.amount) || 0), 0);
  const totals = {
    subtotal,
    vatPercentage,
    vatAmount,
    misc,
    total: subtotal + vatAmount + misc
  };

  const submit = (data) => {
    // Find selected customer
    const selectedCustomer = customers.find(c => c.id === data.customerId);
    const payload = {
      ...data,
      businessMode: 'b2c',
      customerName: selectedCustomer?.name || '',
      customerAddress: selectedCustomer?.address || '',
      customerTRN: selectedCustomer?.trn || '',
      customerPhone: selectedCustomer?.phone || '',
      customerEmail: selectedCustomer?.email || '',
      items: data.items.map(item => ({
        workDate: item.workDate,
        description: item.description,
        quantity: parseFloat(item.quantity) || 0,
        rate: parseFloat(item.rate) || 0
      }))
      ,
      miscCharges: (data.miscCharges || []).map(c => ({ name: c.name || '', amount: parseFloat(c.amount) || 0 }))
    };
    onSubmit(payload);
  };

  const formBg = isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900';
  const borderColor = isDarkMode ? 'border-gray-600' : 'border-gray-300';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl transition-colors duration-300 ${formBg}`}>
        <div className={`px-6 py-4 border-b ${borderColor} flex justify-between items-center`}>
          <h3 className="text-xl font-bold">Create Customer Invoice</h3>
          <button onClick={onCancel} className="p-2 rounded hover:bg-black/10">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Customer *</label>
              <select
                {...register('customerId', { required: 'Customer is required' })}
                className={`w-full px-3 py-2 border rounded-lg ${borderColor} ${formBg}`}
              >
                <option value="">Select customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
              {errors.customerId && <p className="text-red-500 text-sm mt-1">{errors.customerId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">PO Number</label>
              <input
                {...register('customerPONumber')}
                className={`w-full px-3 py-2 border rounded-lg ${borderColor} ${formBg}`}
                placeholder="PO.NO"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Due Date</label>
              <input
                type="date"
                {...register('dueDate')}
                className={`w-full px-3 py-2 border rounded-lg ${borderColor} ${formBg}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Miscellaneous Charges</label>
            <div className={`border rounded-lg overflow-hidden ${borderColor}`}>
              <table className="w-full text-sm">
                <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-right">Amount (AED)</th>
                    <th className="px-4 py-3 text-center">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {miscFields.map((field, index) => (
                    <tr key={field.id} className={isDarkMode ? 'border-b border-gray-600' : 'border-b border-gray-200'}>
                      <td className="px-4 py-3">
                        <input {...register(`miscCharges.${index}.name`)} className={`w-full px-2 py-1 border rounded ${borderColor} ${formBg}`} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input type="number" step="0.01" min="0" {...register(`miscCharges.${index}.amount`, { valueAsNumber: true })} className={`w-28 px-2 py-1 border rounded ${borderColor} ${formBg}`} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button type="button" onClick={() => removeMisc(index)} className="text-red-500">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => appendMisc({ name: '', amount: 0 })} className="mt-3 px-4 py-2 rounded bg-indigo-600 text-white">+ Add Charge</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Payment Terms</label>
              <select {...register('paymentTerms')} className={`w-full px-3 py-2 border rounded-lg ${borderColor} ${formBg}`}>
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">VAT %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                {...register('vatPercentage', { valueAsNumber: true })}
                className={`w-full px-3 py-2 border rounded-lg ${borderColor} ${formBg}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Invoice Items</label>
            <div className={`border rounded-lg overflow-hidden ${borderColor}`}>
              <table className="w-full text-sm">
                <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                  <tr>
                    <th className="px-4 py-3 text-left">Work Date</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Rate (AED)</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => {
                    const qty = parseFloat(watch(`items.${index}.quantity`)) || 0;
                    const rate = parseFloat(watch(`items.${index}.rate`)) || 0;
                    const amount = (qty * rate).toFixed(2);
                    return (
                      <tr key={field.id} className={isDarkMode ? 'border-b border-gray-600' : 'border-b border-gray-200'}>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            {...register(`items.${index}.workDate`, { required: true })}
                            className={`w-full px-2 py-1 border rounded ${borderColor} ${formBg}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <textarea
                            {...register(`items.${index}.description`, { required: true })}
                            rows={2}
                            className={`w-full px-2 py-1 border rounded ${borderColor} ${formBg}`}
                            placeholder="Describe work performed"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            {...register(`items.${index}.quantity`, { required: true, valueAsNumber: true })}
                            className={`w-20 px-2 py-1 border rounded ${borderColor} ${formBg}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            {...register(`items.${index}.rate`, { required: true, valueAsNumber: true })}
                            className={`w-24 px-2 py-1 border rounded ${borderColor} ${formBg}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{amount}</td>
                        <td className="px-4 py-3 text-center">
                          {fields.length > 1 && (
                            <button type="button" onClick={() => remove(index)} className="text-red-500">
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => append(defaultLine())} className="mt-3 px-4 py-2 rounded bg-indigo-600 text-white">
              + Add Item
            </button>
          </div>

          <div className={`p-4 rounded-lg border ${borderColor} flex justify-end`}>
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>AED {totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT ({totals.vatPercentage}%):</span>
                <span>AED {totals.vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Misc Charges:</span>
                <span>AED {Number(totals.misc || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t border-dashed">
                <span>Total:</span>
                <span>AED {totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onCancel} className="px-5 py-2 rounded border">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded bg-indigo-600 text-white disabled:opacity-50">
              {isSubmitting ? 'Saving…' : 'Save Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default B2CInvoiceForm;
