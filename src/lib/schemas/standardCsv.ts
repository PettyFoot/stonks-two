import { z } from 'zod';

// Standard CSV Schema Definition
export const StandardCsvRowSchema = z.object({
  Date: z.string().min(1, 'Date is required'),
  Time: z.string().optional(),
  Symbol: z.string().min(1, 'Symbol is required'),
  'Buy/Sell': z.enum(['BUY', 'SELL', 'BOT', 'SLD', 'B', 'S'], {
    message: 'Buy/Sell must be one of: BUY, SELL, BOT, SLD, B, S'
  }),
  Shares: z.string().min(1, 'Shares is required'),
  Price: z.string().optional(),
  Commission: z.string().optional(),
  Fees: z.string().optional(),
  Account: z.string().optional(),
});

export type StandardCsvRow = z.infer<typeof StandardCsvRowSchema>;

// Normalized trade data after parsing and validation
export const NormalizedTradeSchema = z.object({
  date: z.date(),
  time: z.string(),
  symbol: z.string().min(1),
  side: z.enum(['LONG', 'SHORT']),
  volume: z.number().positive(),
  price: z.number().optional(),
  commission: z.number().optional(),
  fees: z.number().optional(),
  account: z.string().optional(),
  pnl: z.number().default(0),
  notes: z.string().optional(),
  tags: z.array(z.string()).default(['imported']),
});

export type NormalizedTrade = z.infer<typeof NormalizedTradeSchema>;

// Standard CSV columns definition
export const STANDARD_CSV_COLUMNS = [
  'Date',
  'Time', 
  'Symbol',
  'Buy/Sell',
  'Shares',
  'Price',
  'Commission',
  'Fees',
  'Account'
] as const;

export const REQUIRED_COLUMNS = ['Date', 'Symbol', 'Buy/Sell', 'Shares'] as const;

// Side mapping for normalization
export const SIDE_MAPPING: Record<string, 'LONG' | 'SHORT'> = {
  'BUY': 'LONG',
  'SELL': 'SHORT',
  'BOT': 'LONG',
  'SLD': 'SHORT',
  'B': 'LONG',
  'S': 'SHORT',
  'LONG': 'LONG',
  'SHORT': 'SHORT',
};

// Date parsing utility
export function parseDate(dateStr: string): Date {
  // Try common date formats
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
  ];

  let date: Date;
  
  if (formats[0].test(dateStr)) {
    date = new Date(dateStr);
  } else if (formats[1].test(dateStr)) {
    const [month, day, year] = dateStr.split('/');
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  } else if (formats[2].test(dateStr)) {
    const [month, day, year] = dateStr.split('-');
    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  } else if (formats[3].test(dateStr)) {
    date = new Date(dateStr);
  } else {
    date = new Date(dateStr);
  }

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  return date;
}

// Number parsing utility
export function parseNumber(numStr: string | undefined): number | undefined {
  if (!numStr || numStr.trim() === '') return undefined;
  
  // Remove common currency symbols and commas
  const cleaned = numStr.replace(/[$,]/g, '').trim();
  const num = parseFloat(cleaned);
  
  if (isNaN(num)) return undefined;
  return num;
}

// Normalize standard CSV row to trade data
export function normalizeStandardCsvRow(row: StandardCsvRow, accountTags: string[] = []): NormalizedTrade {
  const date = parseDate(row.Date);
  const time = row.Time || '00:00:00';
  const symbol = row.Symbol.toUpperCase();
  const side = SIDE_MAPPING[row['Buy/Sell'].toUpperCase()];
  const volume = parseNumber(row.Shares);
  const price = parseNumber(row.Price);
  const commission = parseNumber(row.Commission);
  const fees = parseNumber(row.Fees);

  if (!side) {
    throw new Error(`Invalid Buy/Sell value: ${row['Buy/Sell']}`);
  }

  if (!volume || volume <= 0) {
    throw new Error(`Invalid Shares value: ${row.Shares}`);
  }

  return {
    date,
    time,
    symbol,
    side,
    volume,
    price,
    commission,
    fees,
    account: row.Account,
    pnl: 0, // Will be calculated if price is available
    notes: 'Imported from Standard CSV',
    tags: ['imported', 'standard-format', ...accountTags],
  };
}