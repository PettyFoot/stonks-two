import { ManagementClient } from 'auth0';

interface Auth0User {
  user_id: string;
  email: string;
  name?: string;
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
    try {
      const client = this.getClient();
      await client.users.delete(auth0Id);
      console.log(`Successfully deleted Auth0 user: ${auth0Id}`);
    } catch (error) {
      console.error(`Failed to delete Auth0 user ${auth0Id}:`, error);
      // Don't throw error - we want to proceed with local deletion even if Auth0 fails
      // The user might have already been deleted from Auth0 manually
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
        user_id: user.user_id || auth0Id,
        email: user.email || '',
        name: user.name
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