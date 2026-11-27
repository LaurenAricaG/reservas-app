import { DocumentType } from "./models";

export type { DocumentType };

export interface SerializedGuest {
  id: number;
  documentType: DocumentType;
  documentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  nationality: string | null;
  originCity: string | null;
  businessName: string | null;
  fiscalAddress: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  totalStays: number;
  totalBookings: number;
}
