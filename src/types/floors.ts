export interface SerializedFloor {
  id: number;
  number: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  maintenanceRooms: number;
  cleaningRooms: number;
  reservedRooms: number;
}
