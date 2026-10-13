export interface GasConfig {
  id: string;
  recipients: string;
  ccRecipients: string;
  scheduledEnabled: boolean;
  querySql: string | null;
}

export interface GasEmailLog {
  id: string;
  sentAt: string;
  fechaDesde: string;
  fechaHasta: string;
  recipients: string | null;
  ccRecipients: string | null;
  manual: boolean;
  status: 'ok' | 'error';
  errorMessage: string | null;
  rowCount: number;
}

export interface GasDato {
  CABCONTABLE: string | null;
  CABRECTIFICATIVA: string | null;
  CABCONVENCIM: string | null;
  CABSERIE: string | null;
  CABNUMDOC: string | null;
  CABCODCLI: string | null;
  CABFECHA: string | null;
  LINCODART: string | null;
  LINUNIDADES: number | null;
  LINDESCLIN: string | null;
  LINPRCMONEDA: number | null;
  LINTIPIVA: string | null;
  LINCTACONL: string | null;
  [key: string]: unknown;
}

export interface GasFactura {
  id: string;
  legal_document_number: string | null;
  issued_date: string | null;
  due_date: string | null;
  invoice_status: string;
  invoice_type: string;
  business_invoice_type: string;
  total_amount: number;
  taxable_base_amount: number;
  tax_amount: number;
  pending_amount: number;
  paid_amount: number;
  validation_status: string | null;
  customer_id: string;
}

export interface GasMovimiento {
  id: string;
  registration_date: string;
  accounting_date: string;
  client_full_name: string | null;
  invoice_legal_document_number: string | null;
  account_number: string | null;
  amount: number;
  amount_with_tax: number;
  movement_type: 'debit' | 'credit';
  movement_source_type: string;
  status: string;
  description: string | null;
  tax_code: string | null;
  cost_center: string | null;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
