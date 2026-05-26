require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'https://coamit092.github.io',
    'https://amit.jyotiai.shop',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api', complaintRoutes);

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
