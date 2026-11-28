import type {
  DocumentType,
  PaymentMethod,
  ReceiptType,
  RoomStatus,
  StayStatus,
} from "./models";

export type {
  DocumentType,
  PaymentMethod,
  ReceiptType,
  RoomStatus,
  StayStatus,
};

export interface SerializedStayRoomOption {
  id: number;
  number: string;
  floorName: string;
  roomTypeName: string;
  basePrice: number;
  hourlyPrice: number | null;
  maxGuests: number;
  status: RoomStatus;
}

export interface SerializedStayGuestOption {
  id: number;
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
  phone: string | null;
  businessName: string | null;
}

export interface SerializedStayProductOption {
  id: number;
  name: string;
  categoryName: string;
  price: number;
  stock: number;
}

export interface SerializedPendingBookingOption {
  id: number;
  code: string;
  roomId: number;
  roomNumber: string;
  roomTypeName: string;
  guestId: number;
  guestFullName: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  depositPaid: number;
  numberOfGuests: number;
  isHourly: boolean;
  durationHours: number;
}

export interface SerializedStayExtraCharge {
  id: number;
  productId: number | null;
  productName: string | null;
  concept: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  registeredByName: string | null;
  createdAt: string;
}

export interface SerializedStayPayment {
  id: number;
  amount: number;
  method: PaymentMethod;
  receiptType: ReceiptType;
  receiptNumber: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SerializedStayAdditionalGuest {
  id: number;
  fullName: string;
  documentType: DocumentType;
  documentNumber: string;
}

export interface SerializedStay {
  id: number;
  code: string;
  roomId: number;
  roomNumber: string;
  floorName: string;
  roomTypeName: string;
  primaryGuestId: number;
  primaryGuestName: string;
  primaryGuestDocumentType: DocumentType;
  primaryGuestDocumentNumber: string;
  primaryGuestPhone: string | null;
  bookingId: number | null;
  bookingCode: string | null;
  checkInAt: string;
  expectedCheckOut: string;
  actualCheckOut: string | null;
  status: StayStatus;
  roomPrice: number;
  totalRoomCost: number;
  totalExtraCost: number;
  securityDeposit: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  pendingBalance: number;
  notes: string | null;
  additionalGuestsCount: number;
  extraChargesCount: number;
  nights: number;
  isHourly: boolean;
  durationHours: number;
  createdAt: string;
  additionalGuests?: SerializedStayAdditionalGuest[];
  extraCharges?: SerializedStayExtraCharge[];
  payments?: SerializedStayPayment[];
}
