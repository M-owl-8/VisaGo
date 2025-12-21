import { NextResponse } from 'next/server';

/**
 * GET /api/config/google-client-id
 * Returns Google OAuth Client ID from server-side environment variables
 * This allows the client to get the ID at runtime without needing NEXT_PUBLIC_ prefix
 */
export async function GET() {
  try {
    // Get from server-side environment (available at runtime, not build time)
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 
                     process.env.GOOGLE_CLIENT_ID || 
                     '';

    if (!clientId) {
      return NextResponse.json(
        { 
          success: false, 
          clientId: null,
          error: 'Google Client ID not configured' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      clientId,
    });
  } catch (error) {
    console.error('[API] Error getting Google Client ID:', error);
    return NextResponse.json(
      { 
        success: false, 
        clientId: null,
        error: 'Failed to get Google Client ID' 
      },
      { status: 500 }
    );
  }
}

