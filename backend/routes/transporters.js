const express = require('express');
const { collection, doc, getDoc, setDoc, getDocs, query, where, orderBy, updateDoc, deleteDoc } = require('firebase/firestore');

const router = express.Router();

// Get all transporters
router.get('/', async (req, res) => {
  try {
    const transportersRef = collection(req.db, 'transporters');
    const q = query(transportersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const transporters = [];
    for (const docSnap of querySnapshot.docs) {
      const transporterData = { id: docSnap.id, ...docSnap.data() };
      
      // Populate full contract details
      if (transporterData.contracts && transporterData.contracts.length > 0) {
        const contractsData = [];
        for (const contractId of transporterData.contracts) {
          const contractRef = doc(req.db, 'contracts', contractId);
          const contractDoc = await getDoc(contractRef);
          if (contractDoc.exists()) {
            contractsData.push({ id: contractDoc.id, ...contractDoc.data() });
          }
        }
        transporterData.contracts = contractsData;
      }
      
      // Note: vehicles array contains IDs, full details will be populated when fetching invoices
      
      transporters.push(transporterData);
    }

    res.json(transporters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single transporter
router.get('/:id', async (req, res) => {
  try {
    const transporterRef = doc(req.db, 'transporters', req.params.id);
    const transporterDoc = await getDoc(transporterRef);

    if (!transporterDoc.exists()) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    const transporterData = { id: transporterDoc.id, ...transporterDoc.data() };
    
    // Populate full contract details
    if (transporterData.contracts && transporterData.contracts.length > 0) {
      const contractsData = [];
      for (const contractId of transporterData.contracts) {
        const contractRef = doc(req.db, 'contracts', contractId);
        const contractDoc = await getDoc(contractRef);
        if (contractDoc.exists()) {
          contractsData.push({ id: contractDoc.id, ...contractDoc.data() });
        }
      }
      transporterData.contracts = contractsData;
    }
    
    // Note: vehicles array contains IDs, full details will be populated when fetching invoices

    res.json(transporterData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new transporter
router.post('/', async (req, res) => {
  const { companyName, contactPerson, email, phone, address, licenseNumber, vehicles, rates, status } = req.body;

  if (!companyName || !contactPerson || !email) {
    return res.status(400).json({ message: 'Company name, contact person, and email are required' });
  }

  try {
    const transportersRef = collection(req.db, 'transporters');

    // Check if email already exists
    const existingQuery = query(transportersRef, where('email', '==', email));
    const existingSnapshot = await getDocs(existingQuery);
    if (!existingSnapshot.empty) {
      return res.status(400).json({ message: 'Transporter with this email already exists' });
    }

    const transporterData = {
      companyName,
      contactPerson,
      email,
      phone: phone || '',
      address: address || '',
      licenseNumber: licenseNumber || '',
      vehicles: vehicles || [], // Array of vehicle objects
      rates: rates || { perKm: 0, perKg: 0, baseRate: 0 },
      status: status || 'active', // active, inactive, suspended
      contracts: [], // Will store contract references
      performance: {
        totalShipments: 0,
        completedShipments: 0,
        rating: 0,
        onTimeDelivery: 0
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const transporterRef = doc(transportersRef);
    await setDoc(transporterRef, transporterData);

    // Emit socket event
    req.io.emit('transporter.created', { id: transporterRef.id, ...transporterData });

    res.status(201).json({ id: transporterRef.id, ...transporterData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update transporter
router.put('/:id', async (req, res) => {
  const { companyName, contactPerson, email, phone, address, licenseNumber, vehicles, rates, status } = req.body;

  try {
    const transporterRef = doc(req.db, 'transporters', req.params.id);
    const transporterDoc = await getDoc(transporterRef);

    if (!transporterDoc.exists()) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    const updateData = {
      updatedAt: new Date()
    };

    if (companyName) updateData.companyName = companyName;
    if (contactPerson) updateData.contactPerson = contactPerson;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
    if (vehicles) updateData.vehicles = vehicles;
    if (rates) updateData.rates = rates;
    if (status) updateData.status = status;

    await updateDoc(transporterRef, updateData);

    // Emit socket event
    req.io.emit('transporter.updated', { id: req.params.id, ...updateData });

    res.json({ id: req.params.id, ...transporterDoc.data(), ...updateData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete transporter
router.delete('/:id', async (req, res) => {
  try {
    const transporterRef = doc(req.db, 'transporters', req.params.id);
    const transporterDoc = await getDoc(transporterRef);

    if (!transporterDoc.exists()) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    const transporterData = transporterDoc.data();

    // Check if transporter has active contracts
    if (transporterData.contracts && transporterData.contracts.length > 0) {
      return res.status(400).json({ message: 'Cannot delete transporter with active contracts. Cancel contracts first.' });
    }

    await deleteDoc(transporterRef);

    // Emit socket event
    req.io.emit('transporter.deleted', { id: req.params.id });

    res.json({ message: 'Transporter deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create contract with transporter
router.post('/:id/contracts', async (req, res) => {
  const { cargoId, origin, destination, distance, weight, agreedRate, startDate, endDate, terms, invoiceIds } = req.body;

  if (!cargoId || !origin || !destination || !agreedRate) {
    return res.status(400).json({ message: 'Cargo, locations, and agreed rate are required' });
  }

  try {
    const transporterRef = doc(req.db, 'transporters', req.params.id);
    const transporterDoc = await getDoc(transporterRef);

    if (!transporterDoc.exists()) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    // Get cargo/product details
    const cargoRef = doc(req.db, 'cargo', cargoId);
    let cargoDoc = await getDoc(cargoRef);
    
    // If not in cargo collection, try products collection
    if (!cargoDoc.exists()) {
      const productRef = doc(req.db, 'products', cargoId);
      cargoDoc = await getDoc(productRef);
    }

    if (!cargoDoc.exists()) {
      return res.status(404).json({ message: 'Cargo/Product not found' });
    }

    const contractData = {
      transporterId: req.params.id,
      cargoId,
      invoiceIds: invoiceIds && Array.isArray(invoiceIds) ? invoiceIds : [], // Store related invoice IDs for auto-sync
      cargo: {
        id: cargoId,
        name: cargoDoc.data().name,
        weight: cargoDoc.data().weight,
        category: cargoDoc.data().category
      },
      origin,
      destination,
      distance: distance || 0,
      weight: weight || cargoDoc.data().weight,
      agreedRate,
      totalAmount: agreedRate * (distance || 1), // Calculate based on distance or flat rate
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      status: 'active', // active, completed, cancelled
      terms: terms || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create contract
    const contractsRef = collection(req.db, 'contracts');
    const contractRef = doc(contractsRef);
    await setDoc(contractRef, contractData);

    // Update transporter with contract reference
    const transporterData = transporterDoc.data();
    const updatedContracts = [...(transporterData.contracts || []), contractRef.id];
    await updateDoc(transporterRef, {
      contracts: updatedContracts,
      updatedAt: new Date()
    });

    // Update invoices with contractId if invoiceIds provided
    if (contractData.invoiceIds && Array.isArray(contractData.invoiceIds)) {
      for (const invoiceId of contractData.invoiceIds) {
        try {
          const invoiceRef = doc(req.db, 'invoices', invoiceId);
          await updateDoc(invoiceRef, {
            contractId: contractRef.id,
            transporterId: req.params.id,
            updatedAt: new Date()
          });
          console.log(`Invoice ${invoiceId} linked to contract ${contractRef.id}`);
        } catch (err) {
          console.error(`Error updating invoice ${invoiceId}:`, err);
        }
      }
    }

    // Update cargo/product status in appropriate collection
    try {
      // Try updating in cargo collection first
      await updateDoc(cargoRef, {
        status: 'contracted',
        assignedTransporter: {
          id: req.params.id,
          companyName: transporterData.companyName,
          contractId: contractRef.id
        },
        updatedAt: new Date()
      });
    } catch (err) {
      // If cargo collection fails, try products collection
      try {
        const productRef = doc(req.db, 'products', cargoId);
        await updateDoc(productRef, {
          status: 'contracted',
          assignedTransporter: {
            id: req.params.id,
            companyName: transporterData.companyName,
            contractId: contractRef.id
          },
          updatedAt: new Date()
        });
      } catch (innerErr) {
        console.error('Error updating cargo/product status:', innerErr);
        // Don't fail the entire request if status update fails
      }
    }

    // Emit socket events
    req.io.emit('contract.created', { id: contractRef.id, ...contractData });
    req.io.emit('cargo.updated', {
      id: cargoId,
      status: 'contracted',
      assignedTransporter: {
        id: req.params.id,
        companyName: transporterData.companyName,
        contractId: contractRef.id
      }
    });

    res.status(201).json({ id: contractRef.id, ...contractData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get transporter contracts
router.get('/:id/contracts', async (req, res) => {
  try {
    const contractsRef = collection(req.db, 'contracts');
    const q = query(contractsRef, where('transporterId', '==', req.params.id), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const contracts = [];
    querySnapshot.forEach((doc) => {
      contracts.push({ id: doc.id, ...doc.data() });
    });

    res.json(contracts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update contract status
router.put('/:transporterId/contracts/:contractId', async (req, res) => {
  const { status, performance } = req.body;

  try {
    const contractRef = doc(req.db, 'contracts', req.params.contractId);
    const contractDoc = await getDoc(contractRef);

    if (!contractDoc.exists()) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    const updateData = { updatedAt: new Date() };
    if (status) updateData.status = status;

    await updateDoc(contractRef, updateData);

    // Update transporter performance if contract is completed
    if (status === 'completed' && performance) {
      const transporterRef = doc(req.db, 'transporters', req.params.transporterId);
      const transporterDoc = await getDoc(transporterRef);

      if (transporterDoc.exists()) {
        const transporterData = transporterDoc.data();
        const currentPerf = transporterData.performance || { totalShipments: 0, completedShipments: 0, rating: 0, onTimeDelivery: 0 };

        const newPerf = {
          totalShipments: currentPerf.totalShipments + 1,
          completedShipments: currentPerf.completedShipments + 1,
          rating: ((currentPerf.rating * currentPerf.completedShipments) + performance.rating) / (currentPerf.completedShipments + 1),
          onTimeDelivery: performance.onTime ? ((currentPerf.onTimeDelivery * currentPerf.completedShipments) + 1) / (currentPerf.completedShipments + 1) : currentPerf.onTimeDelivery
        };

        await updateDoc(transporterRef, {
          performance: newPerf,
          updatedAt: new Date()
        });
      }

      // Auto-sync: Update related invoices to "Delivered" when contract is completed
      const contractData = contractDoc.data();
      if (contractData.invoiceIds && Array.isArray(contractData.invoiceIds)) {
        for (const invoiceId of contractData.invoiceIds) {
          try {
            const invoiceRef = doc(req.db, 'invoices', invoiceId);
            const invoiceDoc = await getDoc(invoiceRef);
            
            if (invoiceDoc.exists()) {
              const invoiceData = invoiceDoc.data();
              // Only auto-update if not already in a final state
              if (invoiceData.cargoStatus !== 'delivered' && invoiceData.cargoStatus !== 'returned' && invoiceData.status !== 'paid') {
                await updateDoc(invoiceRef, {
                  cargoStatus: 'delivered',
                  transporterPaymentStatus: 'paid',
                  status: 'paid',
                  updatedAt: new Date()
                });
                console.log(`Invoice ${invoiceId} auto-synced to complete status`);
              }
            }
          } catch (err) {
            console.error(`Error updating invoice ${invoiceId}:`, err);
          }
        }
      }
    }

    // Emit socket event
    req.io.emit('contract.updated', { id: req.params.contractId, ...updateData });

    res.json({ id: req.params.contractId, ...contractDoc.data(), ...updateData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get transporter statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const transportersRef = collection(req.db, 'transporters');
    const querySnapshot = await getDocs(transportersRef);

    let totalTransporters = 0;
    let activeTransporters = 0;
    let totalContracts = 0;

    querySnapshot.forEach((doc) => {
      const transporter = doc.data();
      totalTransporters++;
      if (transporter.status === 'active') activeTransporters++;
      if (transporter.contracts) totalContracts += transporter.contracts.length;
    });

    res.json({
      totalTransporters,
      activeTransporters,
      totalContracts
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Assign vehicle(s) to transporter
router.post('/:id/assign-vehicles', async (req, res) => {
  const { vehicleIds } = req.body;

  if (!vehicleIds || !Array.isArray(vehicleIds) || vehicleIds.length === 0) {
    return res.status(400).json({ message: 'Vehicle IDs array is required' });
  }

  try {
    const transporterRef = doc(req.db, 'transporters', req.params.id);
    const transporterDoc = await getDoc(transporterRef);

    if (!transporterDoc.exists()) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    const transporterData = transporterDoc.data();
    const currentVehicles = transporterData.vehicles || [];
    
    // Add new vehicle IDs (avoid duplicates)
    const existingIds = currentVehicles.map(v => typeof v === 'string' ? v : v.id);
    const newVehicleIds = vehicleIds.filter(id => !existingIds.includes(id));
    const updatedVehicles = [...currentVehicles, ...newVehicleIds];

    // Update transporter with new vehicle IDs
    await updateDoc(transporterRef, {
      vehicles: updatedVehicles,
      updatedAt: new Date()
    });

    // Fetch full vehicle details for response
    const populatedVehicles = [];
    for (const vehicleId of updatedVehicles) {
      const vid = typeof vehicleId === 'string' ? vehicleId : vehicleId.id;
      try {
        const vehicleRef = doc(req.db, 'vehicles', vid);
        const vehicleDoc = await getDoc(vehicleRef);
        if (vehicleDoc.exists()) {
          populatedVehicles.push({ id: vehicleDoc.id, ...vehicleDoc.data() });
        }
      } catch (err) {
        console.error(`Error fetching vehicle ${vid}:`, err);
      }
    }

    res.json({
      message: 'Vehicles assigned to transporter successfully',
      transporter: { id: req.params.id, ...transporterData, vehicles: populatedVehicles, updatedAt: new Date() }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all vehicles available for a transporter (from vehicles collection)
router.get('/:id/available-vehicles', async (req, res) => {
  try {
    const transporterRef = doc(req.db, 'transporters', req.params.id);
    const transporterDoc = await getDoc(transporterRef);

    if (!transporterDoc.exists()) {
      return res.status(404).json({ message: 'Transporter not found' });
    }

    // Fetch all vehicles from vehicles collection
    const vehiclesRef = collection(req.db, 'vehicles');
    const vehiclesSnapshot = await getDocs(vehiclesRef);
    
    const allVehicles = [];
    vehiclesSnapshot.forEach(doc => {
      allVehicles.push({ id: doc.id, ...doc.data() });
    });

    res.json({
      allVehicles,
      assignedVehicleIds: transporterDoc.data().vehicles || []
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;