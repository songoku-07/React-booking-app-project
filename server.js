const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'your_jwt_secret';

mongoose.connect('mongodb://localhost:27017/bookingapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

const bookingSchema = new mongoose.Schema({
  name: String,
  date: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});
const Booking = mongoose.model('Booking', bookingSchema);

// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ username, password: hashed });
    res.json({ message: 'User registered', user });
  } catch (err) {
    res.status(400).json({ message: 'Username already exists' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id }, JWT_SECRET);
  res.json({ token });
});

// Auth middleware
function auth(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// Create booking
app.post('/api/bookings', auth, async (req, res) => {
  const { name, date } = req.body;
  const booking = await Booking.create({ name, date, user: req.userId });
  res.json(booking);
});

// Get bookings
app.get('/api/bookings', auth, async (req, res) => {
  const bookings = await Booking.find({ user: req.userId });
  res.json(bookings);
});

// Edit booking
app.put('/api/bookings/:id', auth, async (req, res) => {
  const { name, date } = req.body;
  const booking = await Booking.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    { name, date },
    { new: true }
  );
  res.json(booking);
});

// Delete booking
app.delete('/api/bookings/:id', auth, async (req, res) => {
  await Booking.deleteOne({ _id: req.params.id, user: req.userId });
  res.json({ message: 'Booking deleted' });
});

app.listen(3000, () => console.log('Advanced booking backend running on port 3000'));
