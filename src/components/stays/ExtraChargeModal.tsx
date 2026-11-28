"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FiShoppingBag, FiAlertCircle, FiCheck } from "react-icons/fi";
import {
  Modal,
  Input,
  Label,
  Button,
  Select,
  type SelectOption,
} from "@/components/ui";
import { addExtraChargeSchema } from "@/lib/stay/schema";
import { addStayExtraChargeAction } from "@/lib/stay/actions";
import type {
  SerializedStay,
  SerializedStayProductOption,
} from "@/types/stays";

interface ExtraChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  stay: SerializedStay | null;
  products: SerializedStayProductOption[];
  onSuccess: () => void;
}

const CHARGE_TYPE_OPTIONS: SelectOption[] = [
  { value: "PRODUCT", label: "Producto del catálogo (descuenta stock)" },
  { value: "CUSTOM", label: "Cargo libre / Servicio (lavandería, daño, etc.)" },
];

export default function ExtraChargeModal({
  isOpen,
  onClose,
  stay,
  products,
  onSuccess,
}: ExtraChargeModalProps) {
  const [chargeType, setChargeType] = useState<"PRODUCT" | "CUSTOM">("PRODUCT");
  const [productId, setProductId] = useState("");
  const [concept, setConcept] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const productOptions: SelectOption[] = useMemo(
    () =>
      products.map((p) => ({
        value: String(p.id),
        label: p.name,
        description: `${p.categoryName} · S/ ${p.price.toFixed(2)} · Stock: ${p.stock}`,
        disabled: p.stock <= 0,
      })),
    [products],
  );

  const selectedProduct = useMemo(
    () =>
      chargeType === "PRODUCT"
        ? products.find((p) => String(p.id) === productId) ?? null
        : null,
    [chargeType, products, productId],
  );

  useEffect(() => {
    if (!isOpen) return;
    const firstAvailable = products.find((p) => p.stock > 0) ?? null;
    setChargeType(firstAvailable ? "PRODUCT" : "CUSTOM");
    setProductId(firstAvailable ? String(firstAvailable.id) : "");
    setConcept(firstAvailable ? firstAvailable.name : "");
    setQuantity("1");
    setUnitPrice(firstAvailable ? firstAvailable.price.toFixed(2) : "");
    setErrors({});
    setServerError(null);
  }, [isOpen, products]);

  const handleProductChange = (val: string) => {
    setProductId(val);
    const prod = products.find((p) => String(p.id) === val);
    if (prod) {
      setConcept(prod.name);
      setUnitPrice(prod.price.toFixed(2));
    }
    if (errors.productId) setErrors((p) => ({ ...p, productId: "" }));
  };

  if (!stay) return null;

  const subtotal = (Number(quantity) || 0) * (Number(unitPrice) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = addExtraChargeSchema.safeParse({
      stayId: stay.id,
      productId:
        chargeType === "PRODUCT" && productId ? Number(productId) : null,
      concept,
      quantity: quantity === "" ? 0 : Number(quantity),
      unitPrice: unitPrice === "" ? 0 : Number(unitPrice),
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    if (
      chargeType === "PRODUCT" &&
      selectedProduct &&
      parsed.data.quantity > selectedProduct.stock
    ) {
      setErrors({
        quantity: `Stock insuficiente (disponible: ${selectedProduct.stock} unid.).`,
      });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      const res = await addStayExtraChargeAction(parsed.data);
      if (res.success) {
        toast.success(res.message || "Consumo agregado a la cuenta.");
        onSuccess();
        onClose();
      } else {
        if (res.errors) setErrors(res.errors);
        if (res.message) setServerError(res.message);
      }
    } catch (err) {
      console.error(err);
      setServerError("Ocurrió un error inesperado al registrar el consumo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Agregar Consumo — Hab. ${stay.roomNumber}`}
      subtitle={`Estadía ${stay.code} · ${stay.primaryGuestName}`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="extra-charge-form"
            variant="primary"
            loading={loading}
          >
            <FiCheck className="w-4 h-4" />
            <span>Cargar a Cuenta</span>
          </Button>
        </div>
      }
    >
      <form
        id="extra-charge-form"
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
      >
        {serverError && (
          <div className="p-3 rounded-xl bg-danger-bg border border-danger-border text-danger-text text-xs font-medium flex items-start gap-2">
            <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <div>
          <Label htmlFor="chargeType">Tipo de cargo</Label>
          <div className="mt-1">
            <Select
              id="chargeType"
              value={chargeType}
              onValueChange={(val) => {
                const next = val as "PRODUCT" | "CUSTOM";
                setChargeType(next);
                if (next === "CUSTOM") {
                  setProductId("");
                  setConcept("");
                  setUnitPrice("");
                } else {
                  const first = products.find((p) => p.stock > 0);
                  if (first) {
                    setProductId(String(first.id));
                    setConcept(first.name);
                    setUnitPrice(first.price.toFixed(2));
                  }
                }
                setErrors({});
              }}
              options={CHARGE_TYPE_OPTIONS}
              searchable={false}
            />
          </div>
        </div>

        {chargeType === "PRODUCT" ? (
          <div>
            <Label htmlFor="extraProduct" required>
              Producto
            </Label>
            <div className="mt-1">
              <Select
                id="extraProduct"
                value={productId}
                onValueChange={handleProductChange}
                options={productOptions}
                placeholder="Seleccionar producto..."
                searchable
                searchPlaceholder="Buscar bebida, snack..."
                error={errors.productId}
              />
            </div>
          </div>
        ) : (
          <div>
            <Label htmlFor="extraConcept" required>
              Concepto del cargo
            </Label>
            <Input
              id="extraConcept"
              type="text"
              placeholder="Ej: Lavandería express, Toalla adicional..."
              value={concept}
              onChange={(e) => {
                setConcept(e.target.value);
                if (errors.concept) setErrors((p) => ({ ...p, concept: "" }));
              }}
              error={errors.concept}
              className="mt-1"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <Label htmlFor="extraQty" required>
              Cantidad
            </Label>
            <Input
              id="extraQty"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                if (errors.quantity) setErrors((p) => ({ ...p, quantity: "" }));
              }}
              error={errors.quantity}
              className="mt-1 font-mono font-semibold"
            />
            {selectedProduct && (
              <p className="text-[11px] text-text-tertiary mt-1">
                Stock disponible: {selectedProduct.stock} unid.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="extraPrice" required>
              Precio Unitario (S/)
            </Label>
            <Input
              id="extraPrice"
              type="number"
              step="0.01"
              min="0.01"
              value={unitPrice}
              onChange={(e) => {
                setUnitPrice(e.target.value);
                if (errors.unitPrice) {
                  setErrors((p) => ({ ...p, unitPrice: "" }));
                }
              }}
              error={errors.unitPrice}
              className="mt-1 font-mono font-semibold"
            />
          </div>
        </div>

        {/* Subtotal */}
        <div className="p-3.5 rounded-xl bg-brand-50/60 border border-brand-200/80 flex items-center justify-between">
          <span className="text-xs font-semibold text-brand-700 flex items-center gap-1.5">
            <FiShoppingBag className="w-4 h-4" />
            Total a cargar a la habitación
          </span>
          <span className="font-mono font-bold text-base text-brand-700">
            S/ {subtotal.toFixed(2)}
          </span>
        </div>
      </form>
    </Modal>
  );
}
