# Trade Voyager - Comprehensive Project Documentation

> **Master technical reference for the Trade Voyager platform**

**Related Documentation:**
- [🚀 Quick Start Guide](./README.md) - Get up and running quickly
- [🎯 Marketing & Pitches](./PITCH_AND_MARKETING.md) - Elevator pitches and marketing copy
- [👥 User Flows](./USER_FLOWS.md) - Authentication states and user journeys  
- [📤 CSV Import System](./docs/CSV_IMPORT_SYSTEM.md) - Detailed import functionality

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [API Documentation](#api-documentation)
5. [Business Logic & Calculations](#business-logic--calculations)
6. [Frontend Architecture](#frontend-architecture)
7. [Authentication & Security](#authentication--security)
8. [Data Import System](#data-import-system)
9. [Development Guide](#development-guide)
10. [Troubleshooting](#troubleshooting)

---

## Executive Summary

### What is Trade Voyager?
Trade Voyager is a professional-grade trading analytics platform that transforms broker statements into actionable insights. It helps traders understand their performance patterns, identify profitable strategies, and eliminate unprofitable behaviors.

### Core Problem Solved
90% of traders fail because they don't track and analyze their performance data effectively. Most traders rely on mental accounting or basic spreadsheets, missing critical patterns that impact profitability like:
- Time-based performance variations (day of week, hour of day)
- Position sizing inefficiencies
- Revenge trading behaviors
- Setup effectiveness analysis

### Key Value Propositions
- **Instant Analytics**: Upload CSV → Get professional insights immediately
- **Pattern Recognition**: Discover hidden performance patterns automatically
- **Multi-Broker Support**: Works with all major brokers (IB, TD Ameritrade, E*TRADE, etc.)
- **Professional Tools**: Bloomberg Terminal-quality analytics for retail traders
- **Free Access**: No subscription fees during beta phase

### Target Users
- **Primary**: Active day traders and swing traders
- **Secondary**: Investment clubs, trading mentors, portfolio managers
- **Tertiary**: Anyone wanting to track trading performance scientifically

---

## System Architecture

### Tech Stack Overview

#### Frontend Stack
- **Next.js 15** with App Router - Server/client components, file-based routing
- **TypeScript** - Full type safety across codebase
- **TailwindCSS v4** - Utility-first styling with custom design system
- **shadcn/ui** - Accessible, customizable component library
- **Recharts** - Interactive data visualizations
- **Auth0 React SDK** - Authentication and user management

#### Backend Stack
- **Next.js API Routes** - RESTful API with user authentication
- **PostgreSQL** - Primary database (AWS RDS compatible)
- **Prisma ORM** - Type-safe database queries and migrations
- **Papa Parse** - CSV processing and validation
- **Zod** - Runtime type validation and schema parsing

#### Infrastructure
- **AWS RDS PostgreSQL** - Production database
- **Vercel/AWS** - Hosting and deployment
- **Auth0** - Authentication service
- **Redis (Upstash)** - Caching layer for performance

### Application Structure

```
src/
├── app/                    # Next.js 15 App Router
│   ├── (with-sidebar)/     # Layout group for authenticated pages
│   │   ├── dashboard/      # Main dashboard
│   │   ├── trades/         # Trade management
│   │   ├── reports/        # Analytics reports
│   │   ├── journal/        # Trading journal
│   │   ├── calendar/       # Calendar view
│   │   ├── search/         # Search functionality
│   │   ├── import/         # CSV import interface
│   │   └── new-trade/      # Manual trade entry
│   ├── demo/              # Demo mode (unauthenticated)
│   ├── api/               # API routes with authentication
│   ├── login/             # Authentication pages
│   └── onboarding/        # User onboarding flow
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui base components
│   ├── charts/           # Chart components (Recharts)
│   ├── csv/              # CSV import components
│   ├── reports/          # Report-specific components
│   └── analytics/        # Analytics dashboard components
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries and services
│   ├── ai/              # AI-powered CSV mapping
│   ├── auth/            # Authentication helpers
│   ├── services/        # Business logic services
│   ├── repositories/    # Data access layer
│   └── schemas/         # Validation schemas
├── types/               # TypeScript type definitions
├── data/                # Mock data for demo mode
└── constants/           # Application constants
```

### Key Design Patterns

#### 1. Server/Client Component Pattern
- Server Components for data fetching and static content
- Client Components for interactivity and state management
- Clear separation reduces bundle size and improves performance

#### 2. Repository Pattern
- Data access abstracted through repository classes
- Clean separation between business logic and data layer
- Easy testing and mock data integration

#### 3. Service Layer Pattern
- Business logic encapsulated in service classes
- Reusable across different components and API routes
- Centralized calculation and analytics logic

#### 4. Hook-Based State Management
- Custom hooks for data fetching and caching
- Context providers for global state (filters, user data)
- Automatic re-fetching and cache invalidation

---

## Database Schema

### Core Models

#### User Model
```typescript
model User {
  id: String @id @default(cuid())
  email: String @unique
  auth0Id: String @unique
  name: String?
  createdAt: DateTime @default(now())
  updatedAt: DateTime @updatedAt
}
```

**Purpose**: Stores user authentication and profile data
**Relationships**: One-to-many with all user data (trades, orders, journal entries)

#### Trade Model (Core Entity)
```typescript
model Trade {
  // Identity
  id: String @id @default(cuid())
  userId: String
  symbol: String
  
  // Trade Details
  side: TradeSide // LONG/SHORT
  entryDate: DateTime
  exitDate: DateTime?
  quantity: Int?
  
  // Pricing
  entryPrice: Decimal? @db.Decimal(10,2)
  exitPrice: Decimal? @db.Decimal(10,2)
  avgEntryPrice: Decimal?
  avgExitPrice: Decimal?
  
  // Performance
  pnl: Decimal @default(0) @db.Decimal(10,2)
  commission: Decimal? @db.Decimal(10,2)
  fees: Decimal? @db.Decimal(10,2)
  
  // Metadata
  status: TradeStatus @default(OPEN)
  executions: Int @default(1)
  notes: String?
  tags: String[]
}
```

**Purpose**: Core trading data with complete trade lifecycle
**Key Features**:
- Supports both open and closed positions
- Tracks entry/exit prices and dates
- Calculates P&L automatically
- User-defined tags and notes

#### Order Model (Execution Level)
```typescript
model Order {
  id: String @id @default(cuid())
  userId: String
  orderId: String // External broker order ID
  symbol: String
  orderType: OrderType
  side: OrderSide // BUY/SELL
  orderQuantity: Int
  limitPrice: Decimal? @db.Decimal(10,2)
  stopPrice: Decimal? @db.Decimal(10,2)
  orderStatus: OrderStatus
  orderPlacedTime: DateTime
  orderExecutedTime: DateTime?
  brokerType: BrokerType
}
```

**Purpose**: Individual order executions for detailed analysis
**Use Cases**:
- Partial fill tracking
- Order routing analysis
- Execution quality metrics

#### ImportBatch Model (Data Management)
```typescript
model ImportBatch {
  id: String @id @default(cuid())
  userId: String
  filename: String
  brokerType: BrokerType
  importType: ImportType // STANDARD/CUSTOM
  status: ImportStatus
  totalRecords: Int
  successCount: Int
  errorCount: Int
  
  // AI Features
  aiMappingUsed: Boolean @default(false)
  mappingConfidence: Float?
  columnMappings: Json?
  userReviewRequired: Boolean @default(false)
}
```

**Purpose**: Tracks CSV import operations and AI mapping decisions
**Features**:
- Audit trail for all imports
- AI mapping confidence scoring
- Error tracking and debugging

### Key Enums and Types

#### Trade-Related Enums
```typescript
enum TradeSide { LONG, SHORT }
enum TradeStatus { OPEN, CLOSED }
enum AssetClass { EQUITY, FUTURES, OPTIONS, FOREX, CRYPTO, ETF }
enum OrderType { MARKET, LIMIT, STOP, STOP_LIMIT }
enum BrokerType { INTERACTIVE_BROKERS, TD_AMERITRADE, E_TRADE, GENERIC_CSV }
```

#### Import System Enums
```typescript
enum ImportStatus { PENDING, PROCESSING, COMPLETED, FAILED }
enum ImportType { STANDARD, CUSTOM }
enum ParseMethod { STANDARD, AI_MAPPED, USER_CORRECTED }
```

### Database Relationships

```
User (1) → (Many) Trades
User (1) → (Many) Orders  
User (1) → (Many) ImportBatches
User (1) → (Many) JournalEntries
Trade (1) → (Many) PartialFills
ImportBatch (1) → (Many) Trades
ImportBatch (1) → (Many) Orders
```

### Index Strategy
- **Performance Indexes**: userId + date, userId + symbol
- **Analytics Indexes**: userId + pnl, userId + entryDate
- **Search Indexes**: userId + symbol + status

---

## API Documentation

### Authentication Endpoints

#### `GET/POST /api/auth/[...auth0]`
Auth0 authentication callback
- Handles login, logout, and callback operations
- Automatic user creation on first login
- Session management

### Core Data Endpoints

#### `GET /api/trades`
Fetch user trades with filtering and pagination

**Query Parameters:**
- `symbol?: string` - Filter by ticker symbol
- `side?: 'long' | 'short' | 'all'` - Filter by trade direction
- `dateFrom?: string` - Start date (ISO format)
- `dateTo?: string` - End date (ISO format)
- `limit?: number` - Results per page (default: 100)
- `offset?: number` - Pagination offset
- `tags?: string` - Comma-separated tag list

**Response:**
```typescript
{
  trades: Trade[];
  totalCount: number;
  hasMore: boolean;
}
```

#### `POST /api/trades`
Create new trade manually

**Request Body:**
```typescript
{
  symbol: string;
  side: 'long' | 'short';
  entryDate: string;
  exitDate?: string;
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  notes?: string;
  tags?: string[];
}
```

#### `GET /api/dashboard`
Dashboard summary data

**Response:**
```typescript
{
  totalPnl: number;
  totalTrades: number;
  totalVolume: number;
  winRate: number;
  recentTrades: Trade[];
  dailyPnl: ChartDataPoint[];
  monthlyPerformance: PerformanceMetrics[];
}
```

### Analytics Endpoints

#### `GET /api/analytics`
Comprehensive analytics data

**Query Parameters:**
- `dateFrom?: string` - Analysis start date
- `dateTo?: string` - Analysis end date  
- `symbol?: string` - Filter by symbol
- `side?: string` - Filter by side

**Response:**
```typescript
{
  overview: {
    dailyPnl: ChartDataPoint[];
    cumulativePnl: ChartDataPoint[];
    winPercentage: ChartDataPoint[];
  };
  distribution: {
    byMonth: DistributionData[];
    byDayOfWeek: DistributionData[];
    byHourOfDay: DistributionData[];
  };
  performance: PerformanceMetrics;
}
```

#### `GET /api/reports/[reportType]`
Specialized report endpoints:
- `/api/reports/overview` - General performance overview
- `/api/reports/detailed` - Detailed analytics breakdown
- `/api/reports/win-loss` - Win/loss analysis
- `/api/reports/win-loss-days` - Daily win/loss patterns

### Import Endpoints

#### `POST /api/csv/upload`
Upload and process CSV file

**Request:** FormData with file upload
**Response:**
```typescript
{
  success: boolean;
  importBatchId: string;
  importType: 'STANDARD' | 'CUSTOM';
  totalRecords: number;
  successCount: number;
  errorCount: number;
  requiresUserReview: boolean;
  aiMappingResult?: AiMappingResult;
}
```

#### `PUT /api/csv/upload`
Validate CSV without importing

#### `POST /api/csv/mapping`
Apply user-corrected column mappings

#### `GET /api/csv/template`
Download standard CSV template

### Journal Endpoints

#### `GET /api/journal`
Fetch journal entries

#### `POST /api/journal`
Create/update journal entry

---

## Business Logic & Calculations

### P&L Calculations

#### Basic P&L Formula
```typescript
const calculatePnL = (trade: Trade): number => {
  if (trade.side === 'LONG') {
    return (trade.exitPrice - trade.entryPrice) * trade.quantity;
  } else {
    return (trade.entryPrice - trade.exitPrice) * trade.quantity;
  }
};
```

#### Net P&L (After Costs)
```typescript
const calculateNetPnL = (trade: Trade): number => {
  const grossPnL = calculatePnL(trade);
  const totalCosts = (trade.commission || 0) + (trade.fees || 0);
  return grossPnL - totalCosts;
};
```

### Performance Metrics

#### Win Rate Calculation
```typescript
const calculateWinRate = (trades: Trade[]): number => {
  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const winningTrades = closedTrades.filter(t => t.pnl > 0);
  return closedTrades.length > 0 ? winningTrades.length / closedTrades.length : 0;
};
```

#### Sharpe Ratio
```typescript
const calculateSharpeRatio = (dailyReturns: number[]): number => {
  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((acc, ret) => 
    acc + Math.pow(ret - avgReturn, 2), 0) / dailyReturns.length;
  const stdDev = Math.sqrt(variance);
  return stdDev > 0 ? avgReturn / stdDev : 0;
};
```

#### Maximum Drawdown
```typescript
const calculateMaxDrawdown = (cumulativePnL: number[]): number => {
  let maxDrawdown = 0;
  let peak = cumulativePnL[0];
  
  for (let i = 1; i < cumulativePnL.length; i++) {
    if (cumulativePnL[i] > peak) {
      peak = cumulativePnL[i];
    }
    const drawdown = (peak - cumulativePnL[i]) / Math.abs(peak);
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  return maxDrawdown;
};
```

### Time-Based Analytics

#### Time Bucket Classification
```typescript
type TimeBucket = '< 1min' | '1-5min' | '5-15min' | '15-30min' | 
                  '30-60min' | '1-2hr' | '2-4hr' | '4hr+' | 'overnight';

const getTimeBucket = (seconds: number): TimeBucket => {
  const minutes = seconds / 60;
  const hours = minutes / 60;
  
  if (minutes < 1) return '< 1min';
  if (minutes < 5) return '1-5min';
  if (minutes < 15) return '5-15min';
  if (minutes < 30) return '15-30min';
  if (minutes < 60) return '30-60min';
  if (hours < 2) return '1-2hr';
  if (hours < 4) return '2-4hr';
  if (hours < 24) return '4hr+';
  return 'overnight';
};
```

#### Day of Week Analysis
```typescript
const analyzeByDayOfWeek = (trades: Trade[]) => {
  const dayStats = groupBy(trades, trade => 
    new Date(trade.date).toLocaleDateString('en-US', { weekday: 'long' })
  );
  
  return Object.entries(dayStats).map(([day, dayTrades]) => ({
    day,
    pnl: dayTrades.reduce((sum, t) => sum + t.pnl, 0),
    trades: dayTrades.length,
    winRate: calculateWinRate(dayTrades),
    avgPnl: dayTrades.reduce((sum, t) => sum + t.pnl, 0) / dayTrades.length
  }));
};
```

### Advanced Metrics

#### MFE/MAE Analysis
- **MFE (Maximum Favorable Excursion)**: Highest profit point during trade
- **MAE (Maximum Adverse Excursion)**: Worst drawdown point during trade

```typescript
const calculateMFE = (trade: Trade): number => {
  // Implementation depends on intraday price data availability
  return trade.highDuringTrade ? 
    Math.max(0, trade.highDuringTrade - trade.entryPrice) * trade.quantity : 0;
};

const calculateMAE = (trade: Trade): number => {
  return trade.lowDuringTrade ? 
    Math.max(0, trade.entryPrice - trade.lowDuringTrade) * trade.quantity : 0;
};
```

#### Kelly Criterion
```typescript
const calculateKellyCriterion = (trades: Trade[]): number => {
  const winRate = calculateWinRate(trades);
  const avgWin = trades.filter(t => t.pnl > 0)
    .reduce((sum, t, _, arr) => sum + t.pnl / arr.length, 0);
  const avgLoss = Math.abs(trades.filter(t => t.pnl < 0)
    .reduce((sum, t, _, arr) => sum + t.pnl / arr.length, 0));
    
  return avgLoss > 0 ? winRate - ((1 - winRate) / (avgWin / avgLoss)) : 0;
};
```

---

## Frontend Architecture

### Component Hierarchy

#### Page Components (App Router)
```
app/
├── (with-sidebar)/layout.tsx       # Authenticated layout
│   ├── dashboard/page.tsx          # Main dashboard
│   ├── trades/page.tsx             # Trade management
│   ├── reports/page.tsx            # Analytics reports
│   └── calendar/page.tsx           # Calendar view
├── demo/layout.tsx                 # Demo mode layout
└── login/page.tsx                  # Authentication
```

#### Core Components
```
components/
├── Sidebar.tsx                     # Navigation sidebar
├── TopBar.tsx                      # Page header with filters
├── FilterPanel.tsx                 # Advanced filtering
├── KPICards.tsx                    # Performance metrics cards
├── TradesTable.tsx                 # Main data table
├── charts/                         # Chart components
│   ├── EquityChart.tsx            # P&L curves
│   ├── DistributionCharts.tsx     # Performance breakdowns
│   └── StatisticsTable.tsx        # Metrics tables
└── ui/                            # shadcn/ui components
```

### State Management Strategy

#### 1. Server State (React Query Pattern)
```typescript
// Custom hooks for data fetching
const useDashboardData = () => {
  return useSWR('/api/dashboard', fetcher, {
    refreshInterval: 60000, // 1 minute
    revalidateOnFocus: true
  });
};

const useTradesData = (filters: FilterOptions) => {
  const queryKey = `/api/trades?${new URLSearchParams(filters)}`;
  return useSWR(queryKey, fetcher);
};
```

#### 2. Client State (React Context)
```typescript
// Global filter state
const FilterContext = createContext<{
  filters: FilterOptions;
  setFilters: (filters: FilterOptions) => void;
  resetFilters: () => void;
}>({});

// Usage in components
const { filters, setFilters } = useContext(FilterContext);
```

#### 3. Form State (React Hook Form)
```typescript
const TradeForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<TradeFormData>({
    resolver: zodResolver(tradeSchema)
  });
  
  const onSubmit = (data: TradeFormData) => {
    // Handle form submission
  };
};
```

### Chart Components Architecture

#### Base Chart Structure
```typescript
interface ChartProps {
  data: ChartDataPoint[];
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  colors?: string[];
}

const EquityChart: React.FC<ChartProps> = ({ data, height = 400 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#2563EB" />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

#### Chart Data Processing
```typescript
const processChartData = (trades: Trade[]): ChartDataPoint[] => {
  return trades
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce((acc, trade, index) => {
      const cumulativePnL = index === 0 ? trade.pnl : acc[index - 1].value + trade.pnl;
      acc.push({
        date: format(new Date(trade.date), 'MMM dd'),
        value: cumulativePnL,
        volume: trade.quantity
      });
      return acc;
    }, [] as ChartDataPoint[]);
};
```

### Responsive Design System

#### Breakpoints
```typescript
const breakpoints = {
  sm: '640px',
  md: '768px', 
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
};

// Usage with Tailwind
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

#### Mobile-First Components
```typescript
const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="lg:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80">
          {/* Mobile navigation content */}
        </SheetContent>
      </Sheet>
    </div>
  );
};
```

---

## Authentication & Security

### Auth0 Integration

#### Configuration
```typescript
// lib/auth0.ts
import { initAuth0 } from '@auth0/nextjs-auth0';

export default initAuth0({
  secret: process.env.AUTH0_SECRET,
  baseURL: process.env.AUTH0_BASE_URL,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  routes: {
    callback: '/api/auth/callback',
    postLogoutRedirect: '/'
  }
});
```

#### Required Environment Variables
```bash
AUTH0_SECRET='use [openssl rand -hex 32] to generate'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://your-tenant.us.auth0.com'
AUTH0_CLIENT_ID='your-auth0-client-id'
AUTH0_CLIENT_SECRET='your-auth0-client-secret'
```

### User Authentication Flow

#### 1. Login Process
```
User clicks "Login" → Auth0 Login Page → Callback → Create/Update User → Dashboard
```

#### 2. Auto User Creation
```typescript
// lib/auth/userSync.ts
export async function syncUser(auth0User: any) {
  const existingUser = await prisma.user.findUnique({
    where: { auth0Id: auth0User.sub }
  });
  
  if (!existingUser) {
    await prisma.user.create({
      data: {
        auth0Id: auth0User.sub,
        email: auth0User.email,
        name: auth0User.name
      }
    });
  }
}
```

### Route Protection

#### Middleware Setup
```typescript
// middleware.ts
import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';

export default withMiddlewareAuthRequired();

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/trades/:path*', 
    '/reports/:path*',
    '/journal/:path*',
    '/api/trades/:path*',
    '/api/dashboard/:path*'
  ]
};
```

#### API Route Protection
```typescript
// app/api/trades/route.ts
import { getSession } from '@auth0/nextjs-auth0';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const userId = await getUserId(session.user.sub);
  // Fetch user-specific data
}
```

### Data Security

#### User Data Isolation
```typescript
// All queries automatically filter by userId
const getUserTrades = async (userId: string, filters: FilterOptions) => {
  return await prisma.trade.findMany({
    where: {
      userId, // Always include userId in where clause
      ...buildWhereClause(filters)
    }
  });
};
```

#### Input Validation
```typescript
// lib/schemas/standardCsv.ts
import { z } from 'zod';

export const tradeSchema = z.object({
  symbol: z.string().min(1).max(10),
  side: z.enum(['LONG', 'SHORT']),
  quantity: z.number().positive(),
  entryPrice: z.number().positive(),
  date: z.string().datetime()
});
```

#### SQL Injection Prevention
- Prisma ORM provides automatic SQL injection protection
- All user inputs validated with Zod schemas
- No raw SQL queries in application code

---

## Data Import System

### Architecture Overview

The import system handles multiple CSV formats through a dual-path approach:
1. **Standard Format**: Known schema, direct processing
2. **Custom Format**: AI-powered column mapping

### Standard CSV Format

#### Required Columns
```csv
Date,Time,Symbol,Buy/Sell,Shares,Price,Commission,Fees,Account
2025-01-01,09:30:00,AAPL,BUY,100,150.00,1.00,0.50,Main Account
2025-01-01,09:35:00,AAPL,SELL,100,151.50,1.00,0.50,Main Account
```

#### Validation Schema
```typescript
// lib/schemas/standardCsv.ts
export const standardCsvSchema = z.object({
  Date: z.string().refine(isValidDate),
  Time: z.string().optional(),
  Symbol: z.string().min(1).max(10),
  'Buy/Sell': z.enum(['BUY', 'SELL', 'BOT', 'SLD', 'B', 'S']),
  Shares: z.string().transform(Number).pipe(z.number().positive()),
  Price: z.string().transform(Number).pipe(z.number().positive()).optional(),
  Commission: z.string().transform(Number).pipe(z.number()).optional(),
  Fees: z.string().transform(Number).pipe(z.number()).optional(),
  Account: z.string().optional()
});
```

### AI-Powered Column Mapping

#### Heuristic Analysis
```typescript
// lib/ai/csvMapper.ts
export function analyzeColumnMapping(headers: string[], sampleRows: any[]): MappingResult {
  const mappings: ColumnMapping[] = [];
  
  for (const header of headers) {
    const confidence = calculateMappingConfidence(header, sampleRows);
    const standardField = inferStandardField(header, sampleRows);
    
    mappings.push({
      originalColumn: header,
      standardField,
      confidence,
      requiresReview: confidence < 0.6
    });
  }
  
  return { mappings, overallConfidence: calculateOverallConfidence(mappings) };
}
```

#### Confidence Scoring
```typescript
const calculateMappingConfidence = (header: string, samples: any[]): number => {
  let confidence = 0;
  
  // Header name matching
  if (header.toLowerCase().includes('symbol')) confidence += 0.8;
  if (header.toLowerCase().includes('quantity')) confidence += 0.8;
  if (/buy|sell|side/i.test(header)) confidence += 0.8;
  
  // Data pattern matching
  const sampleValues = samples.map(row => row[header]);
  if (sampleValues.every(v => /^[A-Z]{1,5}$/.test(v))) confidence += 0.2; // Symbol pattern
  if (sampleValues.every(v => !isNaN(Number(v)))) confidence += 0.1; // Numeric pattern
  
  return Math.min(confidence, 1.0);
};
```

### Broker Format Support

#### Interactive Brokers
```typescript
const ibMapping = {
  'Symbol': 'symbol',
  'Buy/Sell': 'side', 
  'Quantity': 'quantity',
  'Price': 'entryPrice',
  'Date/Time': 'date',
  'Realized P&L': 'pnl'
};
```

#### TD Ameritrade  
```typescript
const tdaMapping = {
  'SYMBOL': 'symbol',
  'SIDE': 'side',
  'QTY': 'quantity', 
  'PRICE': 'entryPrice',
  'DATE': 'date',
  'NET AMT': 'pnl'
};
```

### Import Processing Pipeline

#### File Upload and Validation
```typescript
// app/api/csv/upload/route.ts
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // Validate file
  if (!file || !file.name.endsWith('.csv')) {
    return Response.json({ error: 'Invalid file type' }, { status: 400 });
  }
  
  // Parse CSV
  const csvText = await file.text();
  const parsed = Papa.parse(csvText, { header: true });
  
  // Determine processing path
  const isStandardFormat = detectStandardFormat(parsed.meta.fields);
  
  if (isStandardFormat) {
    return processStandardFormat(parsed.data, userId);
  } else {
    return processCustomFormat(parsed, userId);
  }
}
```

#### Standard Format Processing
```typescript
const processStandardFormat = async (data: any[], userId: string) => {
  const validatedTrades: Trade[] = [];
  const errors: string[] = [];
  
  for (const [index, row] of data.entries()) {
    try {
      const validated = standardCsvSchema.parse(row);
      validatedTrades.push(transformToTrade(validated, userId));
    } catch (error) {
      errors.push(`Row ${index + 1}: ${error.message}`);
    }
  }
  
  // Bulk insert trades
  if (validatedTrades.length > 0) {
    await prisma.trade.createMany({
      data: validatedTrades
    });
  }
  
  return {
    success: true,
    importType: 'STANDARD',
    totalRecords: data.length,
    successCount: validatedTrades.length,
    errorCount: errors.length,
    errors
  };
};
```

#### Custom Format Processing
```typescript
const processCustomFormat = async (parsed: ParseResult, userId: string) => {
  const aiMapping = analyzeColumnMapping(parsed.meta.fields, parsed.data.slice(0, 5));
  
  if (aiMapping.overallConfidence >= 0.8) {
    // High confidence: auto-process
    return applyMappingAndImport(parsed.data, aiMapping.mappings, userId);
  } else {
    // Low confidence: require user review
    return {
      success: false,
      requiresUserReview: true,
      aiMappingResult: aiMapping,
      sampleRows: parsed.data.slice(0, 10)
    };
  }
};
```

### Error Handling and Recovery

#### Validation Errors
```typescript
interface ImportError {
  row: number;
  column: string;
  value: any;
  error: string;
  severity: 'warning' | 'error';
}

const handleValidationError = (error: ZodError, rowIndex: number): ImportError[] => {
  return error.errors.map(err => ({
    row: rowIndex + 1,
    column: err.path.join('.'),
    value: err.input,
    error: err.message,
    severity: err.code === 'invalid_type' ? 'error' : 'warning'
  }));
};
```

#### Batch Management
```typescript
const createImportBatch = async (userId: string, filename: string): Promise<string> => {
  const batch = await prisma.importBatch.create({
    data: {
      userId,
      filename,
      brokerType: 'GENERIC_CSV',
      status: 'PROCESSING',
      processingStarted: new Date()
    }
  });
  return batch.id;
};
```

---

## Development Guide

### Local Development Setup

#### Prerequisites
- Node.js 18+ 
- PostgreSQL database access
- Auth0 account configured

#### Environment Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

#### Required Environment Variables
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/tradedb"

# Auth0 Configuration  
AUTH0_SECRET='use [openssl rand -hex 32] to generate'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://your-tenant.us.auth0.com'
AUTH0_CLIENT_ID='your-auth0-client-id'
AUTH0_CLIENT_SECRET='your-auth0-client-secret'

# Optional: Redis for caching
UPSTASH_REDIS_REST_URL='your-redis-url'
UPSTASH_REDIS_REST_TOKEN='your-redis-token'
```

### Code Conventions

#### File Naming
- React components: PascalCase (`TradesTable.tsx`)
- Utility functions: camelCase (`reportCalculations.ts`)
- API routes: kebab-case folders (`win-loss-days/route.ts`)
- Types: PascalCase interfaces (`PerformanceMetrics`)

#### Import Organization
```typescript
// External libraries
import React from 'react';
import { NextRequest } from 'next/server';

// Internal utilities
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth/userSync';

// Types
import type { Trade, FilterOptions } from '@/types';

// Relative imports
import { TradesTable } from './TradesTable';
```

#### Component Structure
```typescript
interface ComponentProps {
  // Props interface
}

export const ComponentName: React.FC<ComponentProps> = ({ 
  prop1, 
  prop2 
}) => {
  // Hooks
  const [state, setState] = useState();
  const data = useCustomHook();
  
  // Event handlers
  const handleClick = () => {};
  
  // Early returns
  if (loading) return <Skeleton />;
  
  // Main render
  return (
    <div className="component-styles">
      {/* Component JSX */}
    </div>
  );
};
```

### Testing Strategy

#### Unit Tests
```typescript
// __tests__/lib/reportCalculations.test.ts
import { calculateWinRate, calculateSharpeRatio } from '@/lib/reportCalculations';
import { mockTrades } from '@/data/mockData';

describe('Report Calculations', () => {
  test('calculateWinRate returns correct percentage', () => {
    const result = calculateWinRate(mockTrades);
    expect(result).toBeCloseTo(0.65, 2);
  });
  
  test('calculateSharpeRatio handles empty array', () => {
    const result = calculateSharpeRatio([]);
    expect(result).toBe(0);
  });
});
```

#### Integration Tests
```typescript
// __tests__/api/trades.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/trades/route';

describe('/api/trades', () => {
  test('returns user trades with filtering', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { symbol: 'AAPL', side: 'long' }
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.trades).toHaveLength(5);
  });
});
```

### Performance Optimization

#### Database Query Optimization
```typescript
// Use indexes for common query patterns
const getTradesWithIndexes = async (userId: string, filters: FilterOptions) => {
  return await prisma.trade.findMany({
    where: {
      userId, // Uses userId index
      symbol: filters.symbol, // Uses userId + symbol index
      date: {
        gte: filters.dateFrom,
        lte: filters.dateTo
      }
    },
    orderBy: { date: 'desc' },
    take: 100 // Limit results
  });
};
```

#### React Performance
```typescript
// Memoize expensive calculations
const MemoizedChart = React.memo(({ data }: { data: ChartDataPoint[] }) => {
  const processedData = useMemo(() => 
    processChartData(data), [data]
  );
  
  return <EquityChart data={processedData} />;
});

// Debounce user inputs
const SearchInput = () => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    }
  }, [debouncedQuery]);
};
```

### Deployment

#### Build Process
```bash
# Production build
npm run build

# Run production server
npm start

# Environment-specific builds
NODE_ENV=production npm run build
```

#### Database Migrations
```bash
# Apply migrations in production
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

#### Monitoring and Logging
```typescript
// Error tracking
import { captureException } from '@sentry/nextjs';

export const handleApiError = (error: Error, context: any) => {
  console.error('API Error:', error);
  captureException(error, { extra: context });
  
  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
};
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
**Symptoms**: Connection timeout, "database does not exist"
**Solutions**:
- Verify DATABASE_URL format: `postgresql://user:password@host:port/database`
- Check network connectivity to database
- Confirm database exists and user has permissions
- Run `npx prisma migrate deploy` to ensure schema is up to date

#### 2. Auth0 Configuration Errors  
**Symptoms**: Login redirects fail, "Invalid state" errors
**Solutions**:
- Verify all Auth0 environment variables are set
- Check Auth0 dashboard callback URLs match your domain
- Ensure AUTH0_SECRET is generated with `openssl rand -hex 32`
- Clear browser cookies and try again

#### 3. CSV Import Failures
**Symptoms**: "Invalid format", mapping errors, partial imports
**Solutions**:
```typescript
// Debug CSV parsing
const debugCsvImport = (file: File) => {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      console.log('Headers:', results.meta.fields);
      console.log('Sample rows:', results.data.slice(0, 3));
      console.log('Errors:', results.errors);
    }
  });
};
```

#### 4. Performance Issues
**Symptoms**: Slow page loads, chart rendering delays
**Solutions**:
- Check database query performance with `EXPLAIN ANALYZE`
- Implement pagination for large datasets
- Use React.memo for expensive components
- Enable caching for API responses

#### 5. Type Errors
**Symptoms**: TypeScript compilation errors
**Solutions**:
- Run `npx prisma generate` after schema changes
- Check import paths are correct
- Verify all required types are exported
- Use `any` temporarily to isolate type issues

### Development Tools

#### Database Inspection
```bash
# Open Prisma Studio
npx prisma studio

# Reset database (development only)
npx prisma migrate reset

# View current schema
npx prisma db pull
```

#### API Testing
```bash
# Test API endpoints with curl
curl -X GET "http://localhost:3000/api/trades?symbol=AAPL" \
  -H "Cookie: appSession=your-session-cookie"

# Use Postman or Insomnia for complex requests
```

#### Performance Monitoring
```typescript
// Add performance timing to API routes
export async function GET(request: NextRequest) {
  const start = performance.now();
  
  try {
    // API logic
    const result = await getData();
    return Response.json(result);
  } finally {
    const duration = performance.now() - start;
    console.log(`API call took ${duration.toFixed(2)}ms`);
  }
}
```

### Production Issues

#### Memory Leaks
**Symptoms**: Increasing memory usage, eventual crashes
**Solutions**:
- Monitor memory usage with `process.memoryUsage()`
- Use connection pooling for database
- Clean up event listeners and timers
- Implement proper error boundaries

#### Database Performance
**Symptoms**: Slow queries, high CPU usage
**Solutions**:
```sql
-- Analyze slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC;

-- Add missing indexes
CREATE INDEX idx_trades_user_date ON trades(userId, date);
CREATE INDEX idx_trades_user_symbol ON trades(userId, symbol);
```

#### Auth Session Issues
**Symptoms**: Users logged out unexpectedly
**Solutions**:
- Check Auth0 session timeout settings
- Verify AUTH0_SECRET is consistent across deployments
- Monitor session storage size
- Implement session refresh logic

### Debugging Tips

#### Enable Debug Logging
```typescript
// lib/debug.ts
export const debug = {
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error);
  }
};
```

#### Component Debugging
```typescript
// Add debug props to components
const TradesTable = ({ data, debug = false }: { data: Trade[], debug?: boolean }) => {
  if (debug) {
    console.log('TradesTable render:', {
      dataLength: data.length,
      firstTrade: data[0],
      rerenderTime: new Date().toISOString()
    });
  }
  
  return <table>{/* component JSX */}</table>;
};
```

#### API Route Debugging
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  console.log('API called with params:', Object.fromEntries(searchParams));
  
  try {
    const result = await getData();
    console.log('API returning:', { count: result.length });
    return Response.json(result);
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}
```

---

This documentation provides a complete foundation for understanding, maintaining, and extending the Trade Voyager application. It covers both the technical implementation details and the business logic needed to work effectively with the codebase.

For additional support or questions not covered in this documentation, refer to the README.md for setup instructions or the CSV_IMPORT_SYSTEM.md for detailed import functionality.