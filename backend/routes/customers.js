const express = require('express');
const { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy } = require('firebase/firestore');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all customers
router.get('/', auth, async (req, res) => {
  try {
    const customersRef = collection(req.db, 'customers');
    const q = query(customersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const customers = [];
    querySnapshot.forEach((doc) => {
      customers.push({ id: doc.id, ...doc.data() });
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single customer
router.get('/:id', auth, async (req, res) => {
  try {
    const customerRef = doc(req.db, 'customers', req.params.id);
    const customerDoc = await getDoc(customerRef);
    if (!customerDoc.exists()) return res.status(404).json({ message: 'Customer not found' });
    res.json({ id: customerDoc.id, ...customerDoc.data() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create customer
router.post('/', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const customersRef = collection(req.db, 'customers');
    const newCustomer = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const docRef = await addDoc(customersRef, newCustomer);
    const createdCustomer = { id: docRef.id, ...newCustomer };
    req.io.emit('customer.created', createdCustomer);
    res.status(201).json(createdCustomer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update customer
router.put('/:id', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const customerRef = doc(req.db, 'customers', req.params.id);
    
    // Check if document exists first
    const customerDoc = await getDoc(customerRef);
    if (!customerDoc.exists()) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    const updateData = { ...req.body, updatedAt: new Date() };
    await updateDoc(customerRef, updateData);
    const updatedCustomer = { id: req.params.id, ...updateData };
    req.io.emit('customer.updated', updatedCustomer);
    res.json(updatedCustomer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete customer
router.delete('/:id', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const customerRef = doc(req.db, 'customers', req.params.id);
    await deleteDoc(customerRef);
    req.io.emit('customer.deleted', { id: req.params.id });
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
