# User Flow Specification

> **Part of the [Trade Voyager Documentation Suite](./README.md#-documentation)**

See also: [📋 Project Documentation](./PROJECT_DOCUMENTATION.md) | [🎯 Marketing Guide](./PITCH_AND_MARKETING.md) | [📤 CSV Import System](./docs/CSV_IMPORT_SYSTEM.md)

## 🎯 Core User Journeys

### 1. **Demo Mode Flow (Unauthenticated)**
```
Landing Page → "Try Demo" Button → Dashboard with Mock Data
├── Full UI functionality (read-only)
├── All charts and analytics work
├── No data persistence
├── "Sign up to save your data" prompts
└── Can explore all features without commitment
```

### 2. **New User Flow (Registration)**
```
Landing Page → "Sign Up" → Auth0 Registration → Onboarding → Empty Dashboard
├── Auth0 handles email/password or social login
├── Auto-create User record in DB
├── Show onboarding: "Import your first trades"
├── Guide to CSV upload or manual entry
└── Progressive disclosure of features
```

### 3. **Returning User Flow (Login)**
```
Landing Page → "Log In" → Auth0 Login → Personal Dashboard
├── Load user-specific data from PostgreSQL
├── Show recent trading performance
├── Quick access to import new trades
└── Full feature access with data persistence
```

## 🔐 Authentication States

### Unauthenticated Users
- **Data Source**: `mockData.ts` (in-memory)
- **Features**: Full UI, no persistence
- **Limitations**: Cannot save, import, or export data
- **CTA**: Prominent "Sign up to save your data" buttons

### Authenticated Users
- **Data Source**: PostgreSQL via Prisma
- **Features**: Full functionality + data persistence
- **User Isolation**: All queries filtered by `userId`
- **Enhanced**: Import/export, data history, advanced analytics

## 📊 Data Flow Architecture

### Demo Mode Data Flow
```
mockData.ts → useDashboardData(demo=true) → Components
(No API calls, pure client-side)
```

### Authenticated Data Flow
```
PostgreSQL → Prisma → API Routes → Hooks → Components
(Server-side rendering + client-side updates)
```

## 🔄 Mode Switching

### Demo → Authenticated
```
Demo User → Sign Up → Data Migration Offer
├── Option 1: Start fresh (recommended)
├── Option 2: Import demo data patterns
└── Onboarding flow continues
```

### Authenticated → Demo (Edge Case)
```
Logout → Landing Page → Demo Mode Available
(No data loss, user data preserved)
```

## 📱 UI/UX Considerations

### Visual Indicators
- **Demo Mode**: Subtle "Demo Mode" badge in header
- **Authenticated**: User avatar/email in header
- **Import Status**: Progress indicators for CSV uploads
- **Data State**: Clear indication when viewing real vs demo data

### Onboarding Sequences
1. **Demo Users**: Feature tour, benefits of signing up
2. **New Users**: CSV import wizard, manual entry tutorial
3. **Returning Users**: What's new, recent activity summary

## 🚀 Performance Considerations

### Demo Mode
- Instant loading (no API calls)
- Client-side filtering/sorting
- No network dependencies

### Authenticated Mode
- Server-side pagination for large datasets
- Caching strategies for frequent queries
- Optimistic updates for better UX

## 🔧 Implementation Notes

### Route Protection
- `/dashboard`, `/trades`, `/import` → Require auth
- `/demo` → Public access
- `/` → Landing page with mode selection

### Data Boundaries
- Demo data never touches database
- User data never shared between accounts
- Clear separation in hooks and API routes