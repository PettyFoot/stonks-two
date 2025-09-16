// Application-wide constants

// Error Messages
export const ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Authentication required',
  INVALID_REQUEST: 'Invalid request',
  INVALID_QUERY_PARAMETERS: 'Invalid query parameters',
  INVALID_TRADE_DATA: 'Invalid trade data',
  INVALID_RECORDS_DATA: 'Invalid records data',
  INVALID_USER_STATE: 'Invalid user state',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  FAILED_TO_FETCH_TRADES: 'Failed to fetch trades',
  FAILED_TO_CREATE_RECORDS: 'Failed to create records entry',
  DATE_REQUIRED: 'Date parameter is required',
  TRADE_NOT_FOUND: 'Trade not found',
  SYMBOL_REQUIRED: 'Symbol is required',
  USER_NOT_FOUND: 'User not found'
} as const;

// Pagination Constants
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
  DEFAULT_SORT_ORDER: 'desc',
  DEFAULT_SORT_BY: 'date'
} as const;

// Time Constants (in milliseconds)
export const TIME_INTERVALS = {
  MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  TEN_MINUTES: 10 * 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000
} as const;

// String Limits
export const STRING_LIMITS = {
  SYMBOL_MAX_LENGTH: 20,
  NOTES_MAX_LENGTH: 1000,
  RECORDS_NOTES_MAX_LENGTH: 5000,
  TAG_MAX_LENGTH: 50,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500
} as const;

// Number Limits
export const NUMBER_LIMITS = {
  EXECUTIONS_DEFAULT: 1,
  PNL_DEFAULT: 0,
  QUANTITY_MIN: 1,
  PERCENTAGE_MIN: 0,
  PERCENTAGE_MAX: 100
} as const;

// Currency Constants
export const CURRENCY = {
  DEFAULT: 'usd',
  USD: 'USD',
  SYMBOL: '$'
} as const;

// Default Values
export const DEFAULTS = {
  TRADE_SIDE: 'long',
  MARKET_SESSION: 'REGULAR',
  ORDER_TYPE: 'MARKET',
  TIME_IN_FORCE: 'DAY',
  HOLDING_PERIOD: 'INTRADAY',
  ASSET_CLASS: 'EQUITY',
  TRADE_STATUS: 'CLOSED',
  TIME_DISPLAY: '00:00'
} as const;

// Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

// Date Formats
export const DATE_FORMATS = {
  API_DATE: 'YYYY-MM-DD',
  DISPLAY_DATE: {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  },
  TIME_FORMAT: {
    hour: '2-digit',
    minute: '2-digit'
  }
} as const;

export type ErrorMessage = typeof ERROR_MESSAGES[keyof typeof ERROR_MESSAGES];
export type DefaultValue = typeof DEFAULTS[keyof typeof DEFAULTS];
export type TimeInterval = typeof TIME_INTERVALS[keyof typeof TIME_INTERVALS];