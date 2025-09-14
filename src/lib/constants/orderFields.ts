// Available Order table fields for CSV mapping
export const ORDER_FIELDS = [
  // Core identification fields
  {
    value: 'orderId',
    label: 'Order ID',
    description: 'Unique identifier for the order',
    category: 'Core',
    required: true
  },
  {
    value: 'parentOrderId',
    label: 'Parent Order ID',
    description: 'ID of parent order (for bracket orders)',
    category: 'Core',
    required: false
  },

  // Symbol and instrument
  {
    value: 'symbol',
    label: 'Symbol',
    description: 'Trading symbol/ticker',
    category: 'Instrument',
    required: true
  },

  // Order specifications
  {
    value: 'orderType',
    label: 'Order Type',
    description: 'Type of order (MARKET, LIMIT, STOP, etc.)',
    category: 'Order Specs',
    required: true
  },
  {
    value: 'side',
    label: 'Side',
    description: 'Buy or Sell side',
    category: 'Order Specs',
    required: true
  },
  {
    value: 'timeInForce',
    label: 'Time in Force',
    description: 'Order duration (DAY, GTC, IOC, etc.)',
    category: 'Order Specs',
    required: true
  },

  // Quantities and prices
  {
    value: 'orderQuantity',
    label: 'Order Quantity',
    description: 'Number of shares/contracts',
    category: 'Quantity',
    required: true
  },
  {
    value: 'limitPrice',
    label: 'Limit Price',
    description: 'Limit price for limit orders',
    category: 'Price',
    required: false
  },
  {
    value: 'stopPrice',
    label: 'Stop Price',
    description: 'Stop price for stop orders',
    category: 'Price',
    required: false
  },

  // Order status and timing
  {
    value: 'orderStatus',
    label: 'Order Status',
    description: 'Current status (PENDING, FILLED, CANCELLED, etc.)',
    category: 'Status',
    required: true
  },
  {
    value: 'orderPlacedTime',
    label: 'Order Placed Time',
    description: 'When the order was placed',
    category: 'Timing',
    required: true
  },
  {
    value: 'orderExecutedTime',
    label: 'Order Executed Time',
    description: 'When the order was executed',
    category: 'Timing',
    required: false
  },
  {
    value: 'orderUpdatedTime',
    label: 'Order Updated Time',
    description: 'When the order was last updated',
    category: 'Timing',
    required: false
  },
  {
    value: 'orderCancelledTime',
    label: 'Order Cancelled Time',
    description: 'When the order was cancelled',
    category: 'Timing',
    required: false
  },

  // Account and routing
  {
    value: 'accountId',
    label: 'Account ID',
    description: 'Account identifier',
    category: 'Account',
    required: false
  },
  {
    value: 'orderAccount',
    label: 'Order Account',
    description: 'Account used for the order',
    category: 'Account',
    required: false
  },
  {
    value: 'orderRoute',
    label: 'Order Route',
    description: 'Routing destination for the order',
    category: 'Routing',
    required: false
  },

  // Costs and fees
  {
    value: 'commission',
    label: 'Commission',
    description: 'Commission charged for the order',
    category: 'Costs',
    required: false
  },
  {
    value: 'fees',
    label: 'Fees',
    description: 'Additional fees charged',
    category: 'Costs',
    required: false
  },

  // Metadata and tags
  {
    value: 'tags',
    label: 'Tags',
    description: 'User-defined tags for the order',
    category: 'Metadata',
    required: false
  },

  // Trading integration
  {
    value: 'tradeId',
    label: 'Trade ID',
    description: 'Associated trade identifier',
    category: 'Trading',
    required: false
  },
  {
    value: 'usedInTrade',
    label: 'Used in Trade',
    description: 'Whether order is part of a trade',
    category: 'Trading',
    required: false
  },

  // Import tracking
  {
    value: 'importBatchId',
    label: 'Import Batch ID',
    description: 'ID of the import batch',
    category: 'Import',
    required: false
  },
  {
    value: 'activityHash',
    label: 'Activity Hash',
    description: 'Hash for duplicate detection',
    category: 'Import',
    required: false
  },
  {
    value: 'importSequence',
    label: 'Import Sequence',
    description: 'Order sequence in import',
    category: 'Import',
    required: false
  },

  // Special fields
  {
    value: 'brokerMetadata',
    label: 'Broker Metadata',
    description: 'Store as broker-specific metadata (not mapped)',
    category: 'Special',
    required: false
  }
];

// Group fields by category for easier UI organization
export const ORDER_FIELDS_BY_CATEGORY = ORDER_FIELDS.reduce((acc, field) => {
  if (!acc[field.category]) {
    acc[field.category] = [];
  }
  acc[field.category].push(field);
  return acc;
}, {} as Record<string, Array<typeof ORDER_FIELDS[number]>>);

// Get just the field values for dropdowns
export const ORDER_FIELD_VALUES = ORDER_FIELDS.map(field => field.value);

// Get required fields
export const REQUIRED_ORDER_FIELDS = ORDER_FIELDS.filter(field => field.required).map(field => field.value);

// Helper function to get field info by value
export function getOrderFieldInfo(value: string) {
  return ORDER_FIELDS.find(field => field.value === value);
}

// Helper function to format field label with description
export function formatFieldLabel(value: string): string {
  const field = getOrderFieldInfo(value);
  if (!field) return value;
  return `${field.label}${field.description ? ` - ${field.description}` : ''}`;
}