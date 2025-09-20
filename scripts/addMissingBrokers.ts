#!/usr/bin/env tsx
/**
 * Script to add missing brokers and their aliases to the database
 * Run with: npx tsx scripts/addMissingBrokers.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Broker data with aliases
const brokersData = [
  {
    name: 'AJ Bell',
    website: 'https://www.ajbell.co.uk',
    aliases: ['AJ Bell', 'AJ Bell Youinvest', 'AJBell']
  },
  {
    name: 'Alpaca',
    website: 'https://alpaca.markets',
    aliases: ['Alpaca', 'Alpaca Markets', 'Alpaca Securities']
  },
  {
    name: 'Binance',
    website: 'https://www.binance.com',
    aliases: ['Binance', 'Binance US', 'Binance.com', 'Binance.US']
  },
  {
    name: 'Chase',
    website: 'https://www.chase.com',
    aliases: ['Chase', 'JPMorgan Chase', 'Chase Self Directed', 'Chase You Invest', 'JP Morgan Chase']
  },
  {
    name: 'Coinbase',
    website: 'https://www.coinbase.com',
    aliases: ['Coinbase', 'Coinbase Pro', 'Coinbase Advanced Trade', 'Coinbase Exchange']
  },
  {
    name: 'Degiro',
    website: 'https://www.degiro.com',
    aliases: ['Degiro', 'DEGIRO', 'DeGiro']
  },
  {
    name: 'E*Trade',
    website: 'https://www.etrade.com',
    aliases: ['E*Trade', 'E-Trade', 'ETRADE', 'eTrade', 'E*TRADE']
  },
  {
    name: 'Fidelity',
    website: 'https://www.fidelity.com',
    aliases: ['Fidelity', 'Fidelity Investments', 'Fidelity Brokerage']
  },
  {
    name: 'Kraken',
    website: 'https://www.kraken.com',
    aliases: ['Kraken', 'Kraken Exchange', 'Kraken Digital Asset Exchange']
  },
  {
    name: 'Public',
    website: 'https://public.com',
    aliases: ['Public', 'Public.com', 'Public Investing']
  },
  {
    name: 'Questrade',
    website: 'https://www.questrade.com',
    aliases: ['Questrade', 'Questrade Inc', 'Questrade OAuth']
  },
  {
    name: 'Robinhood',
    website: 'https://robinhood.com',
    aliases: ['Robinhood', 'Robinhood Markets', 'Robinhood Financial', 'RobinHood']
  },
  {
    name: 'Charles Schwab',
    website: 'https://www.schwab.com',
    aliases: ['Schwab', 'Charles Schwab', 'Charles Schwab & Co', 'Schwab OAuth', 'The Charles Schwab Corporation']
  },
  {
    name: 'Stake Australia',
    website: 'https://www.stake.com.au',
    aliases: ['Stake', 'Stake Australia', 'Stake.com.au']
  },
  {
    name: 'tastytrade',
    website: 'https://www.tastytrade.com',
    aliases: ['tastytrade', 'tastyworks', 'Tastytrade', 'TastyTrade']
  },
  {
    name: 'TD Direct Investing',
    website: 'https://www.td.com',
    aliases: ['TD Direct Investing', 'TD Ameritrade', 'TD Direct', 'TD Bank', 'TD']
  },
  {
    name: 'Tradier',
    website: 'https://www.tradier.com',
    aliases: ['Tradier', 'Tradier Brokerage']
  },
  {
    name: 'Trading212',
    website: 'https://www.trading212.com',
    aliases: ['Trading212', 'Trading 212', 'T212']
  },
  {
    name: 'Vanguard US',
    website: 'https://www.vanguard.com',
    aliases: ['Vanguard US', 'Vanguard', 'The Vanguard Group']
  },
  {
    name: 'Wealthsimple',
    website: 'https://www.wealthsimple.com',
    aliases: ['Wealthsimple', 'Wealthsimple Trade', 'WealthSimple']
  },
  {
    name: 'Webull US',
    website: 'https://www.webull.com',
    aliases: ['Webull US', 'Webull', 'Webull Corporation', 'Webull US OAuth', 'WeBull']
  },
  {
    name: 'Zerodha',
    website: 'https://zerodha.com',
    aliases: ['Zerodha', 'Zerodha Kite']
  },
  // Add existing brokers that might not be in the database
  {
    name: 'Interactive Brokers',
    website: 'https://www.interactivebrokers.com',
    aliases: ['Interactive Brokers', 'IBKR', 'IB', 'Interactive Brokers LLC']
  }
];

async function main() {
  console.log('Starting to add missing brokers and aliases...');

  let brokersCreated = 0;
  let aliasesCreated = 0;

  for (const brokerData of brokersData) {
    try {
      // Check if broker already exists
      let broker = await prisma.broker.findUnique({
        where: { name: brokerData.name }
      });

      if (!broker) {
        // Create new broker
        broker = await prisma.broker.create({
          data: {
            name: brokerData.name,
            website: brokerData.website
          }
        });
        brokersCreated++;
        console.log(`✓ Created broker: ${brokerData.name}`);
      } else {
        console.log(`• Broker already exists: ${brokerData.name}`);
      }

      // Add aliases for this broker
      for (const aliasName of brokerData.aliases) {
        try {
          // Check if alias already exists
          const existingAlias = await prisma.brokerAlias.findUnique({
            where: { alias: aliasName }
          });

          if (!existingAlias) {
            await prisma.brokerAlias.create({
              data: {
                brokerId: broker.id,
                alias: aliasName
              }
            });
            aliasesCreated++;
            console.log(`  ✓ Added alias: ${aliasName}`);
          } else {
            console.log(`  • Alias already exists: ${aliasName}`);
          }
        } catch (error) {
          console.warn(`  ! Failed to create alias "${aliasName}":`, error);
        }
      }

    } catch (error) {
      console.error(`✗ Failed to process broker "${brokerData.name}":`, error);
    }
  }

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`SUMMARY`);
  console.log(`═══════════════════════════════════════════`);
  console.log(`Brokers created: ${brokersCreated}`);
  console.log(`Aliases created: ${aliasesCreated}`);
  console.log(`═══════════════════════════════════════════`);

  // Verify the data was created correctly
  const totalBrokers = await prisma.broker.count();
  const totalAliases = await prisma.brokerAlias.count();

  console.log(`\nVerification:`);
  console.log(`Total brokers in database: ${totalBrokers}`);
  console.log(`Total aliases in database: ${totalAliases}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});