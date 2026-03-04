import axios from 'axios';

export const uploadMetadataToIPFS = async (metadataInfo: object) => {
    try {
        const response = await axios.post(
            '/api/pinata/metadata',
            metadataInfo,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        return `ipfs://${response.data.IpfsHash}`;
    } catch (error) {
        console.error("Error uploading metadata to Pinata:", error);
        throw error;
    }
};

export const uploadFileToIPFS = async (file: Blob | File, filename: string) => {
    // Create form data
    const formData = new FormData();
    formData.append('file', file, filename);

    try {
        const response = await axios.post(
            '/api/pinata/file',
            formData,
            {
                headers: {
                    'Content-Type': `multipart/form-data`,
                },
            }
        );

        return `ipfs://${response.data.IpfsHash}`;
    } catch (error) {
        console.error("Error uploading file to Pinata:", error);
        throw error;
    }
};
