const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { collection, doc, getDoc, setDoc, query, where, getDocs, deleteDoc } = require('firebase/firestore');

const router = express.Router();

// Simple auth middleware using JWT
const requireAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided.' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

// Register
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) return res.status(400).json({ message: 'Username, password, and role are required.' });
  if (!['admin', 'staff'].includes(role)) return res.status(400).json({ message: 'Invalid role.' });

  try {
    const usersRef = collection(req.db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) return res.status(400).json({ message: 'Username already exists.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRef = doc(usersRef);
    await setDoc(userRef, {
      username,
      password: hashedPassword,
      role,
      createdAt: new Date()
    });

    res.status(201).json({ message: 'User registered successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password are required.' });

  try {
    const usersRef = collection(req.db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return res.status(400).json({ message: 'Invalid credentials.' });

    const userDoc = querySnapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };

    if (user.isBlocked) {
      return res.status(403).json({ message: 'This account is blocked. Contact admin.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name || '', email: user.email || '' } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Current user profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userRef = doc(req.db, 'users', req.user.id);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return res.status(404).json({ message: 'User not found.' });
    const user = userSnap.data();
    res.json({ id: req.user.id, username: user.username, role: user.role, name: user.name || '', email: user.email || '', createdAt: user.createdAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update basic profile (name/email)
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const userRef = doc(req.db, 'users', req.user.id);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return res.status(404).json({ message: 'User not found.' });

    await setDoc(userRef, { name: name || '', email: email || '' }, { merge: true });
    res.json({ message: 'Profile updated', name: name || '', email: email || '' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update password
router.put('/me/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Current and new password are required.' });

    const userRef = doc(req.db, 'users', req.user.id);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return res.status(404).json({ message: 'User not found.' });
    const user = userSnap.data();

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await setDoc(userRef, { password: hashedPassword }, { merge: true });
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all staff (admin only) - Modified to show all non-admin users
router.get('/staff', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Access denied. Admin only.' });

    const usersRef = collection(req.db, 'users');
    // Query all users
    const querySnapshot = await getDocs(usersRef);
    
    // Filter out admin users
    const staffList = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        username: doc.data().username,
        role: doc.data().role,
        createdAt: doc.data().createdAt,
        isBlocked: doc.data().isBlocked || false
      }))
      .filter(user => user.role !== 'admin');

    res.json({ value: staffList, Count: staffList.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Block/Unblock staff (admin only)
router.put('/staff/:id/block', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Access denied. Admin only.' });

    const { isBlocked } = req.body;
    const userRef = doc(req.db, 'users', req.params.id);
    
    await setDoc(userRef, { isBlocked }, { merge: true });
    
    res.json({ message: `Staff ${isBlocked ? 'blocked' : 'unblocked'} successfully.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete staff (admin only)
router.delete('/staff/:id', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Access denied. Admin only.' });

    const userRef = doc(req.db, 'users', req.params.id);
    
    await deleteDoc(userRef);
    
    res.json({ message: 'Staff deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;