import { NextResponse } from 'next/server';
import axios from 'axios';

export const runtime = 'nodejs';

const PINATA_TIMEOUT_MS = 5 * 60 * 1000;

export async function POST(req: Request) {
    try {
        if (!process.env.PINATA_API_KEY || !process.env.PINATA_SECRET_API_KEY) {
            return NextResponse.json({ error: 'Pinata credentials are not configured' }, { status: 500 });
        }

        const formData = await req.formData();
        const file = formData.get('file');

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'Missing file upload' }, { status: 400 });
        }

        const pinataFormData = new FormData();
        pinataFormData.append('file', file, file.name);

        const response = await axios.post(
            'https://api.pinata.cloud/pinning/pinFileToIPFS',
            pinataFormData,
            {
                headers: {
                    pinata_api_key: process.env.PINATA_API_KEY,
                    pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity,
                timeout: PINATA_TIMEOUT_MS,
            }
        );

        return NextResponse.json({ IpfsHash: response.data.IpfsHash });
    } catch (error: any) {
        console.error("Error uploading file to Pinata via API:", error?.response?.data || error.message);
        return NextResponse.json({ error: 'Failed to upload file to IPFS' }, { status: 500 });
    }
}
