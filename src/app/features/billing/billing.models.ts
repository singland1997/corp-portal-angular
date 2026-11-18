import {
  nullable,
  text,
  finiteNumber,
  bool,
  objectOf,
  arrayOf,
} from '@core/api/response-validation';

export interface Invoice {
  id: string;
  invoiceNo: string | null;
  billingCycle: string | null;
  lot: string | null;
  netAmount: number | null;
  outstanding: number | null;
  nextDueDate: string | null;
  paymentStatus: string | null;
  issuedAt: string | null;
  overdue: boolean;
}
export interface InvoiceLine {
  chargeType: string | null;
  description: string | null;
  quantity: number | null;
  unitPrice: number | null;
  amount: number | null;
}
export interface PaymentSchedule {
  sequenceNo: number | null;
  dueDate: string | null;
  amountDue: number | null;
  amountPaid: number | null;
  status: string | null;
}
export interface InvoiceDetail extends Invoice {
  lines: InvoiceLine[];
  schedule: PaymentSchedule[];
}

export const invoiceResponse = objectOf({
  id: text,
  invoiceNo: nullable(text),
  billingCycle: nullable(text),
  lot: nullable(text),
  netAmount: nullable(finiteNumber),
  outstanding: nullable(finiteNumber),
  nextDueDate: nullable(text),
  paymentStatus: nullable(text),
  issuedAt: nullable(text),
  overdue: bool,
});
export const invoiceDetailResponse = (value: unknown) =>
  invoiceResponse(value) &&
  objectOf({
    lines: arrayOf(
      objectOf({
        chargeType: nullable(text),
        description: nullable(text),
        quantity: nullable(finiteNumber),
        unitPrice: nullable(finiteNumber),
        amount: nullable(finiteNumber),
      }),
    ),
    schedule: arrayOf(
      objectOf({
        sequenceNo: nullable(finiteNumber),
        dueDate: nullable(text),
        amountDue: nullable(finiteNumber),
        amountPaid: nullable(finiteNumber),
        status: nullable(text),
      }),
    ),
  })(value);
