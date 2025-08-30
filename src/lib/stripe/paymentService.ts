import { getStripe } from './config';
import { prisma } from '../prisma';
import {
  CreatePaymentIntentParams,
  PaymentData,
  ServiceResponse,
  StripeServiceError,
  STRIPE_TO_DB_PAYMENT_STATUS,
} from './types';
import { PaymentStatus } from '@prisma/client';

/**
 * Payment Service for handling Stripe payments
 * Manages payment intents and payment history
 */
export class PaymentService {
  /**
   * Create a payment intent for one-time payments
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<ServiceResponse<{ clientSecret: string; paymentIntentId: string }>> {
    try {
      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency || 'usd',
        customer: params.customerId,
        description: params.description,
        metadata: {
          ...params.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        data: {
          clientSecret: paymentIntent.client_secret!,
          paymentIntentId: paymentIntent.id,
        },
      };
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment intent',
      };
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(paymentIntentId: string): Promise<ServiceResponse<PaymentData>> {
    try {
      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

      // Save or update payment history
      const paymentData = await this.savePaymentFromIntent(paymentIntent);

      return {
        success: true,
        data: paymentData,
      };
    } catch (error) {
      console.error('Error confirming payment intent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm payment',
      };
    }
  }

  /**
   * Retrieve payment intent
   */
  async getPaymentIntent(paymentIntentId: string): Promise<ServiceResponse<any>> {
    try {
      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        success: true,
        data: paymentIntent,
      };
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve payment intent',
      };
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<ServiceResponse<void>> {
    try {
      const stripe = getStripe();
      await stripe.paymentIntents.cancel(paymentIntentId);

      // Update payment history if exists
      await prisma.paymentHistory.updateMany({
        where: { stripePaymentIntentId: paymentIntentId },
        data: { status: PaymentStatus.CANCELED },
      });

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error canceling payment intent:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel payment intent',
      };
    }
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(userId: string, limit = 50, offset = 0): Promise<ServiceResponse<PaymentData[]>> {
    try {
      const payments = await prisma.paymentHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return {
        success: true,
        data: payments.map(payment => ({
          ...payment,
          stripeSubscriptionId: payment.stripeSubscriptionId ?? undefined,
          description: payment.description ?? undefined,
          receiptUrl: payment.receiptUrl ?? undefined
        })),
      };
    } catch (error) {
      console.error('Error getting payment history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment history',
      };
    }
  }

  /**
   * Get payment by payment intent ID
   */
  async getPaymentByIntentId(paymentIntentId: string): Promise<ServiceResponse<PaymentData>> {
    try {
      const payment = await prisma.paymentHistory.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found',
        };
      }

      return {
        success: true,
        data: {
          ...payment,
          stripeSubscriptionId: payment?.stripeSubscriptionId ?? undefined,
          description: payment?.description ?? undefined,
          receiptUrl: payment?.receiptUrl ?? undefined
        },
      };
    } catch (error) {
      console.error('Error getting payment by intent ID:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment',
      };
    }
  }

  /**
   * Process successful payment from webhook
   */
  async processSuccessfulPayment(paymentIntent: any): Promise<ServiceResponse<PaymentData>> {
    try {
      const paymentData = await this.savePaymentFromIntent(paymentIntent);

      // Handle any post-payment processing here
      // For example, upgrading user tier, sending confirmation emails, etc.
      
      return {
        success: true,
        data: paymentData,
      };
    } catch (error) {
      console.error('Error processing successful payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process payment',
      };
    }
  }

  /**
   * Process failed payment from webhook
   */
  async processFailedPayment(paymentIntent: any): Promise<ServiceResponse<PaymentData>> {
    try {
      const paymentData = await this.savePaymentFromIntent(paymentIntent);

      // Handle failed payment logic here
      // For example, sending notification emails, updating subscription status, etc.
      
      return {
        success: true,
        data: paymentData,
      };
    } catch (error) {
      console.error('Error processing failed payment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process failed payment',
      };
    }
  }

  /**
   * Save payment data from Stripe payment intent
   */
  private async savePaymentFromIntent(paymentIntent: any): Promise<PaymentData> {
    try {
      // Get customer ID - this is required for security
      const customerId = paymentIntent.customer;
      
      if (!customerId) {
        console.error(`Payment intent ${paymentIntent.id} missing customer ID`);
        throw new Error('Payment must have associated customer for security');
      }

      // Find user by customer ID with verification
      const user = await prisma.user.findUnique({
        where: { stripeCustomerId: customerId },
        select: { 
          id: true, 
          email: true, 
          stripeCustomerId: true 
        },
      });

      if (!user) {
        console.error(`No user found for customer ID: ${customerId}`);
        throw new Error('User not found for customer ID');
      }

      // Double-check customer ID matches (defense in depth)
      if (user.stripeCustomerId !== customerId) {
        console.error(`Customer ID mismatch: ${user.stripeCustomerId} vs ${customerId}`);
        throw new Error('Customer ID verification failed');
      }

      const userId = user.id;

      const paymentData = {
        userId,
        stripePaymentIntentId: paymentIntent.id,
        stripeSubscriptionId: paymentIntent.metadata?.subscriptionId || null,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: STRIPE_TO_DB_PAYMENT_STATUS[paymentIntent.status as keyof typeof STRIPE_TO_DB_PAYMENT_STATUS] || PaymentStatus.PENDING,
        description: paymentIntent.description || null,
        receiptUrl: paymentIntent.charges?.data?.[0]?.receipt_url || null,
      };

      // Upsert payment history record with transaction for consistency
      const payment = await prisma.$transaction(async (tx) => {
        const payment = await tx.paymentHistory.upsert({
          where: { stripePaymentIntentId: paymentIntent.id },
          update: {
            status: paymentData.status,
            receiptUrl: paymentData.receiptUrl,
          },
          create: paymentData,
        });
        
        // Log successful payment attribution for audit trail
        console.log(`[AUDIT] Payment ${paymentIntent.id} attributed to user ${userId} (${user.email})`);
        
        return payment;
      });

      return {
        ...payment,
        stripeSubscriptionId: payment.stripeSubscriptionId ?? undefined,
        description: payment.description ?? undefined,
        receiptUrl: payment.receiptUrl ?? undefined
      };
    } catch (error) {
      console.error('Error saving payment from intent:', error);
      throw new StripeServiceError(
        'Failed to save payment data',
        'PAYMENT_SAVE_FAILED',
        error as any
      );
    }
  }

  /**
   * Create refund for a payment
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer'
  ): Promise<ServiceResponse<any>> {
    try {
      const stripe = getStripe();
      const refundParams: any = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        refundParams.amount = amount;
      }

      if (reason) {
        refundParams.reason = reason;
      }

      const refund = await stripe.refunds.create(refundParams);

      // Update payment history status
      await prisma.paymentHistory.updateMany({
        where: { stripePaymentIntentId: paymentIntentId },
        data: { status: PaymentStatus.REFUNDED },
      });

      return {
        success: true,
        data: refund,
      };
    } catch (error) {
      console.error('Error creating refund:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create refund',
      };
    }
  }

  /**
   * Get payment statistics for a user
   */
  async getPaymentStats(userId: string): Promise<ServiceResponse<{
    totalPayments: number;
    totalAmount: number;
    successfulPayments: number;
    failedPayments: number;
  }>> {
    try {
      const stats = await prisma.paymentHistory.aggregate({
        where: { userId },
        _count: {
          id: true,
        },
        _sum: {
          amount: true,
        },
      });

      const successfulCount = await prisma.paymentHistory.count({
        where: {
          userId,
          status: PaymentStatus.SUCCEEDED,
        },
      });

      const failedCount = await prisma.paymentHistory.count({
        where: {
          userId,
          status: {
            in: [PaymentStatus.FAILED, PaymentStatus.CANCELED],
          },
        },
      });

      return {
        success: true,
        data: {
          totalPayments: stats._count.id,
          totalAmount: stats._sum.amount || 0,
          successfulPayments: successfulCount,
          failedPayments: failedCount,
        },
      };
    } catch (error) {
      console.error('Error getting payment stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment statistics',
      };
    }
  }
}