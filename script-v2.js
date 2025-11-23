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
    const resetBtn = document.getElementById('reset-btn');
    
    let uploadedFile = null;
    let generatedUrl = null; // stores URL of last generated result
    let isProcessing = false;

    uploadArea.addEventListener('click', () => {
        imageUpload.click();
    });

    imageUpload.addEventListener('change', (event) => {
        uploadedFile = event.target.files[0];
        if (uploadedFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // show the image inside the dashed upload box
                boxPreview.src = e.target.result;
                boxPreview.style.display = 'block';
                dismissBtn.style.display = 'block';
                uploadContent.style.display = 'none';
                // keep the larger preview/result area in sync but hidden until processing
                originalImage.src = e.target.result;
                originalImage.style.display = 'none';
                resultImage.style.display = 'none';
            };
            reader.readAsDataURL(uploadedFile);
            freeDownloadBtn.textContent = 'Remove Background';
        }
    });

    // dismiss button hides the in-box preview and returns to upload state
    dismissBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        boxPreview.src = '';
        boxPreview.style.display = 'none';
        dismissBtn.style.display = 'none';
        uploadContent.style.display = '';
        // clear file input
        imageUpload.value = '';
        uploadedFile = null;
    });

    const removeBackground = async () => {
        // If a generated result already exists, download it directly
        if (generatedUrl) {
            const link = document.createElement('a');
            link.href = generatedUrl;
            link.download = 'background-removed.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        if (!uploadedFile) {
            alert('Please upload an image first.');
            return;
        }

        if (isProcessing) return; // prevent double submission
        isProcessing = true;

        originalImage.style.display = 'none';
        // hide in-box preview during processing
        if (boxPreview) {
            boxPreview.style.display = 'none';
            dismissBtn.style.display = 'none';
        }
        uploadArea.style.display = '';
        uploadContent.style.display = 'none';
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
                // store generated result URL so future clicks download the same image
                generatedUrl = url;
                resultImage.src = url;
                freeDownloadBtn.textContent = 'Free Download';
                    originalImage.style.display = 'none';
                    resultImage.style.display = 'block';

                    // populate the larger result preview
                    // hide the upload box now that result is ready
                    loadingContainer.style.display = 'none';
                    progressBar.style.width = '0%';
                    try {
                        uploadArea.style.display = 'none';
                    } catch (e) {}

                    // set the in-page result preview and show reset control
                    boxPreview.src = url; // keeps the small box-preview in sync if visible elsewhere
                    boxPreview.style.display = 'none';
                    dismissBtn.style.display = 'none';
                    resetBtn.style.display = 'block';

                const link = document.createElement('a');
                link.href = url;
                link.download = 'background-removed.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                isProcessing = false;
            } else {
                const error = await response.json();
                alert(`Error: ${error.detail}`);
                isProcessing = false;
            }
        } catch (error) {
            console.error('An error occurred:', error);
            alert('An error occurred while removing the background.');
            isProcessing = false;
        } finally {
            // Do not auto-reset UI; user will use reset button to go back
        }
    };


    // Reset button restores upload area so user can upload another image
    freeDownloadBtn.addEventListener('click', removeBackground);

    resetBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        // hide result and show upload area
        // revoke object URL to free memory
        if (generatedUrl) {
            try { URL.revokeObjectURL(generatedUrl); } catch (e) {}
        }
        resultImage.src = '';
        resultImage.style.display = 'none';
        originalImage.src = '';
        originalImage.style.display = 'none';
        boxPreview.src = '';
        boxPreview.style.display = 'none';
        resetBtn.style.display = 'none';
        uploadContent.style.display = '';
        uploadArea.style.display = '';
        imageUpload.value = '';
        uploadedFile = null;
        generatedUrl = null;
        isProcessing = false;
        freeDownloadBtn.textContent = 'Free Download';
    });
});