import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();

        const response = await axios.post(
            'https://api.pinata.cloud/pinning/pinFileToIPFS',
            formData,
            {
                headers: {
                    pinata_api_key: process.env.PINATA_API_KEY,
                    pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
                },
            }
        );

        return NextResponse.json({ IpfsHash: response.data.IpfsHash });
    } catch (error: any) {
        console.error("Error uploading file to Pinata via API:", error?.response?.data || error.message);
        return NextResponse.json({ error: 'Failed to upload file to IPFS' }, { status: 500 });
    }
}
