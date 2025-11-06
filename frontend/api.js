async function uploadFile() {
    if (!idToken) {
        showMessage('error', 'You must be signed in to upload a file.');
        return;
    }

    const file = document.getElementById('file-input').files[0];
    if (!file) {
        showMessage('error', 'Please select a file to upload.');
        return;
    }

    try {
        showMessage('success', '1/3: Requesting secure upload URL from API...');

        const response = await fetch(AWS_CONFIG.API_GATEWAY_INVOKE_URL + '/upload-url', {
            method: 'POST',
            headers: {
                'Authorization': idToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename: file.name })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API Gateway request failed');
        }

        const data = await response.json();
        const uploadUrl = data.uploadUrl;
        const s3Key = data.s3Key;

        showMessage('success', '2/3: Got secure link. Uploading file to S3...');

        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });

        if (!uploadResponse.ok) {
            throw new Error('S3 upload failed.');
        }

        showMessage('success', `File successfully uploaded! Saved as: ${s3Key}`);
        document.getElementById('file-input').value = '';
        
        setTimeout(() => {
            listFiles();
        }, 1000);

    } catch (err) {
        showMessage('error', 'Upload process failed: ' + err.message);
    }
}

async function listFiles() {
    if (!idToken) {
        showMessage('error', 'You must be signed in to list files.');
        return;
    }

    try {
        const response = await fetch(AWS_CONFIG.API_GATEWAY_INVOKE_URL + '/files', {
            method: 'GET',
            headers: {
                'Authorization': idToken
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch files');
        }

        const data = await response.json();
        displayFiles(data.files);

    } catch (err) {
        showMessage('error', 'Failed to list files: ' + err.message);
    }
}

function displayFiles(files) {
    const fileListEl = document.getElementById('file-list');
    
    if (!files || files.length === 0) {
        fileListEl.innerHTML = '<div class="empty-state">No files found. Upload your first file!</div>';
        return;
    }

    fileListEl.innerHTML = files.map(file => {
        const fileName = file.key.split('/').pop();
        const fileSize = formatFileSize(file.size);
        const lastModified = new Date(file.lastModified).toLocaleString();
        
        return `
            <div class="file-item">
                <div class="file-info">
                    <div class="file-name">${fileName}</div>
                    <div class="file-meta">${fileSize} • ${lastModified}</div>
                </div>
                <div class="file-actions">
                    <button class="btn-download" onclick="downloadFile('${file.key}')">Download</button>
                    <button class="btn-delete" onclick="deleteFile('${file.key}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

async function downloadFile(s3Key) {
    if (!idToken) {
        showMessage('error', 'You must be signed in to download files.');
        return;
    }

    try {
        const response = await fetch(
            AWS_CONFIG.API_GATEWAY_INVOKE_URL + '/download-url?key=' + encodeURIComponent(s3Key),
            {
                method: 'GET',
                headers: {
                    'Authorization': idToken
                }
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get download URL');
        }

        const data = await response.json();
        
        window.open(data.downloadUrl, '_blank');
        showMessage('success', 'Download started!');

    } catch (err) {
        showMessage('error', 'Download failed: ' + err.message);
    }
}

async function deleteFile(s3Key) {
    if (!idToken) {
        showMessage('error', 'You must be signed in to delete files.');
        return;
    }

    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }

    try {
        const response = await fetch(AWS_CONFIG.API_GATEWAY_INVOKE_URL + '/files', {
            method: 'DELETE',
            headers: {
                'Authorization': idToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ key: s3Key })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete file');
        }

        showMessage('success', 'File deleted successfully!');
        listFiles();

    } catch (err) {
        showMessage('error', 'Delete failed: ' + err.message);
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}