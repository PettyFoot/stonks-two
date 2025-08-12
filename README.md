# TraderVue - Trading Analytics Platform

A complete trading analytics application inspired by TraderVue, built with Next.js, TypeScript, TailwindCSS, shadcn/ui, and Recharts.

## Features

- **Dashboard**: Comprehensive overview with daily P&L calendar, performance metrics, and analytics charts
- **Reports**: Detailed reporting with multiple chart views and performance breakdowns
- **Trades**: Complete trade management with filtering, sorting, and table views
- **Journal**: Daily journal entries with integrated trade data and notes
- **Search**: Full-text search across trades, journal entries, and comments
- **New Trade**: Simple trade entry form for manual trade creation

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **TailwindCSS v4** for styling
- **shadcn/ui** for UI components
- **Recharts** for data visualization
- **Lucide React** for icons

## Design System

The application follows the TraderVue-inspired design system:

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

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── reports/           # Reports page
│   ├── trades/            # Trades page
│   ├── journal/           # Journal page
│   ├── new-trade/         # New trade form
│   └── search/            # Search functionality
├── components/            # Reusable components
│   ├── charts/           # Chart components
│   └── ui/               # shadcn/ui components
├── data/                 # Mock data
├── hooks/                # Custom React hooks
└── types/                # TypeScript type definitions
```

## Key Components

### Core Components
- **Sidebar**: Navigation with TraderVue branding
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
- Pixel-perfect recreation of TraderVue interface

## Future Enhancements

- Real broker API integration
- Advanced charting with TradingView
- Real-time data updates
- Export functionality
- Mobile app version
- Multi-user support
