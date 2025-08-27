# Enhanced CSV Import System Documentation

> **Part of the [Trade Voyager Documentation Suite](../README.md#-documentation)**

See also: [📋 Project Documentation](../PROJECT_DOCUMENTATION.md) | [🎯 Marketing Guide](../PITCH_AND_MARKETING.md) | [👥 User Flows](../USER_FLOWS.md)

## Overview

The Enhanced CSV Import System provides intelligent, AI-powered data ingestion for trading applications with support for both standard and custom CSV formats. The system includes real-time validation, automated column mapping, user correction capabilities, and comprehensive audit logging.

## Architecture

### System Components

1. **Standard CSV Schema** (`/src/lib/schemas/standardCsv.ts`)
   - Zod-based validation schemas
   - Normalized trade data structures
   - Date and number parsing utilities
   - Side mapping for different broker formats

2. **AI Mapping Module** (`/src/lib/ai/csvMapper.ts`)
   - Heuristic-based column detection
   - Confidence scoring system
   - Column mapping suggestions
   - User correction application

3. **CSV Ingestion Service** (`/src/lib/csvIngestion.ts`)
   - Dual-path processing (standard vs custom)
   - File validation and size checking
   - Progress tracking and error handling
   - Database integration with audit logging

4. **API Endpoints**
   - `/api/csv/upload` - File upload and processing
   - `/api/csv/mapping` - AI mapping and user corrections
   - `/api/csv/template` - Standard CSV template download

5. **Frontend Components**
   - `EnhancedFileUpload` - Drag-and-drop upload with validation
   - `ColumnMappingModal` - AI mapping review and correction
   - Progress tracking and real-time feedback

## Standard CSV Schema

### Required Columns
- **Date**: Trade execution date (YYYY-MM-DD, MM/DD/YYYY, etc.)
- **Symbol**: Stock ticker symbol (e.g., AAPL, TSLA)
- **Buy/Sell**: Trade direction (BUY, SELL, BOT, SLD, B, S)
- **Shares**: Number of shares/quantity

### Optional Columns
- **Time**: Trade execution time (HH:MM:SS)
- **Price**: Trade execution price
- **Commission**: Commission fees
- **Fees**: Other trading fees
- **Account**: Account identifier

### Example Standard CSV
```csv
Date,Time,Symbol,Buy/Sell,Shares,Price,Commission,Fees,Account
2025-01-01,09:30:00,AAPL,BUY,100,150.00,1.00,0.50,Main Account
2025-01-01,09:35:00,AAPL,SELL,100,151.50,1.00,0.50,Main Account
```

## AI Mapping System

### How It Works

1. **Column Analysis**: AI analyzes column headers and sample data
2. **Pattern Matching**: Uses heuristic rules to match columns to standard schema
3. **Confidence Scoring**: Assigns confidence scores (0.0 - 1.0) to each mapping
4. **Validation**: Checks for required fields and mapping conflicts
5. **User Review**: Low-confidence mappings trigger user review modal

### Confidence Thresholds
- **High (≥0.8)**: Auto-process without user review
- **Medium (0.6-0.8)**: Process but flag for review
- **Low (<0.6)**: Require user review before processing

### Supported Broker Formats
- Interactive Brokers
- TD Ameritrade  
- E*TRADE
- Charles Schwab
- Generic CSV (any format via AI mapping)

## File Processing Pipeline

### Standard Format Processing
1. Parse CSV with known schema
2. Validate each row against Zod schema
3. Normalize data to internal format
4. Insert into database
5. Update audit logs

### Custom Format Processing
1. Parse CSV headers and sample data
2. Run AI mapping analysis
3. If high confidence: auto-process
4. If low confidence: show mapping modal
5. Apply user corrections if provided
6. Normalize and insert data
7. Update audit logs with mapping decisions

## Database Schema

### Enhanced Trade Model
```typescript
model Trade {
  // Core fields
  id: String
  userId: String
  date: DateTime
  time: String
  symbol: String
  side: TradeType
  volume: Int
  
  // Enhanced fields
  price: Float?
  commission: Float?
  fees: Float?
  account: String?
  
  // Metadata
  executions: Int
  pnl: Float
  notes: String?
  tags: String[]
  
  // Relations
  importBatchId: String?
  importBatch: ImportBatch?
}
```

### Import Batch Tracking
```typescript
model ImportBatch {
  id: String
  userId: String
  filename: String
  fileSize: Int?
  brokerType: BrokerType
  importType: ImportType  // STANDARD | CUSTOM
  status: ImportStatus
  
  // Processing metrics
  totalRecords: Int
  successCount: Int
  errorCount: Int
  errors: Json?
  
  // AI mapping data
  aiMappingUsed: Boolean
  mappingConfidence: Float?
  columnMappings: Json?
  userReviewRequired: Boolean
  
  // Timing
  processingStarted: DateTime?
  processingCompleted: DateTime?
}
```

### Audit Logging
```typescript
model CsvUploadLog {
  id: String
  userId: String
  filename: String
  originalHeaders: String[]
  mappedHeaders: Json?
  rowCount: Int
  uploadStatus: UploadStatus
  parseMethod: ParseMethod  // STANDARD | AI_MAPPED | USER_CORRECTED
  aiConfidence: Float?
  userInteraction: Boolean
}
```

## Error Handling

### File-Level Errors
- Invalid file type (non-CSV)
- File size limits (max 100MB)
- Empty or malformed CSV
- Encoding issues (BOM handling)

### Row-Level Errors
- Missing required fields
- Invalid date formats
- Unknown trade sides
- Invalid numeric values
- Schema validation failures

### Mapping Errors
- Missing required columns
- Duplicate column mappings
- Low AI confidence scores
- User correction conflicts

## Security Features

### Server-Side Processing
- All file processing happens server-side
- Input sanitization and validation
- User authentication required
- Data isolation per user account

### Data Protection
- No unencrypted storage of sensitive data
- Audit trails for all operations
- User-specific data access controls
- Secure file upload handling

## Performance Considerations

### File Size Handling
- **Small files (<5MB)**: Immediate processing
- **Medium files (5-50MB)**: Streaming processing
- **Large files (>50MB)**: Background job processing (planned)

### Optimization Features
- CSV streaming parser for large files
- Progress tracking for user feedback
- Batch database inserts
- Connection pooling
- Memory-efficient processing

## API Reference

### Upload CSV File
```typescript
POST /api/csv/upload
Content-Type: multipart/form-data

FormData:
- file: File (CSV)
- accountTags: string (optional, comma-separated)

Response:
{
  success: boolean
  importBatchId: string
  importType: 'STANDARD' | 'CUSTOM'
  totalRecords: number
  successCount: number
  errorCount: number
  errors: string[]
  aiMappingResult?: AiMappingResult
  requiresUserReview: boolean
}
```

### Validate CSV File
```typescript
PUT /api/csv/upload
Content-Type: multipart/form-data

FormData:
- file: File (CSV)

Response:
{
  isValid: boolean
  isStandardFormat: boolean
  headers: string[]
  sampleRows: any[]
  rowCount: number
  errors: string[]
  fileSize: number
}
```

### Apply Column Mappings
```typescript
POST /api/csv/mapping
Content-Type: application/json

Body:
{
  importBatchId: string
  mappings: ColumnMapping[]
  accountTags?: string[]
}

Response: ImportResult
```

### Download Standard Template
```typescript
GET /api/csv/template

Response: CSV file download
```

## Frontend Integration

### Enhanced File Upload Component
```typescript
<EnhancedFileUpload
  onUploadComplete={(result) => {
    // Handle successful import
    router.push('/trades?imported=true');
  }}
  onMappingRequired={(result) => {
    // Show mapping modal
    setMappingModal({ 
      isOpen: true, 
      aiMappingResult: result.aiMappingResult 
    });
  }}
  accountTags={['live-trading', 'main-account']}
/>
```

### Column Mapping Modal
```typescript
<ColumnMappingModal
  isOpen={mappingModal.isOpen}
  onClose={() => setMappingModal({ isOpen: false })}
  aiMappingResult={mappingModal.aiMappingResult}
  originalHeaders={headers}
  sampleData={sampleRows}
  onApplyMappings={(mappings) => {
    // Apply user corrections
    submitMappings(mappings);
  }}
  isProcessing={isProcessing}
/>
```

## Testing

### Unit Tests
- Schema validation functions
- Date/number parsing utilities
- AI mapping heuristics
- Database operations

### Integration Tests
- End-to-end CSV processing
- API endpoint functionality
- Error handling scenarios
- User authentication flows

### Test Data
- Standard format CSV samples
- Custom format CSV samples from major brokers
- Edge cases and error conditions
- Large file performance tests

## Deployment Considerations

### Environment Variables
```bash
DATABASE_URL=postgresql://...
AUTH0_SECRET=...
AUTH0_BASE_URL=...
AUTH0_ISSUER_BASE_URL=...
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
OPENAI_API_KEY=...  # For AI mapping (optional)
```

### Database Migrations
1. Run `npx prisma generate` to update client
2. Run `npx prisma db push` to apply schema changes
3. Verify new tables and indexes are created

### Production Monitoring
- File upload success/failure rates
- AI mapping confidence distributions
- Processing time metrics
- Error frequency and types
- User interaction patterns

## Future Enhancements

### Background Job Processing
- Implement BullMQ for large file processing
- Job status tracking and notifications
- Retry mechanisms for failed jobs
- Priority queues for different file sizes

### Advanced AI Features
- Machine learning model training on mapping decisions
- Custom broker format learning
- Automated data quality suggestions
- Anomaly detection in trade data

### Performance Optimizations
- Redis caching for frequent operations
- Database query optimization
- CDN for template downloads
- Streaming responses for large datasets

### Additional Features
- Batch file processing
- Scheduled imports
- Data export functionality
- Advanced filtering and search
- Integration with external data sources