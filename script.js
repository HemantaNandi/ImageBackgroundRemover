document.addEventListener('DOMContentLoaded', () => {
    const baseUrl = window.location.origin.includes('localhost') ? 'http://localhost:3002' : '';
    const imageUpload = document.getElementById('image-upload');
    const uploadArea = document.getElementById('upload-area');
    const uploadContent = document.getElementById('upload-content');
    const loadingContainer = document.getElementById('loading-container');
    const progressBar = document.getElementById('progress-bar');
    const timeTakenEl = document.getElementById('time-taken');
    const originalImage = document.getElementById('original-image');
    const resultImage = document.getElementById('result-image');
    const boxPreview = document.getElementById('box-preview');
    const dismissBtn = document.getElementById('dismiss-btn');
    const freeDownloadBtn = document.getElementById('free-download-btn');
    const premiumDownloadBtn = document.getElementById('premium-download-btn');
        let lastInitiator = null; // 'free' or 'premium'
    
    let uploadedFile = null;

    uploadArea.addEventListener('click', () => {
        imageUpload.click();
    });

    imageUpload.addEventListener('change', (event) => {
        uploadedFile = event.target.files[0];
        if (uploadedFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // show the uploaded image inside the upload box
                boxPreview.src = e.target.result;
                boxPreview.style.display = 'block';
                if (dismissBtn) dismissBtn.style.display = 'none';
                uploadContent.style.display = 'none';
                // hide the large preview area images
                originalImage.style.display = 'none';
                resultImage.style.display = 'none';
            };
            reader.readAsDataURL(uploadedFile);
        }
    });

    // Core removal process: scales image, sends to background-remover API and handles UI
    // mode: 'full' or 'preview' — full creates larger JPEG, preview creates smaller PNG
    const processRemoval = async (mode = 'full') => {
        if (!uploadedFile) {
            alert('Please upload an image first.');
            return;
        }
        // disable action buttons while processing to prevent double submissions
        if (freeDownloadBtn) freeDownloadBtn.disabled = true;
        if (premiumDownloadBtn) premiumDownloadBtn.disabled = true;

        originalImage.style.display = 'none';
        uploadArea.style.display = 'block';
        uploadContent.style.display = 'none';
        // hide the in-box preview while processing so the object disappears during loading
        if (boxPreview) boxPreview.style.display = 'none';
        if (dismissBtn) dismissBtn.style.display = 'none';
        loadingContainer.style.display = 'block';
        progressBar.style.width = '0%';
        timeTakenEl.textContent = 'Time taken: 0s';

        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 1;
            if (progress <= 99) {
                progressBar.style.width = `${progress}%`;
            } else {
                clearInterval(progressInterval);
            }
        }, 50);

        const startTime = performance.now();

        // Image scaling
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = URL.createObjectURL(uploadedFile);
        await new Promise(resolve => img.onload = resolve);

        // Choose sizes based on mode
        const MAX_PREVIEW = 600;
        const MAX_FULL = 1024;
        const MAX_WIDTH = mode === 'preview' ? MAX_PREVIEW : MAX_FULL;
        const MAX_HEIGHT = mode === 'preview' ? MAX_PREVIEW : MAX_FULL;
        let width = img.width;
        let height = img.height;

        if (width > height) {
            if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
            }
        } else {
            if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
            }
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Create blob according to mode: preview -> PNG (preserve transparency), full -> high-quality JPEG
        let blob;
        if (mode === 'preview') {
            blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        } else {
            blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
        }

        // Prepare form data
        const formData = new FormData();
        // name the file appropriately for server
        const outName = mode === 'preview' ? `upload_preview.png` : `upload_full.jpg`;
        formData.append('file', blob, outName);

        try {
            // include size param so server or external API can handle sizing
            formData.append('size', mode === 'preview' ? 'preview' : 'auto');

            // If the free flow initiated the request, call the external background-remover service directly
            const externalApiUrl = 'https://background-remover-service-619657643398.us-central1.run.app/remove-background/';
            const externalApiKey = '69909219f10ac209802d0d3972d1dad037f70e8c061edac9cbb133e4a0b1f171';

            let response;
            if (lastInitiator === 'free') {
                // Call external API directly for free downloads (uses X-API-Key header)
                response = await fetch(externalApiUrl, {
                    method: 'POST',
                    headers: {
                        'X-API-Key': externalApiKey,
                    },
                    body: formData,
                });
            } else {
                // Premium or other flows go through the local server proxy which holds private keys
                response = await fetch(`${baseUrl}/remove-bg`, {
                    method: 'POST',
                    body: formData,
                });
            }

            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            timeTakenEl.textContent = `Time taken: ${duration}s`;
            
            clearInterval(progressInterval);
            progressBar.style.width = '100%';

            if (response.ok) {
                const resultBlob = await response.blob();
                const url = URL.createObjectURL(resultBlob);
                // show the processed image inside the upload box
                boxPreview.src = url;
                boxPreview.style.display = 'block';

                // show dismiss button so user can manually hide the result
                if (dismissBtn) dismissBtn.style.display = 'block';

                // hide the loading/progress UI now that result arrived
                loadingContainer.style.display = 'none';

                const link = document.createElement('a');
                link.href = url;
                // set download filename according to mode
                link.download = mode === 'preview' ? 'background-removed-preview.png' : 'background-removed.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // If the free button initiated this operation, auto-dismiss the preview
                // immediately after download so free downloads don't keep the preview open.
                if (lastInitiator === 'free') {
                    // perform the same actions as the dismiss button
                    uploadContent.style.display = 'block';
                    if (boxPreview) boxPreview.style.display = 'none';
                    if (dismissBtn) dismissBtn.style.display = 'none';
                    progressBar.style.width = '0%';
                    uploadedFile = null;
                }
                // reset initiator
                lastInitiator = null;
                // re-enable buttons after process finishes (already done above for success)
                if (freeDownloadBtn) freeDownloadBtn.disabled = false;
                if (premiumDownloadBtn) premiumDownloadBtn.disabled = false;
                // re-enable buttons after process finishes
            } else {
                const error = await response.json();
                alert(`Error: ${error.detail}`);
                // restore UI on error
                loadingContainer.style.display = 'none';
                if (dismissBtn) dismissBtn.style.display = 'none';
                uploadContent.style.display = 'block';
                uploadedFile = null;
                if (freeDownloadBtn) freeDownloadBtn.disabled = false;
                if (premiumDownloadBtn) premiumDownloadBtn.disabled = false;
            }
        } catch (error) {
            console.error('An error occurred:', error);
            alert('An error occurred while removing the background.');
            loadingContainer.style.display = 'none';
            if (dismissBtn) dismissBtn.style.display = 'none';
            uploadContent.style.display = 'block';
            uploadedFile = null;
            if (freeDownloadBtn) freeDownloadBtn.disabled = false;
            if (premiumDownloadBtn) premiumDownloadBtn.disabled = false;
        } finally {
            // ensure any running progress interval is cleared
            clearInterval(progressInterval);
        }
    };

    // Initiate premium purchase via Razorpay and on success call processRemoval
    const initiatePremiumPurchase = async () => {
        if (!uploadedFile) {
            alert('Please upload an image first.');
            return;
        }

        // disable buttons while payment flow is open
        if (freeDownloadBtn) freeDownloadBtn.disabled = true;
        if (premiumDownloadBtn) premiumDownloadBtn.disabled = true;

        // Amount in paise (Rs.50 -> 5000 paise). Update as needed.
        const amount = 5000;

        // Try to create an order on the server (recommended). Fallback to client-only flow if server unavailable.
        let order = null;
        try {
            const resp = await fetch(`${baseUrl}/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount }),
            });
            if (resp.ok) {
                order = await resp.json(); // expected { id, amount, currency }
            }
        } catch (e) {
            // server order creation failed or endpoint missing; we'll fallback to client-only checkout
            order = null;
        }

        const options = {
            key: 'rzp_test_RihiPjnBOebGaG',
            amount: order ? order.amount : amount,
            currency: order ? order.currency : 'INR',
            name: 'transparent.pics',
            description: 'Premium Background Removal',
            order_id: order ? order.id : undefined,
            handler: async function (response) {
                // Payment succeeded on client. Verify server-side before processing.
                // response contains: razorpay_payment_id, razorpay_order_id, razorpay_signature
                try {
                    const verifyResp = await fetch(`${baseUrl}/verify-payment`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            payment_id: response.razorpay_payment_id,
                            order_id: response.razorpay_order_id,
                            signature: response.razorpay_signature
                        })
                    });

                    if (verifyResp.ok) {
                        const verifyJson = await verifyResp.json();
                            if (verifyJson.verified) {
                                // verified by server — proceed to process the image (preview-quality for premium)
                                await processRemoval('preview');
                        } else {
                            alert('Payment verification failed on server. Processing aborted.');
                            console.error('Server verification failed:', verifyJson);
                        }
                    } else {
                        // server verify endpoint failed — do not proceed automatically
                        console.error('Verify endpoint returned non-OK:', verifyResp.status);
                        alert('Payment received but verification endpoint failed. Check server logs.');
                    }
                } catch (e) {
                    console.error('Error during payment verification:', e);
                    alert('Payment received but verification failed due to network error. See console for details.');
                }
            },
            prefill: {
                name: '',
                email: '',
                contact: ''
            },
            theme: { color: '#6c63ff' },
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (resp) {
            // Show detailed error information to help debugging
            console.error('Razorpay payment failed:', resp);
            const errMsg = resp.error && (resp.error.description || resp.error.reason) ? (resp.error.description || resp.error.reason) : 'Payment Failed';
            alert(`Oops! Something went wrong.\n${errMsg}`);
            if (freeDownloadBtn) freeDownloadBtn.disabled = false;
            if (premiumDownloadBtn) premiumDownloadBtn.disabled = false;
        });
        rzp.open();
    };

    // Dismiss button hides the processed preview and resets the upload UI
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            uploadContent.style.display = 'block';
            if (boxPreview) boxPreview.style.display = 'none';
            dismissBtn.style.display = 'none';
            progressBar.style.width = '0%';
            uploadedFile = null;
        });
    }

    // track which button initiated the removal so we can auto-dismiss for free downloads
    freeDownloadBtn.addEventListener('click', (e) => {
        lastInitiator = 'free';
        processRemoval();
    });
    premiumDownloadBtn.addEventListener('click', (e) => {
        lastInitiator = 'premium';
        // Start payment; on success processRemoval() will be called by the handler
        initiatePremiumPurchase();
    });
});