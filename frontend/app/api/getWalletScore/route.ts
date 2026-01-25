import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const wallet = searchParams.get('wallet');

    if (!wallet) {
        return NextResponse.json(
            { error: 'Wallet address is required' },
            { status: 400 }
        );
    }

    const apiKey = process.env.FAIRSCALE_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: 'FairScale API key not configured' },
            { status: 500 }
        );
    }

    try {
        const response = await fetch(
            `https://api.fairscale.xyz/walletscore/${wallet}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`FairScale API error: ${response.statusText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error fetching wallet score details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch wallet score details', details: error.message },
            { status: 500 }
        );
    }
}
