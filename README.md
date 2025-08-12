# Trade Voyager - Professional Trading Analytics Platform

A production-ready trading performance tracking and analytics platform with full user authentication, data persistence, and broker integration capabilities.

## 🚀 Features

### **Core Analytics**
- **📊 Performance Dashboard**: Real-time P&L tracking with comprehensive trading metrics
- **📈 Interactive Charts**: Beautiful visualizations powered by Recharts
- **📋 Trade Management**: Complete trade history with advanced filtering and sorting
- **📝 Trading Journal**: Daily journal entries with integrated trade analysis
- **🔍 Advanced Search**: Full-text search across trades, journal entries, and analytics

### **Authentication & Security**
- **🔐 Auth0 Integration**: Secure authentication with social login support
- **👤 User Isolation**: Complete data separation between user accounts
- **🎯 Demo Mode**: Full-featured demo with sample data for new users
- **🔒 Session Management**: Automatic session handling and security

### **Data Import & Management**
- **📤 Broker Imports**: CSV import support for multiple brokers
- **⚡ Real-time Processing**: Background import with progress tracking
- **🛠️ Error Handling**: Comprehensive validation and error reporting
- **💾 Data Persistence**: PostgreSQL database with Prisma ORM

## 🏗️ Tech Stack

### **Frontend**
- **Next.js 15** with App Router and Server Components
- **TypeScript** for full type safety
- **TailwindCSS v4** for responsive styling
- **shadcn/ui** for consistent, accessible components
- **Recharts** for interactive data visualization
- **Auth0 React SDK** for authentication

### **Backend**
- **PostgreSQL** database (AWS RDS ready)
- **Prisma ORM** with type-safe database queries
- **Next.js API Routes** with user authentication
- **Papa Parse** for CSV processing
- **Auth0** for user management and sessions

## Design System

The application follows the Trade Voyager design system:

### Colors
- Primary: `#0f172a` (dark navy)
- Accent Blue: `#2563EB`
- Accent Purple: `#7C3AED`
- Surface/Card BG: `#FFFFFF`
- Page BG: `#F6F7FB`
- Text Primary: `#0B1220`
- Muted Text: `#6B7280`
- Positive: `#16A34A` (green)
- Negative: `#DC2626` (red)

### Typography
- Font: Inter
- Headings: xl size, medium weight
- Body: base size
- Captions: sm size

### Layout
- Fixed left sidebar navigation
- Top bar with filters and controls
- Card-based content layout
- Responsive grid system

## 🛠️ Local Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (AWS RDS: `stonkstwo-1`)
- Auth0 account with application configured

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create `.env.local` with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@stonkstwo-1.cluster-xxxxxx.us-east-1.rds.amazonaws.com:5432/stonkstwo?schema=public"

# Auth0 Configuration  
AUTH0_SECRET='use [openssl rand -hex 32] to generate a 32 bytes value'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://your-tenant.us.auth0.com'
AUTH0_CLIENT_ID='your-auth0-client-id'
AUTH0_CLIENT_SECRET='your-auth0-client-secret'
```

### 3. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy
```

### 4. Auth0 Configuration

#### Application Settings:
- **Application Type**: Single Page Application
- **Allowed Callback URLs**: `http://localhost:3000/api/auth/callback`
- **Allowed Logout URLs**: `http://localhost:3000`
- **Allowed Web Origins**: `http://localhost:3000`

### 5. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 🔐 Authentication Flow

### **Demo Mode** (Unauthenticated)
```
/ → /demo → Full UI with mock data → Sign up prompts
```

### **New User Registration**
```  
/ → /login → Auth0 signup → /dashboard (empty) → Import wizard
```

### **Returning User Login**
```
/ → /login → Auth0 login → /dashboard (personal data)
```

## 📊 Data Import

### Supported Broker Formats

#### Interactive Brokers
```csv
Date,Time,Symbol,Buy/Sell,Quantity,Price,Realized P&L
2025-04-07,09:30:00,AAPL,BUY,100,150.00,250.50
```

#### TD Ameritrade  
```csv
DATE,TIME,SYMBOL,SIDE,QTY,PRICE,NET AMT
04/07/2025,09:30:00,AAPL,B,100,150.00,15000.00
```

#### Generic CSV
```csv
date,time,symbol,side,volume,pnl
2025-04-07,09:30:00,AAPL,long,100,250.50
```

## 🏠 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes with authentication
│   │   ├── auth/          # Auth0 authentication endpoints
│   │   ├── dashboard/     # Dashboard data with user isolation
│   │   ├── trades/        # Trades CRUD with filtering
│   │   └── import/        # CSV import processing
│   ├── demo/              # Demo mode page
│   ├── login/             # Authentication pages
│   ├── import/            # Import interface
│   ├── dashboard/         # Main dashboard
│   ├── reports/           # Analytics reports
│   ├── trades/            # Trade management
│   └── journal/           # Trading journal
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui base components
│   └── charts/           # Chart components
├── hooks/                # Custom React hooks with auth support
├── lib/                  # Utility libraries
│   ├── prisma.ts         # Database client
│   ├── auth0.ts          # Authentication helpers
│   └── brokerImporter.ts # CSV import logic
├── types/                # TypeScript interfaces
├── data/                 # Mock data for demo mode
└── prisma/               # Database schema and migrations
```

## Key Components

### Core Components
- **Sidebar**: Navigation with Trade Voyager branding
- **TopBar**: Page headers with filters and controls
- **FilterPanel**: Advanced filtering interface
- **KPICards**: Daily performance cards
- **TradesTable**: Sortable, filterable trades table

### Charts
- **EquityChart**: Line charts for P&L curves
- **BarChart**: Volume and performance bars
- **PieChart**: Distribution charts
- **DistributionCharts**: Performance breakdown visuals
- **GaugeChart**: MFE/MAE ratio displays

### Data Management
- **Mock APIs**: RESTful endpoints for development
- **Custom Hooks**: Data fetching and state management
- **Type Safety**: Full TypeScript coverage

## Features Implementation

### Dashboard
- Daily calendar view with P&L and trade counts
- Multiple analytics charts (cumulative P&L, win rates, etc.)
- Performance breakdowns by various metrics
- Responsive grid layout

### Reports
- Tabbed interface with multiple report types
- Chart filtering and date range selection
- Performance analysis across different dimensions
- Export capabilities (UI ready)

### Trades
- Complete trade listing with sorting and filtering
- Multiple view modes (table, charts, gross/net)
- Real-time statistics
- Bulk selection capabilities

### Journal
- Daily journal entries with integrated trade data
- Rich text notes with template support
- Performance metrics integration
- Tag management system

## Accessibility

- Keyboard navigation support
- ARIA labels and roles
- High contrast color ratios (WCAG AA compliant)
- Screen reader compatibility
- Focus management

## Development

This project is built with modern React practices and includes:
- Type-safe development with TypeScript
- Component-based architecture
- Custom hooks for state management
- Mock API endpoints for realistic development
- Pixel-perfect recreation of Trade Voyager interface

## Future Enhancements

- Real broker API integration
- Advanced charting with TradingView
- Real-time data updates
- Export functionality
- Mobile app version
- Multi-user support
