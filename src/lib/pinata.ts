import axios from 'axios';

export const uploadMetadataToIPFS = async (metadataInfo: object) => {
    const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;

    try {
        const response = await axios.post(
            url,
            metadataInfo,
            {
                headers: {
                    'Content-Type': 'application/json',
                    pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY,
                    pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY,
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
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

    // Create form data
    const formData = new FormData();
    formData.append('file', file, filename);

    try {
        const response = await axios.post(
            url,
            formData,
            {
                headers: {
                    'Content-Type': `multipart/form-data`,
                    pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY,
                    pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY,
                },
            }
        );

        return `ipfs://${response.data.IpfsHash}`;
    } catch (error) {
        console.error("Error uploading file to Pinata:", error);
        throw error;
    }
};
