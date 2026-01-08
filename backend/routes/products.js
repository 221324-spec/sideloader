const express = require('express');
const { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, orderBy } = require('firebase/firestore');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all cargo/products
router.get('/', async (req, res) => {
  try {
    const cargoRef = collection(req.db, 'cargo');
    const q = query(cargoRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const cargo = [];
    querySnapshot.forEach((doc) => {
      cargo.push({ id: doc.id, ...doc.data() });
    });
    res.json(cargo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single cargo
router.get('/:id', auth, async (req, res) => {
  try {
    const cargoRef = doc(req.db, 'cargo', req.params.id);
    const cargoDoc = await getDoc(cargoRef);
    if (!cargoDoc.exists()) return res.status(404).json({ message: 'Cargo not found' });
    res.json({ id: cargoDoc.id, ...cargoDoc.data() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create cargo (products)
router.post('/', async (req, res) => {
  try {
    const cargoRef = collection(req.db, 'cargo');

    const parsedQuantity = Number(req.body.quantity ?? 0);
    const parsedPrice = Number(req.body.defaultPrice ?? req.body.price ?? 0);

    const newCargo = {
      ...req.body,
      quantity: Number.isFinite(parsedQuantity) ? parsedQuantity : 0,
      defaultPrice: Number.isFinite(parsedPrice) ? parsedPrice : 0,
      price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(cargoRef, newCargo);
    const createdCargo = { id: docRef.id, ...newCargo };
    req.io.emit('cargo.created', createdCargo); // Realtime emit
    res.status(201).json(createdCargo);
  } catch (err) {
    console.error('Error creating cargo:', err);
    res.status(400).json({ message: err.message });
  }
});

// Update cargo
router.put('/:id', auth, async (req, res) => {
  try {
    const cargoRef = doc(req.db, 'cargo', req.params.id);
    
    // Check if document exists first
    const cargoDoc = await getDoc(cargoRef);
    if (!cargoDoc.exists()) {
      return res.status(404).json({ message: 'Cargo not found' });
    }

    const parsedQuantity = Number(req.body.quantity ?? 0);
    const parsedPrice = Number(req.body.defaultPrice ?? req.body.price ?? 0);

    const updateData = {
      ...req.body,
      quantity: Number.isFinite(parsedQuantity) ? parsedQuantity : 0,
      defaultPrice: Number.isFinite(parsedPrice) ? parsedPrice : 0,
      price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
      updatedAt: new Date()
    };

    await updateDoc(cargoRef, updateData);
    const updatedCargo = { id: req.params.id, ...updateData };
    req.io.emit('cargo.updated', updatedCargo); // Realtime emit
    res.json(updatedCargo);
  } catch (err) {
    console.error('Error updating cargo:', err);
    res.status(400).json({ message: err.message });
  }
});

// Delete cargo
router.delete('/:id', auth, async (req, res) => {
  try {
    const cargoRef = doc(req.db, 'cargo', req.params.id);
    await deleteDoc(cargoRef);
    req.io.emit('cargo.deleted', { id: req.params.id }); // Realtime emit
    res.json({ message: 'Cargo deleted' });
  } catch (err) {
    console.error('Error deleting cargo:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;