# CSV Order Staging System

## Overview

The CSV Order Staging System prevents unapproved AI-generated CSV mappings from creating incorrect orders in the production database. When a user uploads a CSV file with an unknown format, orders are staged in a separate table until an admin reviews and approves the format mappings.

## Architecture

### Database Schema

#### BrokerCsvFormat (Enhanced)
- Added `isApproved: Boolean @default(false)`
- Added `approvedBy: String?`
- Added `approvedAt: DateTime?`
- Only approved formats are used for matching new uploads

#### OrderStaging (New Table)
- Stores raw CSV data as JSON
- Tracks migration status (PENDING, APPROVED, MIGRATING, MIGRATED, FAILED, REJECTED)
- Links to original ImportBatch and BrokerCsvFormat
- Includes performance metrics and error tracking

#### StagingAuditLog (New Table)
- Tracks all staging operations for monitoring
- Records approvals, rejections, and migrations
- Used for performance analysis and alerting

### Core Services

#### OrderStagingService
- Validates and stages CSV orders
- Batch processing for performance
- User limits and rate limiting
- Raw CSV data sanitization

#### FormatApprovalService
- Admin approval workflow
- Transaction-safe migration
- Batch processing with error recovery
- Rollback capabilities

#### StagingMonitor
- Performance tracking
- Error rate monitoring
- Health metrics
- Automated alerting

### API Endpoints

#### User Endpoints
- `GET /api/staging/status` - Get user's staging status
- `GET /api/staging/orders` - Get staged orders with pagination

#### Admin Endpoints
- `POST /api/admin/formats/[formatId]/approve` - Approve format and migrate orders
- `DELETE /api/admin/formats/[formatId]/approve` - Reject format
- `GET /api/admin/formats/pending` - Get formats pending approval
- `GET /api/admin/staging/stats` - Get staging statistics

#### System Endpoints
- `POST /api/cron/cleanup-staging` - Cleanup expired records

## Workflow

### 1. CSV Upload
1. User uploads CSV file
2. System checks if format is approved
3. If approved: Process normally
4. If unapproved: Route to staging

### 2. Staging Process
1. Validate CSV structure and data
2. Sanitize raw CSV data
3. Create staging records in batches
4. Generate initial AI mappings for preview
5. Update ImportBatch status to PENDING

### 3. Admin Review
1. Admin views pending formats
2. Reviews AI mappings and sample data
3. Can correct mappings if needed
4. Approves or rejects format

### 4. Migration Process
1. On approval, format marked as approved
2. Raw CSV data reprocessed with corrected mappings
3. Orders migrated to production in batches
4. Staging records marked as MIGRATED
5. Format becomes available for future uploads

### 5. User Experience
1. User sees staging notification banner
2. Can view staged orders (marked as "Pending Approval")
3. Staged orders don't appear in trading metrics
4. Real-time updates on approval status

## Security Features

### Input Validation
- Symbol format validation
- Quantity and price range checking
- Date validation with reasonable bounds
- JSON sanitization to prevent injection
- Rate limiting on admin operations

### Data Protection
- Raw CSV data stored as sanitized JSON
- No direct SQL queries with user input
- Transaction isolation for migrations
- Audit logging for all operations

## Performance Optimizations

### Batch Processing
- 100 records per batch for staging
- Cursor-based pagination for large migrations
- Memory-efficient streaming for large files
- Background job support for heavy operations

### Database Optimizations
- Optimized indexes for common queries
- Retention policies for old records
- Connection pooling and query optimization
- Partial indexes for pending records

## Monitoring & Alerting

### Metrics Tracked
- Staging success/failure rates
- Migration performance
- Format approval times
- System health indicators

### Alert Conditions
- Error rate > 5%
- Staging backlog > 10,000 orders
- Formats pending > 24 hours
- Migration failures

### Health Monitoring
- Real-time system status
- Performance dashboards
- Automated cleanup jobs
- Capacity planning metrics

## Error Recovery

### Rollback Capabilities
- Staging records kept for 30 days
- Complete audit trail
- Ability to revert migrations
- Point-in-time recovery

### Failure Handling
- Partial migration recovery
- Automatic retry with exponential backoff
- Dead letter queue for failed operations
- Manual intervention workflows

## Deployment Strategy

### Phase 1: Infrastructure (✅ Completed)
- Database schema deployment
- Service implementation
- API endpoint creation

### Phase 2: Gradual Rollout (✅ Completed)
1. Enable for 10% of new uploads
2. Monitor metrics and performance
3. Scale to 50% of uploads
4. Full deployment with monitoring

### Phase 3: Migration (✅ Completed)
1. Mark existing formats as approved (grandfather clause) - **5 formats migrated**
2. Enable staging for all new formats
3. Monitor and optimize performance

## Migration Results

The grandfather migration was completed successfully on deployment:

- **Total existing formats:** 5
- **Successfully grandfathered:** 5
- **Migration status:** Complete

Grandfathered formats:
- Interactive Brokers - Interactive Brokers Flex Query
- Interactive Brokers - Interactive Brokers Full Export
- Charles Schwab - Charles Schwab Trade Execution Format
- Charles Schwab - Schwab Today's Trade Activity
- E*TRADE - E*TRADE Format 5446

All existing formats are now marked as approved and will continue to work normally. New unknown formats will be routed to the staging system for admin approval.

## Configuration

### Environment Variables
- `CRON_SECRET` - Secret for cleanup job authentication
- Standard database and auth configuration

### Feature Flags
- Staging system can be enabled/disabled per user tier
- Admin override for emergency approval bypass
- Configurable batch sizes and timeouts

## Testing Strategy

### Unit Tests
- Service layer validation
- Mapping logic verification
- Error handling scenarios

### Integration Tests
- End-to-end staging workflow
- Admin approval process
- Migration integrity

### Performance Tests
- Large file processing
- Concurrent user scenarios
- Database load testing

## Maintenance

### Regular Tasks
- Daily cleanup of expired records
- Weekly performance review
- Monthly capacity planning
- Quarterly security audit

### Monitoring
- Real-time health dashboards
- Performance metrics tracking
- Error rate monitoring
- User satisfaction metrics

## Future Enhancements

### Planned Features
- Machine learning for mapping improvement
- Automated approval for high-confidence formats
- Bulk approval operations
- Enhanced admin workflows

### Scalability
- Distributed processing support
- Multi-region deployment
- Advanced caching strategies
- Event-driven architecture

## Support & Troubleshooting

### Common Issues
- Format approval delays
- Migration failures
- Performance bottlenecks
- User confusion about staging

### Debugging Tools
- Comprehensive logging
- Performance profiling
- Health check endpoints
- Admin diagnostic tools

---

This staging system ensures data quality while maintaining user experience and providing full administrative control over CSV format approvals.