const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  unit: { type: String, required: true, default: 'pcs' },
  defaultPrice: { type: Number, required: true, min: 0 },
  taxClass: { type: String, enum: ['standard', 'reduced', 'zero', 'exempt'], default: 'standard' },
  isService: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Product', productSchema);