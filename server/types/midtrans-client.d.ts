declare module 'midtrans-client' {
  interface MidtransConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  interface CustomerDetails {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }

  interface ItemDetails {
    id: string;
    price: number;
    quantity: number;
    name: string;
  }

  interface ChargeRequest {
    payment_type: string;
    transaction_details: TransactionDetails;
    customer_details?: CustomerDetails;
    item_details?: ItemDetails[];
    bank_transfer?: {
      bank: string;
      va_number?: string;
      free_text?: {
        inquiry?: Array<{ en: string; id: string }>;
        payment?: Array<{ en: string; id: string }>;
      };
    };
    echannel?: {
      bill_info1?: string;
      bill_info2?: string;
    };
    custom_expiry?: {
      expiry_duration: number;
      unit: string;
    };
    callbacks?: {
      finish?: string;
    };
    bca_va?: {
      va_number?: string;
      free_text?: {
        inquiry?: Array<{ en: string; id: string }>;
        payment?: Array<{ en: string; id: string }>;
      };
    };
    permata_va?: {
      va_number?: string;
      recipient_name?: string;
    };
  }

  interface ChargeResponse {
    status_code: string;
    status_message: string;
    transaction_id: string;
    order_id: string;
    merchant_id: string;
    gross_amount: string;
    currency: string;
    payment_type: string;
    transaction_time: string;
    transaction_status: string;
    va_numbers?: Array<{
      bank: string;
      va_number: string;
    }>;
    permata_va_number?: string;
    fraud_status?: string;
    actions?: Array<{
      name: string;
      method: string;
      url: string;
    }>;
    bill_key?: string;
    biller_code?: string;
    qr_string?: string;
    expiry_time?: string;
    redirect_url?: string;
  }

  interface TransactionStatusResponse {
    status_code: string;
    status_message: string;
    transaction_id: string;
    masked_card?: string;
    order_id: string;
    merchant_id: string;
    gross_amount: string;
    currency: string;
    payment_type: string;
    transaction_time: string;
    transaction_status: string;
    fraud_status?: string;
    approval_code?: string;
    signature_key?: string;
    bank?: string;
    va_numbers?: Array<{
      bank: string;
      va_number: string;
    }>;
    bill_key?: string;
    biller_code?: string;
    permata_va_number?: string;
    expiry_time?: string;
    actions?: Array<{
      name: string;
      method: string;
      url: string;
    }>;
  }

  interface SnapTokenRequest {
    transaction_details: TransactionDetails;
    credit_card?: {
      secure?: boolean;
      channel?: string;
      bank?: string;
      installment?: {
        required?: boolean;
        terms?: {
          [key: string]: number[];
        };
      };
      whitelist_bins?: string[];
    };
    item_details?: ItemDetails[];
    customer_details?: CustomerDetails;
    enabled_payments?: string[];
    custom_expiry?: {
      expiry_duration: number;
      unit: string;
    };
    callbacks?: {
      finish?: string;
      unfinish?: string;
      error?: string;
    };
  }

  interface SnapTokenResponse {
    token: string;
    redirect_url: string;
  }

  class Snap {
    constructor(config: MidtransConfig);
    createTransaction(parameter: SnapTokenRequest): Promise<SnapTokenResponse>;
  }

  class CoreApi {
    constructor(config: MidtransConfig);
    charge(parameter: ChargeRequest): Promise<ChargeResponse>;
    transaction: {
      status(orderId: string): Promise<TransactionStatusResponse>;
      cancel(orderId: string): Promise<TransactionStatusResponse>;
      approve(orderId: string): Promise<TransactionStatusResponse>;
      deny(orderId: string): Promise<TransactionStatusResponse>;
      expire(orderId: string): Promise<TransactionStatusResponse>;
      refund(orderId: string, parameter?: { amount?: number; reason?: string }): Promise<any>;
    };
  }

  const midtransClient: {
    Snap: typeof Snap;
    CoreApi: typeof CoreApi;
  };

  export = midtransClient;
}