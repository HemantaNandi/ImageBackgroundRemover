const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const dotenv = require('dotenv');
const paymentRoutes = require('./routes/payment.routes');

dotenv.config();

const app = express();

app.use(cors({
  origin: '*'
}));
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.use('/api/payment', paymentRoutes(razorpay));

const port = process.env.PORT || 5002;

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});