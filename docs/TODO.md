# TODO Items

This document tracks known TODO items found in the codebase.

## Feature Implementations

### Email Service Integration
**File**: `server/services/EmailService.ts` (line 30)  
**Status**: Planned  
**Description**: Email service currently logs messages but doesn't send actual emails. Need to integrate with an email provider (SendGrid, Mailgun, AWS SES, etc.)  
**Priority**: Medium

### Average Response Time Calculation
**File**: `server/storage.ts` (line 3002)  
**Status**: Planned  
**Description**: The admin analytics `averageResponseTime` metric is currently hardcoded to 0. Should calculate based on actual message timing data.  
**Priority**: Low

## Notes
- Both TODOs are documented features that can be implemented when needed
- They don't impact current functionality as they are optional enhancements
- False positives found in test-utils.ts (format example) and TwoFactorLogin.tsx (placeholder text) - these are not actual TODO items
