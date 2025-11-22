import React, { useState, useRef } from 'react';
import axios from 'axios';

const Home = () => {
  const [image, setImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [timeTaken, setTimeTaken] = useState(0);
  const originalImageRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setError(null);
      setProcessedImage(null);
      const reader = new FileReader();
      reader.onloadend = (e) => {
        setImage(e.target.result);
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
            originalImageRef.current = img;
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBackgroundWithApi = async () => {
    if (!image) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      const byteCharacters = atob(image.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      formData.append('image_file', blob, 'image.png');
      formData.append('size', 'preview');

      const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
        headers: {
          'X-Api-Key': 'jdSr9bxYXpFy1paErksbJ7Rc',
        },
        responseType: 'arraybuffer',
      });

      const base64Image = btoa(
        new Uint8Array(response.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      const newBgRemovedImage = `data:${response.headers['content-type']};base64,${base64Image}`;
      setProcessedImage(newBgRemovedImage);
      downloadImage(newBgRemovedImage);

    } catch (err) {
      console.error("Background removal error:", err);
      setError('Failed to remove background. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePremiumDownload = async () => {
    const response = await fetch('http://localhost:5002/api/payment/orders', { method: 'POST' });
    const order = await response.json();
    const options = {
      key: 'rzp_test_RihiPjnBOebGaG',
      amount: order.amount,
      currency: order.currency,
      name: 'Image Background Remover',
      description: 'Premium Download',
      order_id: order.id,
      handler: async (res) => {
        const verifyRes = await fetch('http://localhost:5002/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(res),
        });
        const verification = await verifyRes.json();
        if (verification.message === 'Payment successful') {
          removeBackgroundWithApi();
        }
      },
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };
  
  const removeBackgroundFree = async () => {
    setIsLoading(true);
    setProgress(0);
    setTimeTaken(0);

    let progressInterval = setInterval(() => {
      setProgress(p => {
        if (p >= 99) {
          clearInterval(progressInterval);
          return 99;
        }
        return p + 1;
      });
    }, 50);

    const startTime = performance.now();

    const net = await window.bodyPix.load({
        architecture: 'ResNet50',
        outputStride: 16,
        quantBytes: 2
    });

    const segmentation = await net.segmentMultiPerson(originalImageRef.current, {
        flipHorizontal: false,
        internalResolution: 'high',
        segmentationThreshold: 0.7
    });
    
    const endTime = performance.now();
    setTimeTaken(((endTime - startTime) / 1000).toFixed(2));

    clearInterval(progressInterval);
    setProgress(100);

    const foregroundColor = { r: 0, g: 0, b: 0, a: 255 };
    const backgroundColor = { r: 0, g: 0, b: 0, a: 0 };
    const personMask = window.bodyPix.toMask(segmentation, foregroundColor, backgroundColor);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = originalImageRef.current.width;
    canvas.height = originalImageRef.current.height;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.putImageData(personMask, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImageRef.current, 0, 0, canvas.width, canvas.height);
    
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(tempCanvas, 0, 0);

    ctx.globalCompositeOperation = 'source-over';
    
    const newProcessedImage = canvas.toDataURL();
    setProcessedImage(newProcessedImage);
    downloadImage(newProcessedImage)
    
    setTimeout(() => setIsLoading(false), 1000);
  };
  
  const downloadImage = (imageToDownload) => {
    const link = document.createElement('a');
    link.href = imageToDownload;
    link.download = `background-removed.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-xl mx-auto my-12 p-8 space-y-8 bg-white rounded-xl shadow-md">
      <div className="text-center">
        <h1 className="App-title-text">transparent.pics</h1>
        <h2 className="text-2xl font-bold text-gray-900">Free AI Image Background Remover</h2>
        <p className="mt-2 text-lg text-gray-600">Upload an image to remove the background.</p>
      </div>
      
      <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
        <input type="file" id="image-upload" className="hidden" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} />
        <label htmlFor="image-upload" className="cursor-pointer text-center">
          {isLoading ? (
            <div>
              <p>Processing image...</p>
              <div style={{ width: '100%', backgroundColor: '#e0e0e0', borderRadius: '4px' }}>
                <div style={{ width: `${progress}%`, backgroundColor: '#76c7c0', height: '24px', borderRadius: '4px' }}></div>
              </div>
              <p>Time taken: {timeTaken} seconds</p>
            </div>
          ) : processedImage ? (
            <img src={processedImage} alt="Processed" className="max-h-48 rounded-lg" />
          ) : image ? (
            <img src={image} alt="Uploaded" className="max-h-48 rounded-lg" />
          ) : (
            <>
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4_0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="mt-2 block text-sm font-medium text-gray-900">Click to upload an image</span>
              <span className="block text-xs text-gray-500">PNG, JPG, etc.</span>
            </>
          )}
        </label>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div className="flex justify-center space-x-4">
        <button className="px-6 py-3 border border-gray-300 rounded-md text-base font-medium text-gray-700 bg-white hover:bg-gray-50" disabled={!image || isLoading} onClick={removeBackgroundFree}>
          {isLoading ? 'Processing...' : 'Free Download'}
        </button>
        <button className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700" disabled={!image || isLoading} onClick={handlePremiumDownload}>
          Premium Quality Download (Rs. 50)
        </button>
      </div>
    </div>
  );
};

export default Home;