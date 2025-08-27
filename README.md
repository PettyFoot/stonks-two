# Trade Voyager - Professional Trading Analytics Platform

> **Professional-grade trading analytics that turn your data into profits—instantly and for free.**

Transform your broker statements into actionable insights. Upload any CSV, discover hidden performance patterns, and trade like a professional.

## 🚀 Quick Start

### Try Demo (No Signup Required)
Experience all features with sample data: **[localhost:3000/demo](http://localhost:3000/demo)**

### Upload Your Data
1. Go to **[localhost:3000](http://localhost:3000)**
2. Click "Upload CSV" 
3. Drop your broker file
4. Get instant insights

## 📖 Documentation

- **[📋 Complete Project Documentation](./PROJECT_DOCUMENTATION.md)** - Comprehensive technical guide covering architecture, API, business logic, and development
- **[🎯 Marketing & Pitches](./PITCH_AND_MARKETING.md)** - Elevator pitches, marketing copy, target audiences, and competitor analysis  
- **[👥 User Flows](./USER_FLOWS.md)** - Authentication states, user journeys, and data flow architecture
- **[📤 CSV Import System](./docs/CSV_IMPORT_SYSTEM.md)** - Detailed import functionality and AI mapping system

## ⚡ Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database 
- Auth0 account configured

### Setup
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Generate Prisma client & run migrations  
npx prisma generate
npx prisma migrate deploy

# Start development server
npm run dev
```

Visit **[localhost:3000](http://localhost:3000)** to access the application.

### Required Environment Variables
```bash
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# Auth0 Configuration  
AUTH0_SECRET='use [openssl rand -hex 32] to generate'
AUTH0_BASE_URL='http://localhost:3000'
AUTH0_ISSUER_BASE_URL='https://your-tenant.us.auth0.com'
AUTH0_CLIENT_ID='your-auth0-client-id'
AUTH0_CLIENT_SECRET='your-auth0-client-secret'
```

## 🏗️ Tech Stack

**Frontend:** Next.js 15, TypeScript, TailwindCSS v4, shadcn/ui, Recharts  
**Backend:** Next.js API Routes, PostgreSQL, Prisma ORM, Auth0  
**Features:** AI-powered CSV mapping, Real-time analytics, Multi-broker support

## 📊 Key Features

### Core Analytics
- **📈 Performance Dashboard** - Real-time P&L tracking with professional metrics
- **🎯 Pattern Recognition** - Discover hidden performance blind spots automatically  
- **📋 Trade Management** - Complete trade history with advanced filtering
- **📝 Trading Journal** - Daily entries integrated with actual performance data

### Data Import
- **🤖 AI-Powered Import** - Upload any CSV format, get insights immediately
- **🏢 Multi-Broker Support** - Works with IB, TD Ameritrade, E*TRADE, etc.
- **⚡ Instant Processing** - Professional analytics in 30 seconds

### User Experience  
- **🎯 Demo Mode** - Try all features without signup
- **🔐 Secure Authentication** - Auth0 integration with data isolation
- **📱 Mobile Ready** - Responsive design across all devices

## 🔍 What Makes This Different

Unlike basic P&L tracking or expensive professional tools, Trade Voyager reveals the **patterns that impact your profitability**:

- **Time-based analysis**: Win rates by hour, day, week
- **Setup effectiveness**: Which strategies actually work vs. feel good
- **Behavioral insights**: Emotional trading patterns and costs
- **Professional metrics**: Sharpe ratio, Kelly criterion, MFE/MAE analysis

## 📁 Project Structure

```
src/
├── app/                    # Next.js 15 App Router
│   ├── (with-sidebar)/     # Authenticated pages (dashboard, trades, reports)
│   ├── demo/              # Demo mode (unauthenticated experience)
│   ├── api/               # RESTful API routes with authentication
│   └── login/             # Auth0 authentication flow
├── components/            # React components (UI, charts, forms)
├── lib/                   # Business logic, services, utilities
├── hooks/                 # Custom React hooks for data & state
├── types/                 # TypeScript definitions
└── data/                  # Mock data for demo mode
```

## 🚀 Deployment

**Development:** `npm run dev`  
**Production:** `npm run build && npm start`  
**Database:** `npx prisma migrate deploy`

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/anthropics/claude-code/issues)  
- **Documentation**: See linked docs above for comprehensive guides
- **Quick Help**: Check [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) troubleshooting section

---

**Ready to turn your trading data into your competitive advantage?**  
Start with the [demo](http://localhost:3000/demo) or [upload your first CSV](http://localhost:3000).
