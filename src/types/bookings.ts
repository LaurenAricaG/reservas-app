import type {
  BookingOrigin,
  BookingStatus,
  DocumentType,
  PaymentMethod,
  ReceiptType,
  RoomStatus,
} from "./models";

export type {
  BookingOrigin,
  BookingStatus,
  DocumentType,
  PaymentMethod,
  ReceiptType,
  RoomStatus,
};

export interface SerializedBookingRoomOption {
  id: number;
  number: string;
  floorName: string;
  roomTypeName: string;
  basePrice: number;
  hourlyPrice: number | null;
  maxGuests: number;
  status: RoomStatus;
}

export interface SerializedBookingGuestOption {
  id: number;
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  phone: string | null;
  businessName: string | null;
}

export interface SerializedBookingPayment {
  id: number;
  amount: number;
  method: PaymentMethod;
  receiptType: ReceiptType;
  receiptNumber: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SerializedBooking {
  id: number;
  code: string;
  origin: BookingOrigin;
  roomId: number;
  roomNumber: string;
  floorName: string;
  roomTypeName: string;
  roomBasePrice: number;
  roomHourlyPrice: number | null;
  roomMaxGuests: number;
  guestId: number;
  guestFullName: string;
  guestDocumentType: DocumentType;
  guestDocumentNumber: string;
  guestPhone: string | null;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  isHourly: boolean;
  durationHours: number;
  numberOfGuests: number;
  status: BookingStatus;
  stayStatus?: "ACTIVE" | "COMPLETED" | "CANCELLED" | null;
  totalPrice: number;
  depositPaid: number;
  pendingBalance: number;
  paymentProofUrl: string | null;
  clientNotes: string | null;
  receptionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  paymentsCount: number;
  payments?: SerializedBookingPayment[];
}
