const express = require('express');
const Razorpay = require('razorpay');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fetch = require('node-fetch');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
// serve static files from project root (so index.html can be opened from server)
app.use(express.static(path.join(__dirname)));

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn('Warning: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set in environment.\n' +
    'Set them in a .env file or environment variables before using payment endpoints.');
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID || '',
  key_secret: RAZORPAY_KEY_SECRET || ''
});

// Multer for handling multipart uploads
const upload = multer({ storage: multer.memoryStorage() });

const REMOVE_BG_KEY = process.env.REACT_APP_REMOVE_BG_API_KEY || process.env.REMOVE_BG_API_KEY;
if (!REMOVE_BG_KEY) {
  console.warn('Warning: Remove.bg API key not set in environment (REACT_APP_REMOVE_BG_API_KEY).');
}

// Endpoint to proxy to remove.bg securely using server-side API key
app.post('/remove-bg', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file required' });

    // Accept optional 'size' param from client for preview vs full
    const size = req.body.size || 'auto';

    const form = new (require('form-data'))();
    form.append('image_file', req.file.buffer, { filename: req.file.originalname });
    form.append('size', size);

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_KEY,
      },
      body: form
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('remove.bg error', response.status, text);
      return res.status(response.status).send(text);
    }

    // pipe binary result back to client with content-type
    res.set('Content-Type', response.headers.get('content-type') || 'image/png');
    const buffer = await response.buffer();
    res.send(buffer);
  } catch (err) {
    console.error('remove-bg proxy error:', err);
    res.status(500).json({ error: err.message || 'remove-bg proxy failed' });
  }
});

// Create order
app.post('/create-order', async (req, res) => {
  try {
    const amount = req.body && req.body.amount ? parseInt(req.body.amount, 10) : null;
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: 'Amount (in paise) is required in request body' });
    }

    const options = {
      amount: amount,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    console.error('create-order error:', err);
    res.status(500).json({ error: err.message || 'Failed to create order' });
  }
});

// Verify payment
app.post('/verify-payment', (req, res) => {
  try {
    const { payment_id, order_id, signature } = req.body || {};
    if (!payment_id || !order_id || !signature) {
      return res.status(400).json({ verified: false, error: 'Missing required fields' });
    }

    const generated_signature = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET || '')
      .update(`${order_id}|${payment_id}`)
      .digest('hex');

    if (generated_signature === signature) {
      return res.json({ verified: true });
    }

    return res.json({ verified: false, error: 'Signature mismatch' });
  } catch (err) {
    console.error('verify-payment error:', err);
    res.status(500).json({ verified: false, error: err.message || 'Verification failed' });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
