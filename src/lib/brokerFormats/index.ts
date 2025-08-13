// Top 5 Most Popular Broker CSV Export Formats

export interface BrokerFormat {
  id: string;
  name: string;
  description: string;
  popularity: number; // 1-5 ranking
  columns: {
    [key: string]: {
      header: string;
      required: boolean;
      description: string;
      example: string;
    };
  };
  sampleData: string;
  downloadUrl?: string;
}

export const TOP_BROKER_FORMATS: BrokerFormat[] = [
  {
    id: 'interactive_brokers',
    name: 'Interactive Brokers',
    description: 'IBKR Flex Query or Activity Statement export',
    popularity: 1,
    columns: {
      date: { header: 'Date', required: true, description: 'Trade execution date', example: '2025-01-15' },
      time: { header: 'Time', required: false, description: 'Execution time', example: '09:30:00' },
      symbol: { header: 'Symbol', required: true, description: 'Stock ticker', example: 'AAPL' },
      side: { header: 'Buy/Sell', required: true, description: 'Trade direction', example: 'BOT' },
      quantity: { header: 'Quantity', required: true, description: 'Number of shares', example: '100' },
      price: { header: 'T. Price', required: false, description: 'Trade price', example: '150.25' },
      commission: { header: 'Comm/Fee', required: false, description: 'Commission and fees', example: '1.00' },
      realizedPnL: { header: 'Realized P&L', required: false, description: 'Realized profit/loss', example: '125.50' },
      account: { header: 'Account', required: false, description: 'Account number', example: 'U1234567' }
    },
    sampleData: `Date,Time,Symbol,Buy/Sell,Quantity,T. Price,Comm/Fee,Realized P&L,Account
2025-01-15,09:30:00,AAPL,BOT,100,150.25,1.00,0,U1234567
2025-01-15,10:15:00,AAPL,SLD,100,151.75,1.00,125.50,U1234567`
  },
  {
    id: 'td_ameritrade',
    name: 'TD Ameritrade / Charles Schwab',
    description: 'TDA/Schwab transaction export after merger',
    popularity: 2,
    columns: {
      date: { header: 'DATE', required: true, description: 'Trade date', example: '01/15/2025' },
      time: { header: 'TIME', required: false, description: 'Trade time', example: '09:30:00 AM' },
      symbol: { header: 'SYMBOL', required: true, description: 'Stock symbol', example: 'AAPL' },
      side: { header: 'SIDE', required: true, description: 'Buy or Sell', example: 'BUY' },
      quantity: { header: 'QTY', required: true, description: 'Quantity', example: '100' },
      price: { header: 'PRICE', required: false, description: 'Execution price', example: '$150.25' },
      amount: { header: 'NET AMT', required: false, description: 'Net amount', example: '-$15,026.00' },
      fees: { header: 'FEES', required: false, description: 'Commission and fees', example: '$1.00' },
      account: { header: 'ACCOUNT', required: false, description: 'Account number', example: '123456789' }
    },
    sampleData: `DATE,TIME,SYMBOL,SIDE,QTY,PRICE,NET AMT,FEES,ACCOUNT
01/15/2025,09:30:00 AM,AAPL,BUY,100,$150.25,-$15026.00,$1.00,123456789
01/15/2025,10:15:00 AM,AAPL,SELL,100,$151.75,$15173.00,$1.00,123456789`
  },
  {
    id: 'etrade',
    name: 'E*TRADE',
    description: 'E*TRADE transaction history export',
    popularity: 3,
    columns: {
      date: { header: 'TransactionDate', required: true, description: 'Transaction date', example: '01/15/2025' },
      time: { header: 'TransactionTime', required: false, description: 'Transaction time', example: '9:30:00 AM' },
      symbol: { header: 'Symbol', required: true, description: 'Security symbol', example: 'AAPL' },
      side: { header: 'Action', required: true, description: 'Buy or Sell action', example: 'Buy' },
      quantity: { header: 'Quantity', required: true, description: 'Share quantity', example: '100' },
      price: { header: 'Price', required: false, description: 'Price per share', example: '150.25' },
      amount: { header: 'Amount', required: false, description: 'Total amount', example: '15025.00' },
      commission: { header: 'Commission', required: false, description: 'Commission paid', example: '0.00' },
      account: { header: 'AccountNumber', required: false, description: 'Account number', example: '12345-6789' }
    },
    sampleData: `TransactionDate,TransactionTime,Symbol,Action,Quantity,Price,Amount,Commission,AccountNumber
01/15/2025,9:30:00 AM,AAPL,Buy,100,150.25,15025.00,0.00,12345-6789
01/15/2025,10:15:00 AM,AAPL,Sell,100,151.75,15175.00,0.00,12345-6789`
  },
  {
    id: 'fidelity',
    name: 'Fidelity',
    description: 'Fidelity Portfolio Positions or History export',
    popularity: 4,
    columns: {
      date: { header: 'Run Date', required: true, description: 'Trade run date', example: '01/15/2025' },
      symbol: { header: 'Symbol', required: true, description: 'Security symbol', example: 'AAPL' },
      side: { header: 'Action', required: true, description: 'Transaction action', example: 'YOU BOUGHT' },
      quantity: { header: 'Quantity', required: true, description: 'Number of shares', example: '100' },
      price: { header: 'Price', required: false, description: 'Price per share', example: '$150.25' },
      amount: { header: 'Amount', required: false, description: 'Total value', example: '$15,025.00' },
      fees: { header: 'Fees', required: false, description: 'Transaction fees', example: '$0.00' },
      account: { header: 'Account Number', required: false, description: 'Account identifier', example: 'X12345678' }
    },
    sampleData: `Run Date,Symbol,Action,Quantity,Price,Amount,Fees,Account Number
01/15/2025,AAPL,YOU BOUGHT,100,$150.25,$15025.00,$0.00,X12345678
01/15/2025,AAPL,YOU SOLD,100,$151.75,$15175.00,$0.00,X12345678`
  },
  {
    id: 'robinhood',
    name: 'Robinhood',
    description: 'Robinhood account statements export',
    popularity: 5,
    columns: {
      date: { header: 'Date', required: true, description: 'Settlement date', example: '2025-01-15' },
      symbol: { header: 'Instrument', required: true, description: 'Stock instrument', example: 'Apple Inc. - AAPL' },
      side: { header: 'Trans Code', required: true, description: 'Transaction code', example: 'Buy' },
      quantity: { header: 'Quantity', required: true, description: 'Share count', example: '100.00' },
      price: { header: 'Price', required: false, description: 'Share price', example: '150.25' },
      amount: { header: 'Amount', required: false, description: 'Dollar amount', example: '15025.00' },
      fees: { header: 'Fees', required: false, description: 'Total fees', example: '0.00' },
      description: { header: 'Description', required: false, description: 'Transaction description', example: 'AAPL' }
    },
    sampleData: `Date,Instrument,Trans Code,Quantity,Price,Amount,Fees,Description
2025-01-15,Apple Inc. - AAPL,Buy,100.00,150.25,15025.00,0.00,AAPL
2025-01-15,Apple Inc. - AAPL,Sell,100.00,151.75,15175.00,0.00,AAPL`
  }
];

export function getBrokerFormat(brokerId: string): BrokerFormat | undefined {
  return TOP_BROKER_FORMATS.find(broker => broker.id === brokerId);
}

export function generateBrokerTemplate(brokerId: string): string {
  const broker = getBrokerFormat(brokerId);
  if (!broker) return '';
  
  return broker.sampleData;
}

export function getBrokersByPopularity(): BrokerFormat[] {
  return TOP_BROKER_FORMATS.sort((a, b) => a.popularity - b.popularity);
}