import { PrismaClient } from '@prisma/client';
import { getDemoUserId } from '../src/lib/demo/demoSession';

const prisma = new PrismaClient();

// Common stock symbols for demo data
const SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY',
  'QQQ', 'AMD', 'NFLX', 'DIS', 'BA', 'JPM', 'GS', 'XOM', 'WMT',
  'V', 'MA', 'PG', 'JNJ', 'UNH', 'HD', 'COST', 'INTC', 'CRM'
];

// Generate random price between min and max
function randomPrice(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// Generate random quantity between min and max
function randomQuantity(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate random date within last 6 months
function randomDate(daysBack: number = 180): Date {
  const now = new Date();
  const pastDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
  const randomTime = pastDate.getTime() + (Math.random() * (now.getTime() - pastDate.getTime()));
  return new Date(randomTime);
}

// Generate realistic trade scenarios
function generateTradeScenarios() {
  const scenarios = [];
  
  // Winning day trader - quick profitable trades
  for (let i = 0; i < 25; i++) {
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const entryPrice = randomPrice(50, 300);
    const exitPrice = entryPrice * (1 + (Math.random() * 0.06 - 0.01)); // -1% to +5% range, biased positive
    const quantity = randomQuantity(10, 200);
    const entryDate = randomDate(90);
    const exitDate = new Date(entryDate.getTime() + Math.random() * 8 * 60 * 60 * 1000); // Exit within 8 hours
    
    scenarios.push({
      symbol,
      side: 'LONG' as const,
      status: 'CLOSED' as const,
      entryDate,
      exitDate,
      entryPrice,
      exitPrice,
      quantity,
      pnl: (exitPrice - entryPrice) * quantity - randomPrice(0.5, 2.0), // subtract commission
      commission: randomPrice(0.5, 2.0),
      holdingPeriod: 'INTRADAY' as const,
      tags: ['scalp', 'day-trade'],
      notes: `Quick ${exitPrice > entryPrice ? 'profit' : 'loss'} on ${symbol}`
    });
  }
  
  // Swing trades - longer holding periods
  for (let i = 0; i < 20; i++) {
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const entryPrice = randomPrice(30, 400);
    const exitPrice = entryPrice * (1 + (Math.random() * 0.30 - 0.10)); // -10% to +20% range
    const quantity = randomQuantity(50, 500);
    const entryDate = randomDate(120);
    const exitDate = new Date(entryDate.getTime() + (Math.random() * 14 + 1) * 24 * 60 * 60 * 1000); // 1-14 days
    
    scenarios.push({
      symbol,
      side: Math.random() > 0.8 ? 'SHORT' : 'LONG',
      status: 'CLOSED' as const,
      entryDate,
      exitDate,
      entryPrice,
      exitPrice,
      quantity,
      pnl: (exitPrice - entryPrice) * quantity * (Math.random() > 0.8 ? -1 : 1) - randomPrice(1.0, 5.0),
      commission: randomPrice(1.0, 5.0),
      holdingPeriod: 'SWING' as const,
      tags: ['swing-trade', exitPrice > entryPrice ? 'winner' : 'loser'],
      notes: `${Math.abs(((exitPrice - entryPrice) / entryPrice * 100)).toFixed(1)}% ${exitPrice > entryPrice ? 'gain' : 'loss'} swing trade`
    });
  }
  
  // Open positions - current holdings
  for (let i = 0; i < 15; i++) {
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const entryPrice = randomPrice(40, 350);
    const quantity = randomQuantity(25, 300);
    const entryDate = randomDate(60);
    
    scenarios.push({
      symbol,
      side: Math.random() > 0.9 ? 'SHORT' : 'LONG',
      status: 'OPEN' as const,
      entryDate,
      exitDate: null,
      entryPrice,
      exitPrice: null,
      quantity,
      openQuantity: quantity,
      pnl: 0,
      commission: randomPrice(0.5, 3.0),
      holdingPeriod: entryDate < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) ? 'POSITION' : 'SWING' as const,
      tags: ['open-position', 'current'],
      notes: `Currently holding ${quantity} shares of ${symbol}`
    });
  }
  
  // Some losing trades to make it realistic
  for (let i = 0; i < 12; i++) {
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const entryPrice = randomPrice(60, 280);
    const exitPrice = entryPrice * (0.85 + Math.random() * 0.10); // 5-15% loss
    const quantity = randomQuantity(20, 150);
    const entryDate = randomDate(150);
    const exitDate = new Date(entryDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000); // Exit within 5 days
    
    scenarios.push({
      symbol,
      side: 'LONG' as const,
      status: 'CLOSED' as const,
      entryDate,
      exitDate,
      entryPrice,
      exitPrice,
      quantity,
      pnl: (exitPrice - entryPrice) * quantity - randomPrice(1.0, 3.0), // subtract commission
      commission: randomPrice(1.0, 3.0),
      holdingPeriod: 'SWING' as const,
      tags: ['loss', 'learning'],
      notes: `Stopped out at ${((1 - exitPrice / entryPrice) * 100).toFixed(1)}% loss`
    });
  }
  
  // Options trades
  for (let i = 0; i < 8; i++) {
    const symbol = SYMBOLS[Math.floor(Math.random() * 10)]; // Popular stocks for options
    const entryPrice = randomPrice(1, 15); // Option premium
    const exitPrice = entryPrice * (0.5 + Math.random() * 2); // Can lose 50% or gain 100%
    const quantity = randomQuantity(1, 10); // Contracts
    const entryDate = randomDate(60);
    const exitDate = new Date(entryDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000); // Within 30 days
    
    scenarios.push({
      symbol: `${symbol} Options`,
      side: 'LONG' as const,
      status: 'CLOSED' as const,
      assetClass: 'OPTIONS' as const,
      entryDate,
      exitDate,
      entryPrice,
      exitPrice,
      quantity,
      pnl: (exitPrice - entryPrice) * quantity * 100 - randomPrice(0.5, 1.5), // 100 shares per contract
      commission: randomPrice(0.5, 1.5),
      holdingPeriod: 'SWING' as const,
      tags: ['options', exitPrice > entryPrice ? 'profitable' : 'loss'],
      notes: `Options trade on ${symbol.replace(' Options', '')}`
    });
  }
  
  return scenarios;
}

async function createDemoUser() {
  const demoUserId = getDemoUserId();
  
  // Check if demo user already exists
  const existingUser = await prisma.user.findUnique({
    where: { id: demoUserId }
  });
  
  if (existingUser) {
    console.log('Demo user already exists, updating...');
    return existingUser;
  }
  
  // Create demo user
  const demoUser = await prisma.user.create({
    data: {
      id: demoUserId,
      email: 'demo@tradevoyager.com',
      auth0Id: 'demo|readonly-001',
      name: 'Demo Trader',
    }
  });
  
  console.log('Created demo user:', demoUser.email);
  return demoUser;
}

async function seedTrades(userId: string) {
  // Clear existing demo trades
  await prisma.trade.deleteMany({
    where: { userId }
  });
  
  console.log('Cleared existing demo trades');
  
  // Generate and create new demo trades
  const scenarios = generateTradeScenarios();
  
  for (const scenario of scenarios) {
    await prisma.trade.create({
      data: {
        userId,
        symbol: scenario.symbol,
        assetClass: scenario.assetClass || 'EQUITY',
        side: scenario.side,
        status: scenario.status,
        date: scenario.entryDate,
        entryDate: scenario.entryDate,
        exitDate: scenario.exitDate,
        entryPrice: scenario.entryPrice,
        exitPrice: scenario.exitPrice,
        quantity: scenario.quantity,
        openQuantity: scenario.openQuantity,
        pnl: scenario.pnl,
        commission: scenario.commission || 0,
        holdingPeriod: scenario.holdingPeriod as any,
        orderType: 'MARKET',
        timeInForce: 'DAY',
        marketSession: 'REGULAR',
        tradeSource: 'IMPORTED',
        tags: scenario.tags || [],
        notes: scenario.notes,
        executions: 1,
        createdAt: scenario.entryDate,
        updatedAt: scenario.exitDate || scenario.entryDate,
      }
    });
  }
  
  console.log(`Created ${scenarios.length} demo trades`);
}

async function createDemoRecords(userId: string) {
  // Create some daily trading records
  const recordEntries = [
    {
      date: randomDate(7),
      pnl: randomPrice(150, 800),
      totalTrades: randomQuantity(3, 8),
      totalVolume: randomQuantity(200, 1000),
      winRate: 0.75,
      notes: "Great trading day! Caught the momentum on AAPL and rode it for a nice profit. Need to remember to stick to my position sizing rules."
    },
    {
      date: randomDate(14),
      pnl: randomPrice(-200, -50),
      totalTrades: randomQuantity(2, 5),
      totalVolume: randomQuantity(150, 400),
      winRate: 0.40,
      notes: "Stopped out too early on TSLA. Should have given it more room to breathe. Market was choppy today."
    },
    {
      date: randomDate(21),
      pnl: randomPrice(300, 600),
      totalTrades: randomQuantity(4, 6),
      totalVolume: randomQuantity(300, 700),
      winRate: 0.83,
      notes: "Working on patience. Waited for my setup on SPY and it paid off. Discipline is key."
    },
    {
      date: randomDate(30),
      pnl: randomPrice(100, 400),
      totalTrades: randomQuantity(5, 10),
      totalVolume: randomQuantity(400, 900),
      winRate: 0.60,
      notes: "Review: This week focused on tech stocks. NVDA and AMD both performed well. Need to diversify more."
    },
    {
      date: randomDate(45),
      pnl: randomPrice(-100, 250),
      totalTrades: randomQuantity(3, 7),
      totalVolume: randomQuantity(200, 600),
      winRate: 0.57,
      notes: "Market volatility creating good opportunities. Keeping position sizes smaller to manage risk."
    }
  ];
  
  for (const entry of recordEntries) {
    await prisma.recordsEntry.create({
      data: {
        userId,
        date: entry.date,
        pnl: entry.pnl,
        totalTrades: entry.totalTrades,
        totalVolume: entry.totalVolume,
        winRate: entry.winRate,
        notes: entry.notes,
        createdAt: entry.date,
        updatedAt: entry.date,
      }
    });
  }
  
  console.log(`Created ${recordEntries.length} demo record entries`);
}

async function main() {
  console.log('Starting demo data seeding...');
  
  try {
    // Create demo user
    const demoUser = await createDemoUser();
    
    // Seed trades
    await seedTrades(demoUser.id);
    
    // Create journal entries
    await createDemoRecords(demoUser.id);
    
    console.log('Demo data seeding completed successfully!');
    console.log('\nDemo data summary:');
    console.log(`- User: ${demoUser.email}`);
    
    const tradeCount = await prisma.trade.count({ where: { userId: demoUser.id } });
    const openTrades = await prisma.trade.count({ 
      where: { userId: demoUser.id, status: 'OPEN' } 
    });
    const closedTrades = await prisma.trade.count({ 
      where: { userId: demoUser.id, status: 'CLOSED' } 
    });
    const recordEntries = await prisma.recordsEntry.count({ 
      where: { userId: demoUser.id } 
    });
    
    console.log(`- Total trades: ${tradeCount}`);
    console.log(`- Open positions: ${openTrades}`);
    console.log(`- Closed trades: ${closedTrades}`);
    console.log(`- Record entries: ${recordEntries}`);
    
    // Calculate total P&L
    const totalPnl = await prisma.trade.aggregate({
      where: { userId: demoUser.id, status: 'CLOSED' },
      _sum: { pnl: true }
    });
    
    console.log(`- Total realized P&L: $${totalPnl._sum.pnl?.toFixed(2) || '0.00'}`);
    
  } catch (error) {
    console.error('Error seeding demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as seedDemoData };