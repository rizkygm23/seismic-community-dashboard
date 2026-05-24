import axios from 'axios';

const UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;
const METADATA_TIMEOUT_MS = 60 * 1000;

type UploadProgress = {
    loaded: number;
    total?: number;
    percent?: number;
};

type UploadFileOptions = {
    onUploadProgress?: (progress: UploadProgress) => void;
    timeoutMs?: number;
};

export const uploadMetadataToIPFS = async (metadataInfo: object) => {
    try {
        const response = await axios.post(
            '/api/pinata/metadata',
            metadataInfo,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: METADATA_TIMEOUT_MS,
            }
        );

        return `ipfs://${response.data.IpfsHash}`;
    } catch (error) {
        console.error("Error uploading metadata to Pinata:", error);
        throw error;
    }
};

export const uploadFileToIPFS = async (file: Blob | File, filename: string, options: UploadFileOptions = {}) => {
    // Create form data
    const formData = new FormData();
    formData.append('file', file, filename);

    try {
        const response = await axios.post(
            '/api/pinata/file',
            formData,
            {
                timeout: options.timeoutMs ?? UPLOAD_TIMEOUT_MS,
                onUploadProgress: event => {
                    if (!options.onUploadProgress) return;

                    const total = event.total ?? file.size;
                    const percent = total > 0
                        ? Math.min(100, Math.floor((event.loaded / total) * 100))
                        : undefined;

                    options.onUploadProgress({
                        loaded: event.loaded,
                        total,
                        percent,
                    });
                },
            }
        );

        return `ipfs://${response.data.IpfsHash}`;
    } catch (error) {
        console.error("Error uploading file to Pinata:", error);
        throw error;
    }
};
