const express = require('express');
const { collection, doc, getDoc, setDoc, getDocs, query, where, orderBy, limit, updateDoc, deleteDoc, runTransaction, writeBatch } = require('firebase/firestore');

const router = express.Router();

// Helper function to calculate invoice totals from items
// Supports legacy B2B (billAmount/billTotal), new B2B (amount), and B2C (quantity*unitPrice)
const calculateInvoiceTotals = (items, taxRate = 0) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { subtotal: 0, taxAmount: 0, billTotal: 0, vat5: 0, grandTotal: 0 };
  }

  // New B2B schema: items contain explicit amount (qty * rate) and we always apply 5% VAT
  if (items[0] && items[0].amount !== undefined) {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const vat5 = Math.round(subtotal * 0.05 * 100) / 100;
    const grandTotal = Math.round((subtotal + vat5) * 100) / 100;
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: vat5,
      billTotal: grandTotal,
      vat5,
      grandTotal
    };
  }

  // If items have individual billTotal (previous B2B structure), sum those
  if (items[0] && items[0].billTotal !== undefined) {
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.billAmount) || 0), 0);
    const taxAmount = items.reduce((sum, item) => sum + (parseFloat(item.taxAmount) || 0), 0);
    const billTotal = items.reduce((sum, item) => sum + (parseFloat(item.billTotal) || 0), 0);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      billTotal: Math.round(billTotal * 100) / 100,
      vat5: Math.round(taxAmount * 100) / 100,
      grandTotal: Math.round(billTotal * 100) / 100
    };
  }

  // Legacy support: Calculate subtotal from items using quantity * unitPrice or billAmount
  const subtotal = items.reduce((sum, item) => {
    if (item.billAmount !== undefined) {
      return sum + (parseFloat(item.billAmount) || 0);
    }
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    return sum + (quantity * unitPrice);
  }, 0);

  const taxPercentage = parseFloat(taxRate) || 0;
  const taxAmount = (subtotal * taxPercentage) / 100;
  const billTotal = subtotal + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    billTotal: Math.round(billTotal * 100) / 100,
    vat5: Math.round(taxAmount * 100) / 100,
    grandTotal: Math.round(billTotal * 100) / 100
  };
};

// Generate unique invoice number
const generateInvoiceNumber = async (db) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  // Use a counter document to atomically generate a sequential number
  const counterRef = doc(db, 'counters', 'invoices');
  try {
    const seq = await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      if (!snap.exists()) {
        tx.set(counterRef, { seq: 1 });
        return 1;
      }
      const current = snap.data().seq || 0;
      const next = Number(current) + 1;
      tx.update(counterRef, { seq: next });
      return next;
    });

    const seqStr = String(seq).padStart(4, '0');
    return `INV-${year}${month}-${seqStr}`;
  } catch (err) {
    // Fallback to previous approach if transaction fails: find latest invoice
    console.error('generateInvoiceNumber transaction failed, falling back', err);
    const invoicesRef = collection(db, 'invoices');
    const q = query(invoicesRef, orderBy('createdAt', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    let nextSeq = 1;
    if (!snapshot.empty) {
      const lastInvoice = snapshot.docs[0].data();
      if (lastInvoice && lastInvoice.invoiceNumber) {
        const parts = lastInvoice.invoiceNumber.split('-');
        const parsed = parseInt(parts[2], 10);
        if (!isNaN(parsed)) nextSeq = parsed + 1;
      }
    }
    const seqStr = nextSeq.toString().padStart(4, '0');
    return `INV-${year}${month}-${seqStr}`;
  }
};

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const { businessMode } = req.query;
    const invoicesRef = collection(req.db, 'invoices');

    // Order newest first. We still filter in memory to avoid composite index requirements.
    const q = query(invoicesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    // Build invoices in parallel to avoid slow sequential Firestore calls
    const invoices = await Promise.all(
      querySnapshot.docs.map(async (docSnapshot) => {
        const invoiceData = { id: docSnapshot.id, ...docSnapshot.data() };

        // Recalculate totals if missing or zero (for legacy invoices)
        if (!invoiceData.billTotal || invoiceData.billTotal === 0 || invoiceData.vat_5_percent === undefined || invoiceData.grand_total === undefined) {
          if (invoiceData.items && Array.isArray(invoiceData.items)) {
            const { subtotal, taxAmount, billTotal, vat5, grandTotal } = calculateInvoiceTotals(invoiceData.items, invoiceData.taxRate || 0);
            invoiceData.subtotal = subtotal;
            invoiceData.taxAmount = taxAmount;
            invoiceData.billTotal = billTotal;
            invoiceData.vat_5_percent = vat5;
            invoiceData.grand_total = grandTotal;
            if (!invoiceData.totalInWords || !invoiceData.amount_in_words) {
              const words = require('../utils/numberToWords').numberToWords(grandTotal);
              invoiceData.totalInWords = invoiceData.totalInWords || words;
              invoiceData.amount_in_words = invoiceData.amount_in_words || words;
            }
          }
        }

        const fetchVehicle = async (vehicleId) => {
          try {
            const vehicleRef = doc(req.db, 'vehicles', vehicleId);
            const vehicleDoc = await getDoc(vehicleRef);
            return vehicleDoc.exists() ? { id: vehicleDoc.id, ...vehicleDoc.data() } : null;
          } catch (vehicleErr) {
            console.error('Error fetching vehicle:', vehicleErr);
            return null;
          }
        };

        // Parallel fetches for top-level vehicle, transporter, customer, and item vehicles
        const topLevelVehiclePromise = invoiceData.vehicleId
          ? fetchVehicle(invoiceData.vehicleId)
          : Promise.resolve(invoiceData.vehicleInfo || null);

        const transporterPromise = (async () => {
          if (!invoiceData.transporterId) return null;
          try {
            const transporterRef = doc(req.db, 'transporters', invoiceData.transporterId);
            const transporterDoc = await getDoc(transporterRef);
            if (!transporterDoc.exists()) return null;
            const transporterData = { id: transporterDoc.id, ...transporterDoc.data() };

            if (transporterData.vehicles && transporterData.vehicles.length > 0) {
              const vehiclePromises = transporterData.vehicles.map(async (vehicle) => {
                if (typeof vehicle === 'string') {
                  return fetchVehicle(vehicle);
                }
                return vehicle; // already an object
              });
              transporterData.vehicles = (await Promise.all(vehiclePromises)).filter(Boolean);
            }
            return transporterData;
          } catch (err) {
            console.error('Error fetching transporter:', err);
            return null;
          }
        })();

        const customerPromise = (async () => {
          if (!invoiceData.customerId) return null;
          try {
            const customerRef = doc(req.db, 'customers', invoiceData.customerId);
            const customerDoc = await getDoc(customerRef);
            return customerDoc.exists() ? { id: customerDoc.id, ...customerDoc.data() } : null;
          } catch (err) {
            console.error('Error fetching customer:', err);
            return null;
          }
        })();

        const itemsWithVehiclesPromise = (async () => {
          if (!invoiceData.items || !Array.isArray(invoiceData.items)) return [];
          return Promise.all(
            invoiceData.items.map(async (item) => {
              if (item.vehicleId) {
                const vehicle = await fetchVehicle(item.vehicleId);
                return { ...item, vehicle };
              }
              return item;
            })
          );
        })();

        const [topLevelVehicle, transporterData, customerData, itemsWithVehicles] = await Promise.all([
          topLevelVehiclePromise,
          transporterPromise,
          customerPromise,
          itemsWithVehiclesPromise,
        ]);

        if (topLevelVehicle) invoiceData.vehicle = topLevelVehicle;
        if (transporterData) invoiceData.transporter = transporterData;
        if (customerData) invoiceData.customer = customerData;
        if (itemsWithVehicles.length) invoiceData.items = itemsWithVehicles;

        // Filter by businessMode in memory if specified
        if (!businessMode || !invoiceData.businessMode || invoiceData.businessMode === businessMode) {
          return invoiceData;
        }
        return null;
      })
    );

    res.json(invoices.filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single invoice
router.get('/:id', async (req, res) => {
  try {
    const invoiceRef = doc(req.db, 'invoices', req.params.id);
    const invoiceDoc = await getDoc(invoiceRef);

    if (!invoiceDoc.exists()) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const invoiceData = { id: invoiceDoc.id, ...invoiceDoc.data() };
    
    // Recalculate totals if missing or zero (for legacy invoices)
    if (!invoiceData.billTotal || invoiceData.billTotal === 0 || invoiceData.vat_5_percent === undefined || invoiceData.grand_total === undefined) {
      if (invoiceData.items && Array.isArray(invoiceData.items)) {
        const { subtotal, taxAmount, billTotal, vat5, grandTotal } = calculateInvoiceTotals(invoiceData.items, invoiceData.taxRate || 0);
        invoiceData.subtotal = subtotal;
        invoiceData.taxAmount = taxAmount;
        invoiceData.billTotal = billTotal;
        invoiceData.vat_5_percent = vat5;
        invoiceData.grand_total = grandTotal;
        if (!invoiceData.totalInWords || !invoiceData.amount_in_words) {
          const words = require('../utils/numberToWords').numberToWords(grandTotal);
          invoiceData.totalInWords = invoiceData.totalInWords || words;
          invoiceData.amount_in_words = invoiceData.amount_in_words || words;
        }
      }
    }
    
    // Populate vehicle data if vehicleId exists (B2C) or vehicleInfo exists (B2B)
    if (invoiceData.vehicleId) {
      try {
        const vehicleRef = doc(req.db, 'vehicles', invoiceData.vehicleId);
        const vehicleDoc = await getDoc(vehicleRef);
        if (vehicleDoc.exists()) {
          invoiceData.vehicle = { id: vehicleDoc.id, ...vehicleDoc.data() };
        }
      } catch (vehicleErr) {
        console.error('Error fetching vehicle:', vehicleErr);
      }
    } else if (invoiceData.vehicleInfo) {
      // For B2B invoices, vehicle info is stored directly
      invoiceData.vehicle = invoiceData.vehicleInfo;
    }

    // Populate vehicle data for each item
    if (invoiceData.items && Array.isArray(invoiceData.items)) {
      for (const item of invoiceData.items) {
        if (item.vehicleId) {
          try {
            const itemVehicleRef = doc(req.db, 'vehicles', item.vehicleId);
            const itemVehicleDoc = await getDoc(itemVehicleRef);
            if (itemVehicleDoc.exists()) {
              item.vehicle = { id: itemVehicleDoc.id, ...itemVehicleDoc.data() };
            }
          } catch (itemVehicleErr) {
            console.error('Error fetching item vehicle:', itemVehicleErr);
          }
        }
      }
    }

    // Populate transporter data for B2B invoices
    if (invoiceData.transporterId) {
      try {
        const transporterRef = doc(req.db, 'transporters', invoiceData.transporterId);
        const transporterDoc = await getDoc(transporterRef);
        if (transporterDoc.exists()) {
          invoiceData.transporter = { id: transporterDoc.id, ...transporterDoc.data() };
          
          // Populate full vehicle details if vehicles array contains IDs
          if (invoiceData.transporter.vehicles && invoiceData.transporter.vehicles.length > 0) {
            // Use Promise.all for parallel fetches
            const vehiclePromises = invoiceData.transporter.vehicles.map(async (vehicle) => {
              if (typeof vehicle === 'string') {
                try {
                  const vehicleRef = doc(req.db, 'vehicles', vehicle);
                  const vehicleDoc = await getDoc(vehicleRef);
                  return vehicleDoc.exists() ? { id: vehicleDoc.id, ...vehicleDoc.data() } : null;
                } catch (err) {
                  console.error(`Error fetching vehicle ${vehicle}:`, err);
                  return null;
                }
              }
              return vehicle; // Already an object
            });
            invoiceData.transporter.vehicles = (await Promise.all(vehiclePromises)).filter(v => v);
          }
        }
      } catch (transporterErr) {
        console.error('Error fetching transporter:', transporterErr);
      }
    }

    // Populate customer data for B2C invoices and ensure TRN, date, dueDate are present
    if (invoiceData.customerId) {
      try {
        const customerRef = doc(req.db, 'customers', invoiceData.customerId);
        const customerDoc = await getDoc(customerRef);
        if (customerDoc.exists()) {
          const customerData = customerDoc.data();
          invoiceData.customer = { id: customerDoc.id, ...customerData };
          // Ensure TRN, date, dueDate are present in top-level invoiceData for frontend
          invoiceData.customerTRN = customerData.trn || '';
          invoiceData.customerName = customerData.name || '';
          invoiceData.customerAddress = customerData.address || '';
        }
      } catch (customerErr) {
        console.error('Error fetching customer:', customerErr);
      }
    }
    // For B2B, ensure customerTRN, customerName, customerAddress are present
    if (invoiceData.businessMode === 'b2b') {
      invoiceData.customerTRN = invoiceData.customerTRN || invoiceData.customer?.trn || '';
      invoiceData.customerName = invoiceData.customerName || invoiceData.customer?.name || '';
      invoiceData.customerAddress = invoiceData.customerAddress || invoiceData.customer?.address || '';
    }

    res.json(invoiceData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new invoice
router.post('/', async (req, res) => {
  const {
    // Shared
    customerId,
    transporterId,
    items,
    notes,
    dueDate,
    businessMode,
    origin,
    destination,
    vehicleId,
    taxRate = 0,
    customerPONumber,
    paymentTerms,
    vatPercentage,
    // New B2B schema fields
    customerName,
    customerTRN,
    customerAddress,
    do_no,
    job_no,
    payment_terms,
    date
  } = req.body;

  // Validation: always need items; customer requirements depend on mode
  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'Items are required' });
  }

  if (businessMode === 'b2c') {
    if (!customerId) {
      return res.status(400).json({ message: 'Customer is required for B2C invoices' });
    }
  } else if (businessMode === 'b2b') {
    // Allow inline customer info for B2B; no transporter/customerId required
    if (!customerName && !customerTRN && !customerAddress) {
      return res.status(400).json({ message: 'Customer details are required for B2B invoices' });
    }
  }

  // Validate items based on business mode
  if (businessMode === 'b2c') {
    const invalidItems = items.filter(item => !item.workDate || !item.description || item.quantity === undefined || item.rate === undefined);
    if (invalidItems.length > 0) {
      return res.status(400).json({ message: 'All B2C items must have workDate, description, quantity, and rate' });
    }
  } else {
    // New B2B validation: quantity and rate required
    const invalidItems = items.filter(item => item.quantity === undefined || item.rate === undefined);
    if (invalidItems.length > 0) {
      return res.status(400).json({ message: 'All B2B items must have quantity and rate' });
    }
  }

  try {
    let entityRef, entityDoc, entity;

    // Get customer details based on business mode
    if (businessMode === 'b2c' && customerId) {
      entityRef = doc(req.db, 'customers', customerId);
      entityDoc = await getDoc(entityRef);
      if (!entityDoc.exists()) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      entity = entityDoc.data();
      entity = {
        id: customerId,
        name: entity.name,
        email: entity.email,
        phone: entity.phone,
        address: entity.address
      };
    } else if (businessMode === 'b2b') {
      // New B2B schema uses inline customer info only
      entity = {
        name: customerName || '',
        trn: (typeof customerTRN !== 'undefined' ? customerTRN : ''),
        address: customerAddress || ''
      };
    } else {
      return res.status(400).json({ message: 'Invalid business mode or entity ID' });
    }

    // Get vehicle details if vehicleId is provided
    let vehicle = null;
    if (vehicleId) {
      try {
        const vehicleRef = doc(req.db, 'vehicles', vehicleId);
        const vehicleDoc = await getDoc(vehicleRef);
        if (vehicleDoc.exists()) {
          const vehicleData = vehicleDoc.data();
          vehicle = {
            id: vehicleId,
            vehicleName: vehicleData.vehicleName || '',
            vehicleNumber: vehicleData.vehicleNumber,
            type: vehicleData.type,
            capacity: vehicleData.capacity
          };
        }
      } catch (vehicleErr) {
        console.error('Error fetching vehicle:', vehicleErr);
      }
    }

    // Process items based on business mode
    let invoiceItems;
    if (businessMode === 'b2c') {
      invoiceItems = items.map(item => {
        const quantity = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const billAmount = quantity * rate;
        const vatPercentageNum = parseFloat(vatPercentage) || 5;
        const vatAmount = (billAmount * vatPercentageNum) / 100;
        const billTotal = billAmount + vatAmount;

        return {
          workDate: item.workDate,
          description: item.description,
          quantity,
          rate: Math.round(rate * 100) / 100,
          billAmount: Math.round(billAmount * 100) / 100,
          vatAmount: Math.round(vatAmount * 100) / 100,
          billTotal: Math.round(billTotal * 100) / 100
        };
      });
    } else {
      // New B2B schema
      invoiceItems = items.map(item => {
        const quantity = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const amount = quantity * rate;

        return {
          workDate: item.workDate || null,
          description: item.description || '',
          quantity,
          rate: Math.round(rate * 100) / 100,
          amount: Math.round(amount * 100) / 100
        };
      });
    }

    // Calculate totals
    let subtotal, taxAmount, billTotal, vat5, grandTotal;
    if (businessMode === 'b2c') {
      subtotal = invoiceItems.reduce((sum, item) => sum + item.billAmount, 0);
      taxAmount = invoiceItems.reduce((sum, item) => sum + item.vatAmount, 0);
      billTotal = invoiceItems.reduce((sum, item) => sum + item.billTotal, 0);
      vat5 = taxAmount;
      grandTotal = billTotal;
    } else {
      const totals = calculateInvoiceTotals(invoiceItems, taxRate);
      subtotal = totals.subtotal;
      taxAmount = totals.taxAmount;
      billTotal = totals.billTotal;
      vat5 = totals.vat5;
      grandTotal = totals.grandTotal;
    }

    const invoiceDate = date ? new Date(date) : new Date();

    // Build base invoice data (number/sequence will be set inside transaction)
    const invoiceData = {
      invoiceType: businessMode === 'b2b' ? 'B2B' : 'B2C',
      businessMode: businessMode || 'b2c',
      ...(businessMode === 'b2c' ? {
        customerId,
        customer: entity,
        customerPONumber: customerPONumber || '',
        paymentTerms: paymentTerms || 'cash',
        vatPercentage: parseFloat(vatPercentage) || 5,
        customerTRN: entity.trn || '',
        customerName: entity.name || '',
        customerAddress: entity.address || ''
      } : {
        customer: { ...entity, trn: entity.trn },
        do_no: do_no || '',
        job_no: job_no || '',
        payment_terms: payment_terms || '',
        date: invoiceDate,
        customerTRN: entity.trn,
        customerName: entity.name || '',
        customerAddress: entity.address || ''
      }),
      items: invoiceItems,
      subtotal: Math.round(subtotal * 100) / 100,
      vat_5_percent: Math.round(vat5 * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      grand_total: Math.round(grandTotal * 100) / 100,
      billTotal: Math.round(grandTotal * 100) / 100,
      totalInWords: require('../utils/numberToWords').numberToWords(grandTotal),
      amount_in_words: require('../utils/numberToWords').numberToWords(grandTotal),
      origin: origin || '',
      destination: destination || '',
      ...(vehicleId && vehicle ? { vehicleId, vehicle } : {}),
      status: 'pending',
      notes: notes || '',
      dueDate: dueDate ? new Date(dueDate) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create invoice atomically with counter increment to avoid gaps
    try {
      let createdId = null;
      let createdInvoiceData = null;
      await runTransaction(req.db, async (tx) => {
        // Use separate counters per businessMode to keep sequences independent
        const modeKey = (businessMode || 'b2c').toLowerCase();
        const counterId = `invoices_${modeKey}`;
        const counterRef = doc(req.db, 'counters', counterId);
        const counterSnap = await tx.get(counterRef);
        let nextSeq = 1;
        if (!counterSnap.exists()) {
          tx.set(counterRef, { seq: 1 });
          nextSeq = 1;
        } else {
          const current = counterSnap.data().seq || 0;
          nextSeq = Number(current) + 1;
          tx.update(counterRef, { seq: nextSeq });
        }

        const seqStr = String(nextSeq).padStart(4, '0');
        const year = invoiceDate.getFullYear();
        const month = String(invoiceDate.getMonth() + 1).padStart(2, '0');
        const invoiceNumber = `INV-${year}${month}-${seqStr}`;

        // attach numbering to invoice data
        const toSave = { ...invoiceData, invoiceNumber, number: invoiceNumber, sequence: nextSeq };

        const invoiceRef = doc(collection(req.db, 'invoices'));
        tx.set(invoiceRef, toSave);
        createdId = invoiceRef.id;
        createdInvoiceData = toSave;
      });

      // Emit socket event
      req.io.emit('invoice.created', { id: createdId, ...createdInvoiceData });

      res.status(201).json({ id: createdId, ...createdInvoiceData });
    } catch (err) {
      console.error('Invoice creation transaction failed:', err);
      return res.status(500).json({ message: err.message });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Resequence existing invoices to ensure sequential numbering
// Call with: POST /api/invoices/resequence?confirm=true
router.post('/resequence', async (req, res) => {
  if (req.query.confirm !== 'true') {
    return res.status(400).json({ message: 'Confirmation required. Call with ?confirm=true' });
  }

    try {
      const invoicesRef = collection(req.db, 'invoices');
      const q = query(invoicesRef, orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return res.json({ message: 'No invoices to resequence.' });

      // Group documents by businessMode so we can resequence each mode independently
      const groups = {};
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const mode = (data.businessMode || 'b2c').toLowerCase();
        if (!groups[mode]) groups[mode] = [];
        groups[mode].push({ id: docSnap.id, data });
      }

      let totalUpdated = 0;
      const maxSeqPerMode = {};
      // Process each group separately
      for (const modeKey of Object.keys(groups)) {
        const docs = groups[modeKey];
        // docs are already in createdAt ascending order due to the outer query
        let seq = 0;
        const updates = [];
        for (const item of docs) {
          seq += 1;
          const data = item.data;
          const createdAtRaw = data.createdAt;
          let createdAtDate = new Date();
          if (createdAtRaw && typeof createdAtRaw.toDate === 'function') {
            createdAtDate = createdAtRaw.toDate();
          } else if (createdAtRaw) {
            createdAtDate = new Date(createdAtRaw);
          }
          const year = createdAtDate.getFullYear();
          const month = String(createdAtDate.getMonth() + 1).padStart(2, '0');
          const seqStr = String(seq).padStart(4, '0');
          const newNumber = `INV-${year}${month}-${seqStr}`;
          updates.push({ id: item.id, invoiceNumber: newNumber, number: newNumber, sequence: seq });
        }

        // Apply updates sequentially for this group
        for (const u of updates) {
          const invoiceRef = doc(req.db, 'invoices', u.id);
          await updateDoc(invoiceRef, { invoiceNumber: u.invoiceNumber, number: u.number, sequence: u.sequence, updatedAt: new Date() });
          totalUpdated += 1;
          maxSeqPerMode[modeKey] = u.sequence; // last assigned seq will be max for this mode
        }
      }

      // Update counters per mode so new invoices continue from highest sequence
      for (const [modeKey, maxSeq] of Object.entries(maxSeqPerMode)) {
        const counterId = `invoices_${modeKey}`;
        const counterRef = doc(req.db, 'counters', counterId);
        await setDoc(counterRef, { seq: Number(maxSeq) }, { merge: true });
      }

      return res.json({ message: `Resequenced ${totalUpdated} invoices across ${Object.keys(groups).length} modes and updated counters.` });
    } catch (err) {
      console.error('Resequence error:', err);
      return res.status(500).json({ message: err.message });
    }
});

// Update invoice
router.put('/:id', async (req, res) => {
  const {
    items,
    notes,
    dueDate,
    status,
    origin,
    destination,
    vehicleId,
    cargoStatus,
    transporterPaymentStatus,
    customerPONumber,
    paymentTerms,
    vatPercentage
  } = req.body;

  try {
    const invoiceRef = doc(req.db, 'invoices', req.params.id);
    const invoiceDoc = await getDoc(invoiceRef);

    if (!invoiceDoc.exists()) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const currentInvoice = invoiceDoc.data();
    let updateData = { updatedAt: new Date() };

    // Get vehicle details if vehicleId is provided
    if (vehicleId) {
      try {
        const vehicleRef = doc(req.db, 'vehicles', vehicleId);
        const vehicleDoc = await getDoc(vehicleRef);
        if (vehicleDoc.exists()) {
          const vehicleData = vehicleDoc.data();
          updateData.vehicleId = vehicleId;
          updateData.vehicle = {
            id: vehicleId,
            vehicleName: vehicleData.vehicleName || '',
            vehicleNumber: vehicleData.vehicleNumber,
            type: vehicleData.type,
            capacity: vehicleData.capacity
          };
        }
      } catch (vehicleErr) {
        console.error('Error fetching vehicle:', vehicleErr);
      }
    }

    if (items) {
      // Process items based on business mode
      let invoiceItems;
      if (currentInvoice.businessMode === 'b2c') {
        // B2C items: workDate, description, quantity, rate
        invoiceItems = items.map(item => {
          const quantity = parseFloat(item.quantity) || 0;
          const rate = parseFloat(item.rate) || 0;
          const billAmount = quantity * rate;
          const vatPercentageNum = parseFloat(vatPercentage) || currentInvoice.vatPercentage || 5;
          const vatAmount = (billAmount * vatPercentageNum) / 100;
          const billTotal = billAmount + vatAmount;

          return {
            workDate: item.workDate,
            description: item.description,
            quantity,
            rate: Math.round(rate * 100) / 100,
            billAmount: Math.round(billAmount * 100) / 100,
            vatAmount: Math.round(vatAmount * 100) / 100,
            billTotal: Math.round(billTotal * 100) / 100
          };
        });
      } else {
        // New B2B items
        invoiceItems = items.map(item => {
          const quantity = parseFloat(item.quantity) || 0;
          const rate = parseFloat(item.rate) || 0;
          const amount = quantity * rate;
          return {
            workDate: item.workDate || null,
            description: item.description || '',
            quantity,
            rate: Math.round(rate * 100) / 100,
            amount: Math.round(amount * 100) / 100
          };
        });
      }

      // Calculate totals
      let subtotal, taxAmount, billTotal, vat5, grandTotal;
      if (currentInvoice.businessMode === 'b2c') {
        subtotal = invoiceItems.reduce((sum, item) => sum + item.billAmount, 0);
        taxAmount = invoiceItems.reduce((sum, item) => sum + item.vatAmount, 0);
        billTotal = invoiceItems.reduce((sum, item) => sum + item.billTotal, 0);
        vat5 = taxAmount;
        grandTotal = billTotal;
      } else {
        const currentTaxRate = req.body.taxRate !== undefined ? req.body.taxRate : (currentInvoice.taxRate || 0);
        const totals = calculateInvoiceTotals(invoiceItems, currentTaxRate);
        subtotal = totals.subtotal;
        taxAmount = totals.taxAmount;
        billTotal = totals.billTotal;
        vat5 = totals.vat5;
        grandTotal = totals.grandTotal;
      }

      updateData = {
        ...updateData,
        items: invoiceItems,
        subtotal: Math.round(subtotal * 100) / 100,
        vat_5_percent: Math.round(vat5 * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        grand_total: Math.round(grandTotal * 100) / 100,
        billTotal: Math.round(grandTotal * 100) / 100,
        totalInWords: require('../utils/numberToWords').numberToWords(grandTotal),
        amount_in_words: require('../utils/numberToWords').numberToWords(grandTotal)
      };
    }

    if (origin !== undefined) updateData.origin = origin;
    if (destination !== undefined) updateData.destination = destination;

    // Update new B2B header fields when provided
    if (currentInvoice.businessMode === 'b2b') {
      if (req.body.customerName !== undefined || req.body.customerTRN !== undefined || req.body.customerAddress !== undefined) {
        updateData.customer = {
          ...(currentInvoice.customer || {}),
          name: req.body.customerName !== undefined ? req.body.customerName : (currentInvoice.customer?.name || ''),
          trn: req.body.customerTRN !== undefined ? req.body.customerTRN : (currentInvoice.customer?.trn || ''),
          address: req.body.customerAddress !== undefined ? req.body.customerAddress : (currentInvoice.customer?.address || '')
        };
      }
      if (req.body.do_no !== undefined) updateData.do_no = req.body.do_no;
      if (req.body.job_no !== undefined) updateData.job_no = req.body.job_no;
      if (req.body.payment_terms !== undefined) updateData.payment_terms = req.body.payment_terms;
      if (req.body.date !== undefined) updateData.date = req.body.date ? new Date(req.body.date) : null;
    }

    if (notes !== undefined) updateData.notes = notes;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) updateData.status = status;
    if (cargoStatus !== undefined) updateData.cargoStatus = cargoStatus;
    if (transporterPaymentStatus !== undefined) updateData.transporterPaymentStatus = transporterPaymentStatus;

    await updateDoc(invoiceRef, updateData);

    // Auto-sync: If all invoice statuses are complete, mark contract as complete
    if (cargoStatus === 'delivered' || transporterPaymentStatus === 'paid' || status === 'paid') {
      const mergedInvoice = { ...currentInvoice, ...updateData };
      
      if (mergedInvoice.contractId && mergedInvoice.transporterId) {
        // Check if invoice is fully complete
        const isFullyComplete = 
          mergedInvoice.status?.toLowerCase() === 'paid' && 
          mergedInvoice.transporterPaymentStatus?.toLowerCase() === 'paid' &&
          mergedInvoice.cargoStatus?.toLowerCase() === 'delivered';

        if (isFullyComplete) {
          try {
            const contractRef = doc(req.db, 'contracts', mergedInvoice.contractId);
            const contractDoc = await getDoc(contractRef);
            
            if (contractDoc.exists()) {
              const contractData = contractDoc.data();
              
              // Only auto-complete if contract is still active
              if (contractData.status === 'active') {
                await updateDoc(contractRef, {
                  status: 'completed',
                  updatedAt: new Date()
                });
                console.log(`Contract ${mergedInvoice.contractId} auto-completed from invoice update`);
                
                // Emit socket event for contract completion
                req.io.emit('contract.updated', { 
                  id: mergedInvoice.contractId, 
                  status: 'completed',
                  updatedAt: new Date()
                });
              }
            }
          } catch (err) {
            console.error('Error auto-completing contract from invoice:', err);
          }
        }
      }
    }

    // Emit socket event
    req.io.emit('invoice.updated', { id: req.params.id, ...updateData });

    res.json({ id: req.params.id, ...currentInvoice, ...updateData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const invoiceRef = doc(req.db, 'invoices', req.params.id);
    const invoiceSnap = await getDoc(invoiceRef);

    if (!invoiceSnap.exists()) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const invoiceData = invoiceSnap.data();
    const storedMode = invoiceData.businessMode || 'b2c';
    const modeKey = String(storedMode).toLowerCase();

    // Determine deleted sequence number (fallback to parsing invoiceNumber)
    let deletedSeq = invoiceData.sequence;
    if (!deletedSeq && invoiceData.invoiceNumber) {
      const parts = invoiceData.invoiceNumber.split('-');
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) deletedSeq = parsed;
    }

    // If we can't determine a sequence, just delete the doc and return
    if (!deletedSeq) {
      await deleteDoc(invoiceRef);
      req.io.emit('invoice.deleted', { id: req.params.id });
      return res.json({ message: 'Invoice deleted (no sequence present)' });
    }

    // Fetch all invoices in same stored mode (case-sensitive match on stored value) to include legacy casing
    const invoicesRef = collection(req.db, 'invoices');
    const q = query(invoicesRef, where('businessMode', '==', storedMode));
    const snapshot = await getDocs(q);

    // Build list of docs excluding the deleted one and sort by createdAt asc so sequences start from 1
    const docsList = snapshot.docs
      .map(d => ({ id: d.id, data: d.data() }))
      .filter(d => d.id !== req.params.id)
      .sort((a, b) => {
        const aDate = a.data.createdAt && typeof a.data.createdAt.toDate === 'function' ? a.data.createdAt.toDate() : new Date(a.data.createdAt || 0);
        const bDate = b.data.createdAt && typeof b.data.createdAt.toDate === 'function' ? b.data.createdAt.toDate() : new Date(b.data.createdAt || 0);
        return aDate - bDate;
      });

    // Prepare a batch: delete target then resequence all remaining invoices so there are no gaps
    const batch = writeBatch(req.db);
    batch.delete(invoiceRef);

    let seq = 0;
    for (const item of docsList) {
      seq += 1;
      const d = item.data;

      let createdAtDate = new Date();
      if (d.createdAt && typeof d.createdAt.toDate === 'function') {
        createdAtDate = d.createdAt.toDate();
      } else if (d.createdAt) {
        createdAtDate = new Date(d.createdAt);
      }
      const year = createdAtDate.getFullYear();
      const month = String(createdAtDate.getMonth() + 1).padStart(2, '0');
      const seqStr = String(seq).padStart(4, '0');
      const newNumber = `INV-${year}${month}-${seqStr}`;

      const docRef = doc(req.db, 'invoices', item.id);
      // Normalize businessMode to lowercase to avoid future mismatches and resequence
      batch.update(docRef, { sequence: seq, invoiceNumber: newNumber, number: newNumber, businessMode: modeKey, updatedAt: new Date() });
    }

    // Commit batch
    await batch.commit();

    // Update counter for this mode to reflect new highest sequence
    const counterId = `invoices_${modeKey}`;
    const counterRef = doc(req.db, 'counters', counterId);
    const maxSeqAfter = seq;
    await setDoc(counterRef, { seq: Number(maxSeqAfter) }, { merge: true });

    // Emit socket event
    req.io.emit('invoice.deleted', { id: req.params.id, resequenced: true, mode: modeKey, newMaxSeq: maxSeqAfter });

    res.json({ message: 'Invoice deleted and fully resequenced', resequencedCount: seq, newMaxSeq: maxSeqAfter });
  } catch (err) {
    console.error('Error deleting invoice and compacting sequences:', err);
    res.status(500).json({ message: err.message });
  }
});

// Debug: report missing sequences per business mode (do not enable in production)
router.get('/debug/missing-sequences', async (req, res) => {
  try {
    const invoicesRef = collection(req.db, 'invoices');
    const snapshot = await getDocs(invoicesRef);
    const modes = {};

    snapshot.docs.forEach(d => {
      const data = d.data();
      const m = data.businessMode || 'b2c';
      if (!modes[m]) modes[m] = [];
      modes[m].push({ id: d.id, seq: data.sequence || 0, invoiceNumber: data.invoiceNumber || '', createdAt: data.createdAt || null });
    });

    const report = {};
    for (const [m, arr] of Object.entries(modes)) {
      arr.sort((a, b) => {
        const aDate = a.createdAt && typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const bDate = b.createdAt && typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return aDate - bDate;
      });
      const seqs = arr.map(x => x.seq || 0).filter(s => s > 0);
      const max = seqs.length ? Math.max(...seqs) : 0;
      const missing = [];
      for (let i = 1; i <= max; i++) if (!seqs.includes(i)) missing.push(i);
      report[m] = {
        count: arr.length,
        maxSeq: max,
        missing,
        sample: arr.slice(0, 10)
      };
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Get invoice statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { businessMode } = req.query;
    const invoicesRef = collection(req.db, 'invoices');

    const querySnapshot = await getDocs(invoicesRef);

    let totalInvoices = 0;
    let totalRevenue = 0;
    let pendingInvoices = 0;
    let paidInvoices = 0;
    let paidAmount = 0;
    let pendingAmount = 0;

    querySnapshot.forEach((doc) => {
      const invoice = doc.data();
      // Filter by businessMode if specified
      if (!businessMode || !invoice.businessMode || invoice.businessMode === businessMode) {
        totalInvoices++;
        
        // Use real calculated invoice billTotal, recalculate if missing
        let invoiceRevenue = invoice.billTotal || 0;
        if (!invoiceRevenue && invoice.items && Array.isArray(invoice.items)) {
          const { billTotal } = calculateInvoiceTotals(invoice.items, invoice.taxRate || 0);
          invoiceRevenue = billTotal;
        }
        totalRevenue += invoiceRevenue;

        if (invoice.status === 'pending') {
          pendingInvoices++;
          pendingAmount += invoiceRevenue;
        } else if (invoice.status === 'paid') {
          paidInvoices++;
          paidAmount += invoiceRevenue;
        }
      }
    });

    res.json({
      totalInvoices,
      totalRevenue,
      pendingAmount,
      paidAmount,
      pendingInvoices,
      paidInvoices
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;