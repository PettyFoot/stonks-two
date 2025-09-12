import { z } from 'zod';

// Issue types that users can flag
export const FEEDBACK_ISSUE_TYPES = {
  WRONG_FIELD: 'WRONG_FIELD',         // AI mapped to wrong field
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',   // User doesn't trust the mapping
  MISSING_MAPPING: 'MISSING_MAPPING', // Important field wasn't mapped
  OTHER: 'OTHER',                     // Other issues
} as const;

// All valid Order table fields that can be suggested as corrections
export const ORDER_FIELDS = [
  'symbol',
  'orderType', 
  'side',
  'timeInForce',
  'orderQuantity',
  'limitPrice',
  'stopPrice',
  'orderStatus',
  'orderId',
  'parentOrderId',
  'orderPlacedTime',
  'orderExecutedTime',
  'orderUpdatedTime',
  'orderCancelledTime',
  'accountId',
  'orderAccount', 
  'orderRoute',
  'tags',
  'tradeId',
  'brokerMetadata', // For unmappable fields
] as const;

/**
 * Schema for individual feedback items
 */
export const UserFeedbackItemSchema = z.object({
  csvHeader: z.string()
    .min(1, 'CSV header cannot be empty')
    .max(255, 'CSV header too long'),
  
  aiMapping: z.string()
    .min(1, 'AI mapping cannot be empty')
    .max(255, 'AI mapping too long'),
  
  suggestedMapping: z.enum(ORDER_FIELDS as [string, ...string[]])
    .optional(),
  
  issueType: z.enum([
    FEEDBACK_ISSUE_TYPES.WRONG_FIELD,
    FEEDBACK_ISSUE_TYPES.LOW_CONFIDENCE,
    FEEDBACK_ISSUE_TYPES.MISSING_MAPPING,
    FEEDBACK_ISSUE_TYPES.OTHER,
  ]).optional(),
  
  comment: z.string()
    .max(500, 'Comment too long (max 500 characters)')
    .optional(),
    
  confidence: z.number()
    .min(0)
    .max(1)
    .optional(),
});

/**
 * Schema for complete user feedback
 */
export const UserFeedbackSchema = z.object({
  indicatedError: z.boolean()
    .describe('Whether user indicated there are errors in the mappings'),
  
  feedbackItems: z.array(UserFeedbackItemSchema)
    .max(100, 'Too many feedback items (max 100)')
    .describe('Individual feedback items for specific mappings'),
  
  overallComment: z.string()
    .max(1000, 'Overall comment too long (max 1000 characters)')
    .optional()
    .describe('General comment about the entire mapping set'),
});

/**
 * Schema for the complete process request with feedback
 */
export const ProcessWithFeedbackSchema = z.object({
  importBatchId: z.string()
    .cuid('Invalid import batch ID'),
  
  brokerName: z.string()
    .min(1, 'Broker name is required')
    .max(100, 'Broker name too long'),
  
  userFeedback: UserFeedbackSchema.optional(),
  
  accountTags: z.array(z.string().max(50))
    .max(10, 'Too many account tags')
    .optional(),
});

/**
 * Schema for admin review updates
 */
export const AdminReviewUpdateSchema = z.object({
  adminReviewStatus: z.enum([
    'PENDING',
    'IN_REVIEW', 
    'APPROVED',
    'CORRECTED',
    'DISMISSED',
    'ESCALATED',
  ]),
  
  adminNotes: z.string()
    .max(2000, 'Admin notes too long')
    .optional(),
});

/**
 * Schema for mapping correction requests
 */
export const MappingCorrectionSchema = z.object({
  feedbackItemId: z.string().cuid(),
  
  correctedMapping: z.enum(ORDER_FIELDS as [string, ...string[]])
    .describe('The correct field mapping'),
    
  applyToFutureUploads: z.boolean()
    .default(false)
    .describe('Whether to apply this correction to the broker format for future uploads'),
});

/**
 * Type definitions derived from schemas
 */
export type UserFeedbackItem = z.infer<typeof UserFeedbackItemSchema>;
export type UserFeedback = z.infer<typeof UserFeedbackSchema>;
export type ProcessWithFeedbackInput = z.infer<typeof ProcessWithFeedbackSchema>;
export type AdminReviewUpdate = z.infer<typeof AdminReviewUpdateSchema>;
export type MappingCorrection = z.infer<typeof MappingCorrectionSchema>;

/**
 * Helper function to validate and parse process request
 */
export function validateProcessWithFeedback(data: unknown): ProcessWithFeedbackInput {
  return ProcessWithFeedbackSchema.parse(data);
}

/**
 * Helper function to get display name for issue type
 */
export function getIssueTypeDisplayName(issueType: string): string {
  const displayNames = {
    [FEEDBACK_ISSUE_TYPES.WRONG_FIELD]: 'Wrong Field',
    [FEEDBACK_ISSUE_TYPES.LOW_CONFIDENCE]: 'Low Confidence',
    [FEEDBACK_ISSUE_TYPES.MISSING_MAPPING]: 'Missing Mapping',
    [FEEDBACK_ISSUE_TYPES.OTHER]: 'Other Issue',
  };
  
  return displayNames[issueType as keyof typeof displayNames] || issueType;
}

/**
 * Helper function to get display name for Order field
 */
export function getOrderFieldDisplayName(field: string): string {
  const displayNames = {
    symbol: 'Stock Symbol',
    orderType: 'Order Type',
    side: 'Buy/Sell Side',
    timeInForce: 'Time in Force',
    orderQuantity: 'Quantity',
    limitPrice: 'Limit Price',
    stopPrice: 'Stop Price',
    orderStatus: 'Order Status',
    orderId: 'Order ID',
    parentOrderId: 'Parent Order ID',
    orderPlacedTime: 'Order Placed Time',
    orderExecutedTime: 'Order Executed Time',
    orderUpdatedTime: 'Order Updated Time',
    orderCancelledTime: 'Order Cancelled Time',
    accountId: 'Account ID',
    orderAccount: 'Account Name',
    orderRoute: 'Order Route',
    tags: 'Tags',
    tradeId: 'Trade ID',
    brokerMetadata: 'Broker Metadata',
  };
  
  return displayNames[field as keyof typeof displayNames] || field;
}

/**
 * Validation constants
 */
export const VALIDATION_LIMITS = {
  MAX_FEEDBACK_ITEMS: 100,
  MAX_CSV_HEADER_LENGTH: 255,
  MAX_COMMENT_LENGTH: 500,
  MAX_OVERALL_COMMENT_LENGTH: 1000,
  MAX_ADMIN_NOTES_LENGTH: 2000,
  MAX_BROKER_NAME_LENGTH: 100,
  MAX_ACCOUNT_TAGS: 10,
  MAX_ACCOUNT_TAG_LENGTH: 50,
} as const;