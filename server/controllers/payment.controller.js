const crypto = require('crypto');
exports.createOrder = (razorpay) => async (req, res) => {
  try {
    const options = {
      amount: 5000, // amount in the smallest currency unit
      currency: 'INR',
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).send(error);
  }
};

exports.verifyPayment = (razorpay) => async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest === razorpay_signature) {
      res.json({ message: 'Payment successful' });
    } else {
      res.status(400).send('Invalid signature');
    }
  } catch (error) {
    res.status(500).send(error);
  }
};