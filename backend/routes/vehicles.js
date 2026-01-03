const express = require('express');
const { collection, doc, getDoc, setDoc, getDocs, query, where, orderBy, updateDoc, deleteDoc } = require('firebase/firestore');

const router = express.Router();

// Get all vehicles
router.get('/', async (req, res) => {
  try {
    const vehiclesRef = collection(req.db, 'vehicles');
    const q = query(vehiclesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const vehicles = [];
    querySnapshot.forEach((doc) => {
      vehicles.push({ id: doc.id, ...doc.data() });
    });

    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single vehicle
router.get('/:id', async (req, res) => {
  try {
    const vehicleRef = doc(req.db, 'vehicles', req.params.id);
    const vehicleDoc = await getDoc(vehicleRef);

    if (!vehicleDoc.exists()) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json({ id: vehicleDoc.id, ...vehicleDoc.data() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new vehicle
router.post('/', async (req, res) => {
  const { vehicleName, vehicleNumber, type, capacity, driverName, driverPhone, status, notes } = req.body;

  if (!vehicleNumber || !type || !capacity) {
    return res.status(400).json({ message: 'Vehicle number, type, and capacity are required' });
  }

  try {
    const vehiclesRef = collection(req.db, 'vehicles');

    // Check if vehicle number already exists
    const existingQuery = query(vehiclesRef, where('vehicleNumber', '==', vehicleNumber));
    const existingSnapshot = await getDocs(existingQuery);
    if (!existingSnapshot.empty) {
      return res.status(400).json({ message: 'Vehicle number already exists' });
    }

    const vehicleData = {
      vehicleName: vehicleName || '',
      vehicleNumber,
      type,
      capacity: parseFloat(capacity),
      driverName: driverName || '',
      driverPhone: driverPhone || '',
      status: status || 'available', // available, in-transit, maintenance, out-of-service
      currentCargo: null, // Will store cargo assignment
      notes: notes || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const vehicleRef = doc(vehiclesRef);
    await setDoc(vehicleRef, vehicleData);

    // Emit socket event
    req.io.emit('vehicle.created', { id: vehicleRef.id, ...vehicleData });

    res.status(201).json({ id: vehicleRef.id, ...vehicleData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update vehicle
router.put('/:id', async (req, res) => {
  const { vehicleName, vehicleNumber, type, capacity, driverName, driverPhone, status, notes } = req.body;

  try {
    const vehicleRef = doc(req.db, 'vehicles', req.params.id);
    const vehicleDoc = await getDoc(vehicleRef);

    if (!vehicleDoc.exists()) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const updateData = {
      updatedAt: new Date()
    };

    if (vehicleName !== undefined) updateData.vehicleName = vehicleName;
    if (vehicleNumber) updateData.vehicleNumber = vehicleNumber;
    if (type) updateData.type = type;
    if (capacity !== undefined) updateData.capacity = parseFloat(capacity);
    if (driverName !== undefined) updateData.driverName = driverName;
    if (driverPhone !== undefined) updateData.driverPhone = driverPhone;
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    await updateDoc(vehicleRef, updateData);

    // Emit socket event
    req.io.emit('vehicle.updated', { id: req.params.id, ...updateData });

    res.json({ id: req.params.id, ...vehicleDoc.data(), ...updateData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Assign cargo to vehicle
router.post('/:id/assign-cargo', async (req, res) => {
  const { cargoId } = req.body;

  if (!cargoId) {
    return res.status(400).json({ message: 'Cargo ID is required' });
  }

  try {
    const vehicleRef = doc(req.db, 'vehicles', req.params.id);
    const vehicleDoc = await getDoc(vehicleRef);

    if (!vehicleDoc.exists()) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const vehicleData = vehicleDoc.data();

    // Check if vehicle is available
    if (vehicleData.status !== 'available') {
      return res.status(400).json({ message: 'Vehicle is not available for assignment' });
    }

    // Get cargo details
    const cargoRef = doc(req.db, 'cargo', cargoId);
    const cargoDoc = await getDoc(cargoRef);

    if (!cargoDoc.exists()) {
      return res.status(404).json({ message: 'Cargo not found' });
    }

    const cargoData = cargoDoc.data();

    // Check if cargo weight exceeds vehicle capacity
    if (cargoData.weight > vehicleData.capacity) {
      return res.status(400).json({ message: 'Cargo weight exceeds vehicle capacity' });
    }

    // Update vehicle status and assignment
    const updateData = {
      status: 'in-transit',
      currentCargo: {
        id: cargoId,
        name: cargoData.name,
        weight: cargoData.weight,
        assignedAt: new Date()
      },
      updatedAt: new Date()
    };

    await updateDoc(vehicleRef, updateData);

    // Update cargo status
    await updateDoc(cargoRef, {
      status: 'in-transit',
      assignedVehicle: {
        id: req.params.id,
        vehicleNumber: vehicleData.vehicleNumber,
        driverName: vehicleData.driverName
      },
      updatedAt: new Date()
    });

    // Emit socket events
    req.io.emit('vehicle.updated', { id: req.params.id, ...updateData });
    req.io.emit('cargo.updated', {
      id: cargoId,
      status: 'in-transit',
      assignedVehicle: {
        id: req.params.id,
        vehicleNumber: vehicleData.vehicleNumber,
        driverName: vehicleData.driverName
      }
    });

    res.json({
      message: 'Cargo assigned to vehicle successfully',
      vehicle: { id: req.params.id, ...vehicleData, ...updateData },
      cargo: { id: cargoId, ...cargoData, status: 'in-transit', assignedVehicle: updateData.currentCargo }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Unassign cargo from vehicle
router.post('/:id/unassign-cargo', async (req, res) => {
  try {
    const vehicleRef = doc(req.db, 'vehicles', req.params.id);
    const vehicleDoc = await getDoc(vehicleRef);

    if (!vehicleDoc.exists()) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const vehicleData = vehicleDoc.data();

    if (!vehicleData.currentCargo) {
      return res.status(400).json({ message: 'Vehicle has no assigned cargo' });
    }

    const cargoId = vehicleData.currentCargo.id;

    // Update vehicle
    const vehicleUpdateData = {
      status: 'available',
      currentCargo: null,
      updatedAt: new Date()
    };

    await updateDoc(vehicleRef, vehicleUpdateData);

    // Update cargo
    const cargoRef = doc(req.db, 'cargo', cargoId);
    await updateDoc(cargoRef, {
      status: 'available',
      assignedVehicle: null,
      updatedAt: new Date()
    });

    // Emit socket events
    req.io.emit('vehicle.updated', { id: req.params.id, ...vehicleUpdateData });
    req.io.emit('cargo.updated', {
      id: cargoId,
      status: 'available',
      assignedVehicle: null
    });

    res.json({
      message: 'Cargo unassigned from vehicle successfully',
      vehicle: { id: req.params.id, ...vehicleData, ...vehicleUpdateData }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete vehicle
router.delete('/:id', async (req, res) => {
  try {
    const vehicleRef = doc(req.db, 'vehicles', req.params.id);
    const vehicleDoc = await getDoc(vehicleRef);

    if (!vehicleDoc.exists()) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const vehicleData = vehicleDoc.data();

    // Check if vehicle has assigned cargo
    if (vehicleData.currentCargo) {
      return res.status(400).json({ message: 'Cannot delete vehicle with assigned cargo. Unassign cargo first.' });
    }

    await deleteDoc(vehicleRef);

    // Emit socket event
    req.io.emit('vehicle.deleted', { id: req.params.id });

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get vehicle statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const vehiclesRef = collection(req.db, 'vehicles');
    const querySnapshot = await getDocs(vehiclesRef);

    let totalVehicles = 0;
    let availableVehicles = 0;
    let inTransitVehicles = 0;
    let maintenanceVehicles = 0;
    let totalCapacity = 0;

    querySnapshot.forEach((doc) => {
      const vehicle = doc.data();
      totalVehicles++;
      totalCapacity += vehicle.capacity || 0;

      switch (vehicle.status) {
        case 'available':
          availableVehicles++;
          break;
        case 'in-transit':
          inTransitVehicles++;
          break;
        case 'maintenance':
          maintenanceVehicles++;
          break;
      }
    });

    res.json({
      totalVehicles,
      availableVehicles,
      inTransitVehicles,
      maintenanceVehicles,
      totalCapacity
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;



