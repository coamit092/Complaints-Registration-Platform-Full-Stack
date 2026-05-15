const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('../db');
const { users } = require('../db/schema');
const { eq } = require('drizzle-orm');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

router.post('/send-otp', async (req, res) => {
  const { name, email } = req.body;
  console.log(`[Send-OTP] Request for: ${email}`);
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

  try {
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0 && existingUser[0].is_verified) {
      console.log(`[Send-OTP] Email already registered: ${email}`);
      return res.status(400).json({ error: 'Email already registered' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otp_expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`[Send-OTP] Saving OTP to DB for: ${email}`);
    if (existingUser.length > 0) {
      await db.update(users).set({ otp, otp_expiry, name }).where(eq(users.email, email));
    } else {
      await db.insert(users).values({ name, email, otp, otp_expiry, is_verified: false });
    }

    console.log(`[Send-OTP] Sending mail to: ${email}. Generated OTP: ${otp}`);
    try {
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'Your OTP',
        text: `Your OTP is ${otp}. It expires in 10 minutes.`,
      });
      console.log(`[Send-OTP] Mail sent successfully to: ${email}`);
      res.json({ message: 'OTP sent successfully' });
    } catch (mailErr) {
      console.error('[Send-OTP] Nodemailer Error:', mailErr);
      res.status(500).json({ error: `Mail service error: ${mailErr.message}` });
    }

  } catch (dbErr) {
    console.error('[Send-OTP] Database Error:', dbErr);
    res.status(500).json({ error: `Database error: ${dbErr.message}` });
  }
});

router.post('/register', async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const userRecords = await db.select().from(users).where(eq(users.email, email));
    if (userRecords.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = userRecords[0];
    if (user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (new Date() > new Date(user.otp_expiry)) return res.status(400).json({ error: 'OTP expired' });

    await db.update(users).set({ 
      password, // Plain text as requested
      is_verified: true, 
      otp: null, 
      otp_expiry: null 
    }).where(eq(users.email, email));

    res.json({ message: 'Registration successful' });
  } catch (err) {
    console.error(err);
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
    if (!user.is_verified) {
      console.log(`User not verified: ${email}`);
      return res.status(401).json({ error: 'User not verified' });
    }
    
    if (user.password !== password) {
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
