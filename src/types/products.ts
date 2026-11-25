export interface SerializedProduct {
  id: number;
  name: string;
  description: string | null;
  categoryId: number;
  categoryName: string;
  price: number;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface SerializedCategoryOption {
  id: number;
  name: string;
}
