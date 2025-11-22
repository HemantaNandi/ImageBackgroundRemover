document.addEventListener('DOMContentLoaded', () => {
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

    const removeBackground = async () => {
        if (!uploadedFile) {
            alert('Please upload an image first.');
            return;
        }

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

        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
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
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));

        const apiKey = '69909219f10ac209802d0d3972d1dad037f70e8c061edac9cbb133e4a0b1f171';
        const apiUrl = 'https://background-remover-service-619657643398.us-central1.run.app/remove-background/';

        const formData = new FormData();
        formData.append('file', blob, uploadedFile.name);

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'X-API-Key': apiKey,
                },
                body: formData,
            });

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
                link.download = 'background-removed.png';
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
            } else {
                const error = await response.json();
                alert(`Error: ${error.detail}`);
                // restore UI on error
                loadingContainer.style.display = 'none';
                if (dismissBtn) dismissBtn.style.display = 'none';
                uploadContent.style.display = 'block';
                uploadedFile = null;
            }
        } catch (error) {
            console.error('An error occurred:', error);
            alert('An error occurred while removing the background.');
            loadingContainer.style.display = 'none';
            if (dismissBtn) dismissBtn.style.display = 'none';
            uploadContent.style.display = 'block';
            uploadedFile = null;
        } finally {
            // ensure any running progress interval is cleared
            clearInterval(progressInterval);
        }
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
        removeBackground();
    });
    premiumDownloadBtn.addEventListener('click', (e) => {
        lastInitiator = 'premium';
        removeBackground();
    });
});