# Market Data Setup Guide

This application supports multiple market data providers to ensure reliable historical data for candlestick charts.

## Providers

### 1. Yahoo Finance (Default)
- **Cost**: Free
- **API Key**: Not required
- **Limitations**: 
  - 1m intervals: Last 30 days only
  - 5m, 15m, 30m intervals: Last 60 days only
  - 1h intervals: Limited historical data
- **Best for**: Recent trades (last 30-60 days)

### 2. Alpha Vantage (Fallback)
- **Cost**: Free tier available
- **API Key**: Required
- **Limitations**:
  - Free tier: 25 requests/day, 5 requests/minute
  - Premium: Higher limits available
- **Best for**: Historical trades (older than 60 days)

## Setup Instructions

### Getting Alpha Vantage API Key (Recommended)

1. Visit [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
2. Click "Get your free API key today"
3. Fill out the simple form
4. You'll receive your API key immediately

### Setting Up the API Key

#### Option 1: Environment Variable (Recommended)
```bash
# Windows (Command Prompt)
set ALPHA_VANTAGE_API_KEY=your_api_key_here

# Windows (PowerShell)
$env:ALPHA_VANTAGE_API_KEY="your_api_key_here"

# macOS/Linux
export ALPHA_VANTAGE_API_KEY=your_api_key_here
```

#### Option 2: .env.local file
Add to your `.env.local` file:
```
ALPHA_VANTAGE_API_KEY=your_api_key_here
```

## Testing Your Setup

### Test Yahoo Finance
```bash
node test-market-data.js
```

### Test Alpha Vantage
```bash
node test-alpha-vantage.js
```

## How It Works

1. **Primary**: Yahoo Finance is tried first (no API key needed)
2. **Fallback**: If Yahoo Finance fails or has no data, Alpha Vantage is used
3. **Demo Data**: If all providers fail, demo data is generated for testing

## Rate Limiting

- **Yahoo Finance**: ~100 requests/minute (informal)
- **Alpha Vantage**: 5 requests/minute, 25/day (free tier)

The application automatically handles rate limiting and provider fallbacks.

## Troubleshooting

### Common Issues

**"60-day limit exceeded"**
- Yahoo Finance limitation
- Alpha Vantage will be used automatically

**"Rate limit exceeded"**
- Wait and try again
- Consider upgrading Alpha Vantage plan

**"No data available"**
- Check symbol is valid
- Verify date is a trading day
- Try demo mode: `?demo=true`

### Debug Mode
Set `NODE_ENV=development` to see detailed provider logs.