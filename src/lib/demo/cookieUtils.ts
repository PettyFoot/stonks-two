import { NextResponse } from 'next/server';

/**
 * Utility to clear demo session cookies directly in server responses
 */
export function clearDemoSessionCookie(response: NextResponse): NextResponse {
  // Clear the demo-session cookie with various path/domain combinations
  const cookieOptions = [
    'demo-session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
    'demo-session=; Path=/; Domain=localhost; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
    'demo-session=; Path=/; Domain=.localhost; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax'
  ];
  
  cookieOptions.forEach(cookieValue => {
    response.headers.append('Set-Cookie', cookieValue);
  });
  
  return response;
}

/**
 * Creates a response with demo session cookies cleared
 */
export function createResponseWithClearedDemoCookies(responseData: any, status: number = 200): NextResponse {
  const response = NextResponse.json(responseData, { status });
  return clearDemoSessionCookie(response);
}