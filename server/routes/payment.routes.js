const router = require('express').Router();
const { createOrder, verifyPayment } = require('../controllers/payment.controller');

module.exports = (razorpay) => {
  router.post('/orders', createOrder(razorpay));
  router.post('/verify', verifyPayment(razorpay));
  return router;
};