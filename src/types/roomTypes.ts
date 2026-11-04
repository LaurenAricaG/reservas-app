import { RoomType } from "./models";

export type SerializedRoomType = Omit<
  RoomType,
  "createdAt" | "updatedAt" | "deletedAt" | "basePrice" | "hourlyPrice"
> & {
  basePrice: number | string;
  hourlyPrice?: number | string | null;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  _count?: {
    rooms: number;
  };
};

