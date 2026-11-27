import type { ShiftStatus, PaymentMethod, ReceiptType } from "./models";

export type { ShiftStatus, PaymentMethod, ReceiptType };

export interface PaymentMethodBreakdown {
  CASH: number;
  CARD: number;
  TRANSFER: number;
  YAPE: number;
  PLIN: number;
}

export interface SerializedCashPayment {
  id: number;
  amount: number;
  method: PaymentMethod;
  receiptType: ReceiptType;
  receiptNumber: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  bookingCode: string | null;
  stayCode: string | null;
  guestName: string | null;
}

export interface SerializedCashShift {
  id: number;
  userId: number;
  userName: string;
  userUsername: string;
  openedAt: string;
  closedAt: string | null;
  initialCash: number;
  expectedCash: number | null;
  actualCash: number | null;
  difference: number | null;
  status: ShiftStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  totalPaymentsCount: number;
  totalCollected: number;
  cashCollected: number;
  digitalCollected: number;
  breakdown: PaymentMethodBreakdown;
  payments?: SerializedCashPayment[];
}
