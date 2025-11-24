# Midtrans Payment Gateway Setup Guide

## Overview
This application is configured to use Midtrans as the payment gateway for processing Indonesian Rupiah (IDR) payments. The implementation supports multiple payment methods including QRIS, GoPay, and ShopeePay.

## Current Implementation Status

✅ **Backend Implementation Complete**
- PaymentService.ts: Full payment processing with security validations
- PaymentController.ts: API endpoints for payment operations  
- Type definitions: Complete Midtrans client types
- Webhook signature verification: Security implemented
- Production-ready error handling: Comprehensive error management

✅ **Frontend Implementation Complete**
- MidtransPayment component: React component for payment UI
- Payment method selector: Support for QRIS, GoPay, ShopeePay
- Real-time payment status: Status checking and updates
- User-friendly error handling: Localized Indonesian messages

## Required Environment Variables

To enable Midtrans payment functionality, you need to set up these environment variables:

### 1. MIDTRANS_SERVER_KEY
**Purpose**: Server-side API authentication and webhook signature verification
**Format**: 
- Sandbox: `SB-Mid-server-XXXXXXXXXXXXXXXXXX`
- Production: `Mid-server-XXXXXXXXXXXXXXXXXX`
**Security**: This key must be kept secret and never exposed to frontend

### 2. MIDTRANS_CLIENT_KEY  
**Purpose**: Frontend integration and public API calls
**Format**:
- Sandbox: `SB-Mid-client-XXXXXXXXXXXXXXXXXX`
- Production: `Mid-client-XXXXXXXXXXXXXXXXXX`
**Security**: Safe to use in frontend but should be environment-specific

## How to Set Up Credentials

### Step 1: Get Midtrans Account
1. Sign up at https://midtrans.com/
2. Complete merchant verification process
3. Access your dashboard at https://dashboard.midtrans.com/

### Step 2: Get API Keys
**For Development/Testing (Sandbox):**
1. Go to Settings → Access Keys
2. Use the Sandbox environment keys
3. Keys will have `SB-` prefix

**For Production:**
1. Complete Midtrans activation process
2. Go to Settings → Access Keys  
3. Use the Production environment keys
4. Keys will have `Mid-` prefix (no SB-)

### Step 3: Configure Environment Variables
Set the environment variables in your `.env` file:

```bash
# Add to .env file
MIDTRANS_SERVER_KEY=SB-Mid-server-your-server-key-here
MIDTRANS_CLIENT_KEY=SB-Mid-client-your-client-key-here
```

## Environment Detection

The application automatically detects the environment:
- `NODE_ENV=development`: Uses Midtrans sandbox
- `NODE_ENV=production`: Uses Midtrans production

## Configuration Validation

The application includes built-in validation:
- Keys are validated on server startup
- Payment service availability is checked before processing
- Detailed error messages guide troubleshooting

## Payment Flow

1. **Frontend**: User selects payment method (QRIS/GoPay/ShopeePay)
2. **API Call**: `/api/payments/midtrans/charge` creates payment
3. **Midtrans**: Returns payment instructions (QR code, deeplink, etc.)
4. **User Payment**: User completes payment via chosen method
5. **Webhook**: Midtrans notifies via `/api/payments/midtrans/webhook`
6. **Verification**: Server verifies webhook signature for security
7. **Update**: Payment status updated, wallet credited if successful

## Security Features

✅ **Webhook Signature Verification**: Prevents payment forgery
✅ **Rate Limiting**: Protects against abuse
✅ **Input Validation**: Prevents malicious data
✅ **Amount Validation**: Ensures valid payment amounts
✅ **Risk Assessment**: EscrowRiskService evaluates transactions
✅ **Database Transactions**: Atomic operations prevent race conditions

## Supported Payment Methods

- **QRIS**: Universal QR code payment
- **GoPay**: Gojek digital wallet
- **ShopeePay**: Shopee digital wallet
- **Bank Transfer**: Virtual account payments (configurable)
- **Credit Card**: Visa/Mastercard (configurable)

## Production Checklist

- [ ] Set MIDTRANS_SERVER_KEY with production key
- [ ] Set MIDTRANS_CLIENT_KEY with production key
- [ ] Verify NODE_ENV=production
- [ ] Test webhook URL is accessible
- [ ] Configure payment method settings in Midtrans dashboard
- [ ] Set up monitoring and logging
- [ ] Test all payment flows end-to-end

## Troubleshooting

**Payment service disabled message:**
- Check if MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY are set
- Verify keys format (should include SB- prefix for sandbox)

**Webhook errors:**
- Ensure webhook URL is publicly accessible
- Check server logs for signature verification errors
- Verify server key matches the one in Midtrans dashboard

**Payment failures:**
- Check Midtrans dashboard for transaction details
- Review application logs for detailed error messages
- Verify payment method is enabled in Midtrans settings

## Support

For Midtrans-specific issues:
- Documentation: https://docs.midtrans.com/
- Dashboard: https://dashboard.midtrans.com/
- Support: support@midtrans.com

For application-specific issues:
- Check server logs: Look for payment-related error messages
- Frontend console: Payment component provides detailed error feedback
- Database: Transaction status tracking in `transactions` table