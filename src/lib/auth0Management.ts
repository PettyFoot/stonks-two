import { ManagementClient } from 'auth0';

interface Auth0User {
  user_id: string;
  email: string;
  name?: string;
  identities?: Array<{
    provider: string;
    user_id: string;
    connection: string;
    isSocial: boolean;
  }>;
}

class Auth0ManagementService {
  private client: ManagementClient | null = null;

  private getClient(): ManagementClient {
    if (!this.client) {
      const domain = process.env.AUTH0_DOMAIN;
      const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID;
      const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET;
      const audience = process.env.AUTH0_MANAGEMENT_AUDIENCE;

      if (!domain || !clientId || !clientSecret || !audience) {
        throw new Error(
          'Auth0 Management API credentials are not properly configured. Please check environment variables: AUTH0_DOMAIN, AUTH0_MANAGEMENT_CLIENT_ID, AUTH0_MANAGEMENT_CLIENT_SECRET, AUTH0_MANAGEMENT_AUDIENCE'
        );
      }

      this.client = new ManagementClient({
        domain,
        clientId,
        clientSecret,
        audience
      });
    }

    return this.client;
  }

  /**
   * Delete a user from Auth0
   */
  async deleteUser(auth0Id: string): Promise<void> {
    const client = this.getClient();

    try {
      // First check if user exists
      const userExists = await this.getUser(auth0Id);
      if (!userExists) {
        console.log(`[Auth0] User ${auth0Id} does not exist in Auth0 (may have been deleted manually)`);
        return; // Already deleted, no action needed
      }

      // Delete the user
      await client.users.delete(auth0Id);
      console.log(`[Auth0] Successfully deleted user: ${auth0Id}`);

      // Verify deletion
      const stillExists = await this.getUser(auth0Id);
      if (stillExists) {
        throw new Error(`User ${auth0Id} still exists in Auth0 after deletion attempt`);
      }
    } catch (error) {
      // Log detailed error information
      console.error(`[Auth0] Failed to delete user ${auth0Id}:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        auth0Id,
        domain: process.env.AUTH0_DOMAIN,
        audience: process.env.AUTH0_MANAGEMENT_AUDIENCE
      });

      // Re-throw the error so caller can handle it
      throw new Error(`Auth0 deletion failed for ${auth0Id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get user details from Auth0
   */
  async getUser(auth0Id: string): Promise<Auth0User | null> {
    try {
      const client = this.getClient();
      const user = await client.users.get(auth0Id);
      return {
        user_id: user.data.user_id || auth0Id,
        email: user.data.email || '',
        name: user.data.name,
        identities: user.data.identities as Array<{
          provider: string;
          user_id: string;
          connection: string;
          isSocial: boolean;
        }>
      };
    } catch (error) {
      console.error(`Failed to get Auth0 user ${auth0Id}:`, error);
      return null;
    }
  }

  /**
   * Check if Auth0 Management API is properly configured
   */
  isConfigured(): boolean {
    try {
      const domain = process.env.AUTH0_DOMAIN;
      const clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID;
      const clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET;
      const audience = process.env.AUTH0_MANAGEMENT_AUDIENCE;

      return !!(domain && clientId && clientSecret && audience);
    } catch {
      return false;
    }
  }
}

export const auth0ManagementService = new Auth0ManagementService();