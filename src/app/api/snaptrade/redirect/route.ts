import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { completeBrokerAuth } from '@/lib/snaptrade';
import { z } from 'zod';

const RedirectRequestSchema = z.object({
  brokerAuthorizationCode: z.string().min(1, 'Authorization code is required'),
  snapTradeUserId: z.string().min(1, 'SnapTrade user ID is required'),
  snapTradeUserSecret: z.string().min(1, 'SnapTrade user secret is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { brokerAuthorizationCode, snapTradeUserId, snapTradeUserSecret } = 
      RedirectRequestSchema.parse(body);

    // Complete broker authorization
    const result = await completeBrokerAuth({
      userId: session.user.sub,
      brokerAuthorizationCode,
      snapTradeUserId,
      snapTradeUserSecret,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to complete broker authorization' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      connection: result.connection,
    });

  } catch (error) {
    console.error('Error completing broker auth:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to complete broker authorization' 
      },
      { status: 500 }
    );
  }
}

// Handle GET requests for OAuth redirects (query parameters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Log all parameters for debugging

    
    // Check for various SnapTrade-specific parameters that might indicate success
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const brokerAuthorizationId = searchParams.get('brokerAuthorizationId');
    const connectionComplete = searchParams.get('connectionComplete');
    const authComplete = searchParams.get('authComplete');
    const status = searchParams.get('status');
    const code = searchParams.get('code'); // OAuth code parameter
    

    console.log('[SNAPTRADE_REDIRECT] Processing redirect parameters:', {
      success,
      error,
      brokerAuthorizationId,
      connectionComplete,
      authComplete,
      status,
      code,
      hasAnySuccessIndicator: !!(success === 'true' || brokerAuthorizationId || connectionComplete === 'true' || authComplete === 'true' || status === 'complete' || code)
    });
    
    // Create HTML page that communicates with parent window
    let messageType = 'ERROR';
    let messageData: any = { error: 'Unknown error' };

    // Handle OAuth errors
    if (error || success === 'false') {
      const errorDescription = searchParams.get('error_description') || searchParams.get('message') || 'Unknown error';
      console.error('SnapTrade OAuth error:', error, errorDescription);
      messageType = 'ERROR';
      messageData = { 
        error: errorDescription,
        errorCode: error || 'connection_failed'
      };
    }
    // Handle successful authorization - check multiple possible success indicators
    else if (success === 'true' || brokerAuthorizationId || connectionComplete === 'true' || authComplete === 'true' || status === 'complete' || code) {

      messageType = 'SUCCESS';
      messageData = {
        authorizationId: brokerAuthorizationId || code || 'success',
        success: true
      };
    }
    // Invalid request
    else {
      console.warn('Invalid SnapTrade OAuth redirect, no success or error parameter');
      console.warn('Available parameters:', Array.from(searchParams.keys()));
      messageType = 'ERROR';
      messageData = { 
        error: 'Invalid request - no success or error parameter found',
        errorCode: 'invalid_request'
      };
    }

    // Return HTML page that sends message to parent window and closes popup
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>SnapTrade Connection</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 40px 20px;
            text-align: center;
            background-color: #f9fafb;
            color: #374151;
        }
        .container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .success { color: #10b981; }
        .error { color: #ef4444; }
        .spinner {
            width: 40px;
            height: 40px;
            margin: 20px auto;
            border: 4px solid #e5e7eb;
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h2 class="${messageType === 'SUCCESS' ? 'success' : 'error'}">
            ${messageType === 'SUCCESS' ? 'All Connected!' : 'Connection Failed'}
        </h2>
        <p>
            ${messageType === 'SUCCESS' 
                ? 'Your broker has been successfully connected to StonksTwo. This window will close automatically and your connection count will update shortly.' 
                : `Error: ${messageData.error}`
            }
        </p>
        ${messageType === 'SUCCESS' ? `
        <div style="margin-top: 20px; padding: 15px; background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px;">
            <p style="margin: 0; color: #0369a1; font-size: 14px;">
                ✓ Authentication successful<br/>
                ✓ Broker connection established<br/>
                ✓ Refreshing your account data...
            </p>
        </div>
        ` : ''}
    </div>
    
    <script>



        
        // Send message to parent window
        const messageToParent = {
            type: '${messageType}',
            ...${JSON.stringify(messageData)}
        };
        

        
        // Try to send to parent window (handles popup case)
        if (window.opener) {
            window.opener.postMessage(messageToParent, window.location.origin);

        }
        
        // Also try parent (handles iframe case)
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(messageToParent, window.location.origin);

        }
        
        // Close window after a short delay
        setTimeout(() => {

            if (window.opener) {
                window.close();
            } else {
                // If can't close, at least show completion message
                document.querySelector('.spinner').style.display = 'none';
                document.querySelector('p').textContent = '${messageType === 'SUCCESS' 
                    ? 'You can now close this window.' 
                    : 'Please close this window and try again.'
                }';
            }
        }, 2000);
    </script>
</body>
</html>`;

    return new Response(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        // Add security headers but allow the popup to work
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "default-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline';"
      }
    });

  } catch (error) {
    console.error('Error handling OAuth redirect:', error);
    
    // Return error HTML page
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Connection Error</title>
    <style>
        body { font-family: sans-serif; text-align: center; padding: 40px; }
        .error { color: #ef4444; }
    </style>
</head>
<body>
    <h2 class="error">Server Error</h2>
    <p>An unexpected error occurred. Please close this window and try again.</p>
    <script>
        window.opener && window.opener.postMessage({
            type: 'ERROR',
            error: 'Server error occurred',
            errorCode: 'server_error'
        }, window.location.origin);
        setTimeout(() => window.close(), 3000);
    </script>
</body>
</html>`;
    
    return new Response(errorHtml, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}