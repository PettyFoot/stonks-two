import { getStripe } from './config';
import { prisma } from '../prisma';
import {
  CreateCustomerParams,
  CustomerData,
  ServiceResponse,
  StripeServiceError,
  CustomerNotFoundError,
} from './types';

/**
 * Customer Service for managing Stripe customers
 * Handles customer creation, retrieval, and synchronization with database
 */
export class CustomerService {
  /**
   * Create a new Stripe customer and update user record
   */
  async createCustomer(params: CreateCustomerParams): Promise<ServiceResponse<CustomerData>> {
    try {
      // Check if customer already exists
      const existingUser = await prisma.user.findUnique({
        where: { id: params.userId },
      });

      if (!existingUser) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      if (existingUser.stripeCustomerId) {
        // Customer already exists, return existing data
        const stripe = getStripe();
        const stripeCustomer = await stripe.customers.retrieve(existingUser.stripeCustomerId);
        
        if (stripeCustomer.deleted) {
          // Customer was deleted in Stripe, create new one
          return this.createNewCustomer(params, existingUser.id);
        }

        return {
          success: true,
          data: {
            stripeCustomerId: existingUser.stripeCustomerId,
            email: params.email,
            name: params.name,
            userId: params.userId,
            metadata: (stripeCustomer as any).metadata,
          },
        };
      }

      return this.createNewCustomer(params, existingUser.id);
    } catch (error) {
      console.error('Error creating customer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create customer',
      };
    }
  }

  private async createNewCustomer(params: CreateCustomerParams, userId: string): Promise<ServiceResponse<CustomerData>> {
    try {
      // Create customer in Stripe
      const stripe = getStripe();
      const stripeCustomer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: {
          userId: params.userId,
          ...params.metadata,
        },
      });

      // Update user record with Stripe customer ID
      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeCustomerId: stripeCustomer.id,
        },
      });

      return {
        success: true,
        data: {
          stripeCustomerId: stripeCustomer.id,
          email: params.email,
          name: params.name,
          userId: params.userId,
          metadata: stripeCustomer.metadata,
        },
      };
    } catch (error) {
      console.error('Error creating new customer:', error);
      throw new StripeServiceError(
        'Failed to create Stripe customer',
        'CUSTOMER_CREATION_FAILED',
        error as any
      );
    }
  }

  /**
   * Retrieve customer by Stripe customer ID
   */
  async getCustomer(stripeCustomerId: string): Promise<ServiceResponse<CustomerData>> {
    try {
      const stripe = getStripe();
      const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);
      
      if (stripeCustomer.deleted) {
        throw new CustomerNotFoundError(stripeCustomerId);
      }

      // Get user data from database
      const user = await prisma.user.findUnique({
        where: { stripeCustomerId },
      });

      if (!user) {
        throw new Error('User not found for customer');
      }

      return {
        success: true,
        data: {
          stripeCustomerId,
          email: stripeCustomer.email!,
          name: stripeCustomer.name || user.name || undefined,
          userId: user.id,
          metadata: stripeCustomer.metadata,
        },
      };
    } catch (error) {
      console.error('Error retrieving customer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve customer',
      };
    }
  }

  /**
   * Get customer by user ID
   */
  async getCustomerByUserId(userId: string): Promise<ServiceResponse<CustomerData>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      if (!user.stripeCustomerId) {
        return {
          success: false,
          error: 'Customer not found for user',
        };
      }

      return this.getCustomer(user.stripeCustomerId);
    } catch (error) {
      console.error('Error getting customer by user ID:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get customer',
      };
    }
  }

  /**
   * Update customer information
   */
  async updateCustomer(
    stripeCustomerId: string,
    updates: Partial<Pick<CustomerData, 'email' | 'name'>> & { metadata?: Record<string, string> }
  ): Promise<ServiceResponse<CustomerData>> {
    try {
      const updateParams: any = {};
      
      if (updates.email) updateParams.email = updates.email;
      if (updates.name) updateParams.name = updates.name;
      if (updates.metadata) updateParams.metadata = updates.metadata;

      const stripe = getStripe();
      const stripeCustomer = await stripe.customers.update(stripeCustomerId, updateParams);

      // Get user data from database
      const user = await prisma.user.findUnique({
        where: { stripeCustomerId },
      });

      if (!user) {
        throw new Error('User not found for customer');
      }

      return {
        success: true,
        data: {
          stripeCustomerId,
          email: stripeCustomer.email!,
          name: stripeCustomer.name || user.name || undefined,
          userId: user.id,
          metadata: stripeCustomer.metadata,
        },
      };
    } catch (error) {
      console.error('Error updating customer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update customer',
      };
    }
  }

  /**
   * Delete customer (soft delete - mark as deleted in Stripe)
   */
  async deleteCustomer(stripeCustomerId: string): Promise<ServiceResponse<void>> {
    try {
      const stripe = getStripe();
      await stripe.customers.del(stripeCustomerId);

      // Update user record to remove Stripe customer ID
      await prisma.user.updateMany({
        where: { stripeCustomerId },
        data: {
          stripeCustomerId: null,
          subscriptionStatus: 'INACTIVE',
          subscriptionTier: 'FREE',
        },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting customer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete customer',
      };
    }
  }

  /**
   * Create billing portal session for customer management
   */
  async createBillingPortalSession(
    stripeCustomerId: string,
    returnUrl: string
  ): Promise<ServiceResponse<{ url: string }>> {
    try {
      const stripe = getStripe();
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: returnUrl,
      });

      return {
        success: true,
        data: { url: session.url },
      };
    } catch (error) {
      console.error('Error creating billing portal session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create billing portal session',
      };
    }
  }
}