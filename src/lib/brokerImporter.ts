import Papa from 'papaparse';
import { prisma } from '@/lib/prisma';
import { BrokerType, TradeType } from '@prisma/client';

type CSVRow = Record<string, string | number | undefined>;

export interface ImportResult {
  success: boolean;
  importBatchId?: string;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}

export interface BrokerConfig {
  name: string;
  type: BrokerType;
  columns: {
    date: string;
    time?: string;
    symbol: string;
    side: string;
    quantity: string;
    price?: string;
    pnl?: string;
    commission?: string;
  };
  dateFormat?: string;
  sideMapping: {
    [key: string]: TradeType;
  };
}

// Broker configurations
export const brokerConfigs: Record<string, BrokerConfig> = {
  interactive_brokers: {
    name: 'Interactive Brokers',
    type: BrokerType.INTERACTIVE_BROKERS,
    columns: {
      date: 'Date',
      time: 'Time',
      symbol: 'Symbol',
      side: 'Buy/Sell',
      quantity: 'Quantity',
      price: 'Price',
      pnl: 'Realized P&L',
      commission: 'Commission'
    },
    sideMapping: {
      'BUY': TradeType.LONG,
      'SELL': TradeType.SHORT,
      'BOT': TradeType.LONG,
      'SLD': TradeType.SHORT
    }
  },
  td_ameritrade: {
    name: 'TD Ameritrade',
    type: BrokerType.TD_AMERITRADE,
    columns: {
      date: 'DATE',
      time: 'TIME',
      symbol: 'SYMBOL',
      side: 'SIDE',
      quantity: 'QTY',
      price: 'PRICE',
      pnl: 'NET AMT'
    },
    sideMapping: {
      'BUY': TradeType.LONG,
      'SELL': TradeType.SHORT,
      'B': TradeType.LONG,
      'S': TradeType.SHORT
    }
  },
  generic_csv: {
    name: 'Generic CSV',
    type: BrokerType.GENERIC_CSV,
    columns: {
      date: 'date',
      time: 'time',
      symbol: 'symbol',
      side: 'side',
      quantity: 'volume',
      pnl: 'pnl'
    },
    sideMapping: {
      'long': TradeType.LONG,
      'short': TradeType.SHORT,
      'buy': TradeType.LONG,
      'sell': TradeType.SHORT,
      'LONG': TradeType.LONG,
      'SHORT': TradeType.SHORT,
      'BUY': TradeType.LONG,
      'SELL': TradeType.SHORT
    }
  },
  trade_voyager: {
    name: 'Trade Voyager',
    type: BrokerType.GENERIC_CSV,
    columns: {
      date: 'time',
      symbol: 'symb',
      side: 'B/S',
      quantity: 'qty',
      price: 'price'
    },
    dateFormat: 'MM/DD/YY HH:mm:ss',
    sideMapping: {
      'B': TradeType.LONG,
      'S': TradeType.SHORT,
      'BUY': TradeType.LONG,
      'SELL': TradeType.SHORT
    }
  }
};

export class BrokerImporter {
  private userId: string;
  private config: BrokerConfig;

  constructor(userId: string, brokerType: string) {
    this.userId = userId;
    this.config = brokerConfigs[brokerType];
    if (!this.config) {
      throw new Error(`Unsupported broker type: ${brokerType}`);
    }
  }

  async importCsv(csvContent: string, filename: string, accountTags: string[] = []): Promise<ImportResult> {
    // Create import batch record
    const importBatch = await prisma.importBatch.create({
      data: {
        userId: this.userId,
        filename,
        brokerType: this.config.type,
        status: 'PROCESSING'
      }
    });

    const errors: string[] = [];
    let successCount = 0;
    let errorCount = 0;

    try {
      // Parse CSV
      const parseResult = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      });

      if (parseResult.errors.length > 0) {
        parseResult.errors.forEach(error => {
          errors.push(`CSV Parse Error: ${error.message} at row ${error.row}`);
        });
      }

      const totalRecords = parseResult.data.length;

      // Update total records
      await prisma.importBatch.update({
        where: { id: importBatch.id },
        data: { totalRecords }
      });

      // Process each row
      for (let i = 0; i < parseResult.data.length; i++) {
        const row = parseResult.data[i] as CSVRow;
        
        try {
          const trade = await this.parseTradeFromRow(row, i + 1, accountTags);
          
          await prisma.trade.create({
            data: {
              ...trade,
              userId: this.userId,
              importBatchId: importBatch.id
            }
          });
          
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Update import batch with final status
      await prisma.importBatch.update({
        where: { id: importBatch.id },
        data: {
          status: errorCount === 0 ? 'COMPLETED' : 'COMPLETED',
          successCount,
          errorCount,
          errors: errors.length > 0 ? errors : []
        }
      });

      // Recalculate day data after import
      await this.recalculateDayData();

      return {
        success: errorCount < totalRecords,
        importBatchId: importBatch.id,
        totalRecords,
        successCount,
        errorCount,
        errors
      };

    } catch (error) {
      // Mark import as failed
      await prisma.importBatch.update({
        where: { id: importBatch.id },
        data: {
          status: 'FAILED',
          errors: [`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        }
      });

      throw error;
    }
  }

  private async parseTradeFromRow(row: CSVRow, rowNumber: number, accountTags: string[] = []): Promise<{
    date: Date;
    time: string;
    symbol: string;
    side: TradeType;
    volume: number;
    executions: number;
    pnl: number;
    notes?: string;
    tags: string[];
  }> {
    const cols = this.config.columns;

    // Required fields
    const dateStr = row[cols.date];
    const symbol = row[cols.symbol];
    const sideStr = row[cols.side];
    const quantityStr = row[cols.quantity];

    if (!dateStr || !symbol || !sideStr || !quantityStr) {
      throw new Error(`Missing required fields: date=${dateStr}, symbol=${symbol}, side=${sideStr}, quantity=${quantityStr}`);
    }

    // Parse date
    let date: Date;
    try {
      // Handle Trade Voyager date format: "04/22/25 12:08:30"
      if (this.config.dateFormat === 'MM/DD/YY HH:mm:ss' && typeof dateStr === 'string') {
        const parts = String(dateStr).split(' ');
        if (parts.length === 2) {
          const datePart = parts[0];
          const timePart = parts[1];
          const dateSegments = datePart.split('/');
          
          if (dateSegments.length === 3) {
            let [month, day, year] = dateSegments;
            
            // Convert 2-digit year to 4-digit year
            if (year.length === 2) {
              const currentYear = new Date().getFullYear();
              const currentCentury = Math.floor(currentYear / 100) * 100;
              year = String(currentCentury + parseInt(year));
            }
            
            const fullDateTime = `${month}/${day}/${year} ${timePart}`;
            date = new Date(fullDateTime);
          } else {
            date = new Date(dateStr);
          }
        } else {
          date = new Date(dateStr);
        }
      } else {
        date = new Date(dateStr);
      }
      
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${dateStr}`);
      }
    } catch {
      throw new Error(`Invalid date format: ${dateStr}`);
    }

    // Parse time (optional)
    const timeStr = cols.time ? row[cols.time] : '';
    const time = String(timeStr || '00:00:00');

    // Parse side
    const side = this.config.sideMapping[String(sideStr).toUpperCase()];
    if (!side) {
      throw new Error(`Unknown side value: ${sideStr}`);
    }

    // Parse volume
    const volume = parseInt(String(quantityStr));
    if (isNaN(volume) || volume <= 0) {
      throw new Error(`Invalid quantity: ${quantityStr}`);
    }

    // Parse P&L (optional)
    let pnl = 0;
    if (cols.pnl && row[cols.pnl]) {
      pnl = parseFloat(String(row[cols.pnl]));
      if (isNaN(pnl)) {
        pnl = 0;
      }
    }

    return {
      date,
      time,
      symbol: String(symbol).toUpperCase(),
      side,
      volume,
      executions: 1, // Default to 1 execution per CSV row
      pnl,
      notes: `Imported from ${this.config.name}`,
      tags: ['imported', ...accountTags]
    };
  }

  private async recalculateDayData(): Promise<void> {
    // Get all trading days for this user
    const tradingDays = await prisma.trade.groupBy({
      by: ['date'],
      where: { userId: this.userId },
      _sum: {
        pnl: true,
        volume: true
      },
      _count: {
        id: true
      }
    });

    // Update or create day data records
    for (const day of tradingDays) {
      const date = day.date;
      const totalPnl = day._sum.pnl || 0;
      const totalVolume = day._sum.volume || 0;
      const totalTrades = day._count.id;

      // Calculate win rate for the day
      const dayTrades = await prisma.trade.findMany({
        where: {
          userId: this.userId,
          date: date
        }
      });

      const winningTrades = dayTrades.filter(trade => trade.pnl > 0).length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      // Upsert day data - need to use userId + date as compound key
      await prisma.dayData.upsert({
        where: {
          userId_date: {
            userId: this.userId,
            date: date
          }
        },
        update: {
          pnl: totalPnl,
          trades: totalTrades,
          volume: totalVolume,
          winRate: winRate
        },
        create: {
          userId: this.userId,
          date: date,
          pnl: totalPnl,
          trades: totalTrades,
          volume: totalVolume,
          winRate: winRate
        }
      });
    }
  }
}

export async function getImportHistory(userId: string) {
  return await prisma.importBatch.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
}