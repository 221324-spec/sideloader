import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDarkMode } from '../contexts/DarkModeContext';

function Products({ sidebarCollapsed = false }) {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const queryClient = useQueryClient();
  const { isDarkMode } = useDarkMode();

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(res => res.json()).then(data => data.value || data), // Handle both array and { value: [...] } format
  });

  const addProductMutation = useMutation({
    mutationFn: (newProduct) => fetch('/api/products', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(newProduct),
    }).then(async res => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to add product');
      }
      return data;
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setShowForm(false);
      setEditingProduct(null);
      reset();
    },
    onError: (error) => {
      console.error('Error adding product:', error);
      console.error('Error details:', error.message);
      alert(`Failed to add product: ${error.message}`);
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }) => fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(data),
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      setShowForm(false);
      setEditingProduct(null);
      reset();
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
    },
  });

  const onSubmit = (data) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      addProductMutation.mutate(data);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setValue('name', product.name);
    setValue('description', product.description);
    setValue('defaultPrice', product.defaultPrice || product.price || 0);
    setValue('weight', product.weight);
    setValue('category', product.category);
    setValue('quantity', product.quantity);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProductMutation.mutate(id);
    }
  };

  if (isLoading) return <div className={`text-center py-8 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading...</div>;
  if (error) return <div className={`text-center py-8 transition-colors duration-300 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>Error loading products</div>;

  return (
    <div className={`w-full transition-colors duration-300 ${isDarkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50'}`}>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>Product Management</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
          </svg>
          {showForm ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {showForm && (
        <div className={`p-8 rounded-xl shadow-xl mb-8 transition-all duration-300 border ${isDarkMode ? 'bg-gray-800 border-gray-700 shadow-gray-900/50' : 'bg-white border-gray-200 shadow-gray-200/50'}`}>
          <div className="mb-6">
            <h3 className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h3>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-semibold transition-colors duration-300 mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Name</label>
              <input
                {...register('name', { required: 'Name is required' })}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:bg-gray-600' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:bg-white'}`}
                placeholder="Enter product name"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className={`block text-sm font-semibold transition-colors duration-300 mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Weight</label>
              <input
                type="number"
                step="0.01"
                {...register('weight', { required: 'Weight is required', min: 0 })}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:bg-gray-600' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:bg-white'}`}
                placeholder="Enter weight in kg"
              />
              {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight.message}</p>}
            </div>
            <div>
              <label className={`block text-sm font-semibold transition-colors duration-300 mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Category</label>
              <input
                {...register('category', { required: 'Category is required' })}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:bg-gray-600' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:bg-white'}`}
                placeholder="Enter category"
              />
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>}
            </div>

            <div>
              <label className={`block text-sm font-semibold transition-colors duration-300 mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Quantity</label>
              <input
                type="number"
                step="1"
                min="0"
                {...register('quantity', { required: 'Quantity is required', min: { value: 0, message: 'Quantity must be >= 0' } })}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:bg-gray-600' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:bg-white'}`}
                placeholder="Enter quantity"
              />
              {errors.quantity && <p className="text-red-500 text-sm mt-1">{errors.quantity.message}</p>}
            </div>

            <div>
              <label className={`block text-sm font-semibold transition-colors duration-300 mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('defaultPrice', { required: 'Price is required', min: { value: 0, message: 'Price must be >= 0' } })}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:bg-gray-600' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:bg-white'}`}
                placeholder="Enter price"
              />
              {errors.defaultPrice && <p className="text-red-500 text-sm mt-1">{errors.defaultPrice.message}</p>}
            </div>

            <div className="md:col-span-2">
              <label className={`block text-sm font-semibold transition-colors duration-300 mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Description</label>
              <textarea
                {...register('description')}
                className={`w-full px-4 py-3 rounded-lg border-2 transition-all duration-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:bg-gray-600' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:bg-white'}`}
                rows="4"
                placeholder="Enter product description"
              />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-4">
              <button
                type="submit"
                disabled={addProductMutation.isLoading || updateProductMutation.isLoading}
                className={`inline-flex items-center px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {addProductMutation.isLoading || updateProductMutation.isLoading ? (editingProduct ? 'Updating...' : 'Adding...') : (editingProduct ? 'Update Product' : 'Add Product')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className={`rounded-xl shadow-xl transition-all duration-300 border ${isDarkMode ? 'bg-gray-800 border-gray-700 shadow-gray-900/50' : 'bg-white border-gray-200 shadow-gray-200/50'}`}>
        {products && products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y transition-colors duration-300 ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              <thead className={`transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Name</th>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Weight</th>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Category</th>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Quantity</th>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Price</th>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Status</th>
                  <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'}`}>
                {products.map((product) => (
                  <tr key={product.id} className={`transition-all duration-300 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{product.name}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{product.weight} kg</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{product.category}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{product.quantity}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold transition-colors duration-300 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>₹{product.defaultPrice || product.price || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-300 ${product.status === 'contracted' ? (isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800') : (isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800')}`}>
                        {product.status === 'contracted' ? 'Assigned' : 'Available'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => setSelectedProduct(product)}
                          className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        <button 
                          onClick={() => handleEdit(product)}
                          className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <svg className={`w-12 h-12 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className={`text-xl font-semibold transition-colors duration-300 mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>No products found</h3>
            <p className={`text-base transition-colors duration-300 mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Get started by creating your first product.</p>
            <button
              onClick={() => setShowForm(true)}
              className={`inline-flex items-center px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Product
            </button>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-2xl rounded-xl shadow-2xl transition-all duration-300 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className={`px-8 py-6 border-b transition-colors duration-300 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Product Details</h3>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className={`p-2 rounded-lg transition-all duration-300 hover:scale-110 ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-8 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-semibold transition-colors duration-300 mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Name</label>
                  <p className={`text-lg font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{selectedProduct.name}</p>
                </div>
                <div>
                  <label className={`block text-sm font-semibold transition-colors duration-300 mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Weight</label>
                  <p className={`text-lg font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{selectedProduct.weight} kg</p>
                </div>
                <div>
                  <label className={`block text-sm font-semibold transition-colors duration-300 mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Category</label>
                  <p className={`text-lg font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{selectedProduct.category}</p>
                </div>
                <div>
                  <label className={`block text-sm font-semibold transition-colors duration-300 mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Quantity</label>
                  <p className={`text-lg font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{selectedProduct.quantity}</p>
                </div>
                {selectedProduct.description && (
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-semibold transition-colors duration-300 mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                    <p className={`text-lg font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{selectedProduct.description}</p>
                  </div>
                )}
              </div>
            </div>
            <div className={`px-8 py-6 border-t transition-colors duration-300 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setSelectedProduct(null);
                    handleEdit(selectedProduct);
                  }}
                  className={`inline-flex items-center px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${isDarkMode ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Product
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  </div>
  );
}

export default Products;