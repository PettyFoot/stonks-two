import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.FEEDBACK_TOKEN_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production';
const TOKEN_EXPIRY = '30d'; // 30 days

export interface FeedbackTokenPayload {
  userId: string;
  email: string;
  name: string;
}

export interface ValidatedTokenPayload extends FeedbackTokenPayload {
  iat: number;
  exp: number;
}

/**
 * Generate a JWT token for feedback submission
 */
export function generateFeedbackToken(payload: FeedbackTokenPayload): string {
  try {
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
    });
    return token;
  } catch (error) {
    console.error('Error generating feedback token:', error);
    throw new Error('Failed to generate feedback token');
  }
}

/**
 * Validate and decode a feedback token
 */
export function validateFeedbackToken(token: string): ValidatedTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ValidatedTokenPayload;

    // Verify required fields exist
    if (!decoded.userId || !decoded.email) {
      console.error('Invalid token payload - missing required fields');
      return null;
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.error('Feedback token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error('Invalid feedback token:', error.message);
    } else {
      console.error('Error validating feedback token:', error);
    }
    return null;
  }
}

/**
 * Decode token without verification (useful for debugging)
 */
export function decodeToken(token: string): any {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}