const jwt = require('jsonwebtoken');
const { doc, getDoc } = require('firebase/firestore');

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userRef = doc(req.db, 'users', decoded.id);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return res.status(401).json({ message: 'Invalid token.' });
    req.user = { id: userDoc.id, ...userDoc.data() };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied.' });
    next();
  };
};

module.exports = { auth, authorize };