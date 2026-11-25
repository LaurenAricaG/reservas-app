import { Room, Floor, RoomType, RoomStatus } from "./models";

export type SerializedRoom = Omit<
  Room,
  "createdAt" | "updatedAt" | "deletedAt"
> & {
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  floor: {
    id: number;
    number: number;
    name: string;
  };
  roomType: {
    id: number;
    name: string;
    basePrice: number | string;
    maxGuests: number;
  };
};

export interface SerializedFloorOption {
  id: number;
  number: number;
  name: string;
}

export interface SerializedRoomTypeOption {
  id: number;
  name: string;
  basePrice: number | string;
  maxGuests: number;
}

export type { RoomStatus, Floor, RoomType };

