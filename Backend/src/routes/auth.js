const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('../db');
const { users } = require('../db/schema');
const { eq } = require('drizzle-orm');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

const otpStore = new Map();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

router.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    otpStore.set(email, { otp, expiresAt });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Your Registration OTP',
      text: `Your OTP for registration is: ${otp}. It will expire in 10 minutes.`
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  const storedOtpData = otpStore.get(email);
  if (!storedOtpData) {
    return res.status(400).json({ error: 'Please request an OTP first' });
  }

  if (Date.now() > storedOtpData.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'OTP has expired' });
  }

  if (storedOtpData.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  res.json({ message: 'OTP verified successfully' });
});

router.post('/register', async (req, res) => {
  const { name, email, otp, password, confirmPassword } = req.body;
  
  if (!name || !email || !otp || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  const storedOtpData = otpStore.get(email);
  if (!storedOtpData) {
    return res.status(400).json({ error: 'Please request an OTP first' });
  }

  if (Date.now() > storedOtpData.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'OTP has expired' });
  }

  if (storedOtpData.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  try {
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.insert(users).values({ 
      name, 
      email, 
      password: hashedPassword,
      is_verified: true 
    });

    otpStore.delete(email);

    res.json({ message: 'Registration successful' });
  } catch (err) {
    console.error('[Register] Error:', err);
    res.status(500).json({ error: 'Error registering user' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt for: ${email}`);
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const userRecords = await db.select().from(users).where(eq(users.email, email));
    if (userRecords.length === 0) {
      console.log(`User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userRecords[0];
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Invalid password for: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });
    const isProduction = process.env.NODE_ENV === 'production' || req.headers.host.includes('onrender.com');
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: isProduction, 
      sameSite: isProduction ? 'None' : 'Lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    
    console.log(`Login successful: ${email}`);
    res.json({ name: user.name, email: user.email, role: user.role, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error logging in' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ name: req.user.name, email: req.user.email, role: req.user.role });
});

module.exports = router;
