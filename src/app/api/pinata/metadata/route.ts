import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
    try {
        const metadataInfo = await req.json();

        const response = await axios.post(
            'https://api.pinata.cloud/pinning/pinJSONToIPFS',
            metadataInfo,
            {
                headers: {
                    'Content-Type': 'application/json',
                    pinata_api_key: process.env.PINATA_API_KEY,
                    pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
                },
            }
        );

        return NextResponse.json({ IpfsHash: response.data.IpfsHash });
    } catch (error: any) {
        console.error("Error uploading metadata to Pinata via API:", error?.response?.data || error.message);
        return NextResponse.json({ error: 'Failed to upload metadata to IPFS' }, { status: 500 });
    }
}
