require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.warn('Warning: MongoDB connection string not set in environment (MONGO_URI).');
} else {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));
}

// Image Schema
const imageSchema = new mongoose.Schema({
  originalImage: { type: Buffer, required: true },
  createdAt: { type: Date, default: Date.now }
});
const Image = mongoose.model('Image', imageSchema);

const app = express();
app.use(cors());

const upload = multer({ storage: multer.memoryStorage() });

// Endpoint to save the original image
app.post('/save-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File is required.' });
    }
    const newImage = new Image({
      originalImage: req.file.buffer
    });
    await newImage.save();
    console.log('Original image saved to MongoDB.');
    return res.status(200).json({ message: 'Image saved successfully!' });
  } catch (err) {
    console.error('Image save error:', err);
    res.status(500).json({ error: err.message || 'Failed to save image.' });
  }
});

// Serve static files from project root
app.use(express.static(path.join(__dirname)));

// Export the app for Vercel
module.exports = app;
