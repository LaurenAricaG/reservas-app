"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FiCheck, FiAlertCircle, FiUser, FiFileText } from "react-icons/fi";
import {
  Modal,
  Input,
  Label,
  Button,
  Select,
  Textarea,
  type SelectOption,
} from "@/components/ui";
import { SerializedGuest, DocumentType } from "@/types/guests";
import { guestSchema } from "@/lib/guest/schema";
import { createGuestAction, updateGuestAction } from "@/lib/guest/actions";

interface GuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest?: SerializedGuest | null;
  onSuccess: () => void;
}

const DOCUMENT_TYPE_OPTIONS: SelectOption[] = [
  { value: "DNI", label: "DNI (8 dígitos)" },
  { value: "RUC", label: "RUC (11 dígitos)" },
  { value: "PASSPORT", label: "Pasaporte" },
  { value: "FOREIGNER_CARD", label: "Carnet de Extranjería" },
  { value: "OTHER", label: "Otro Documento" },
];

export default function GuestModal({
  isOpen,
  onClose,
  guest,
  onSuccess,
}: GuestModalProps) {
  const isEditing = Boolean(guest);

  const [documentType, setDocumentType] = useState<DocumentType>("DNI");
  const [documentNumber, setDocumentNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("Peruana");
  const [originCity, setOriginCity] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [fiscalAddress, setFiscalAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (guest) {
        setDocumentType(guest.documentType);
        setDocumentNumber(guest.documentNumber);
        setFirstName(guest.firstName);
        setLastName(guest.lastName);
        setEmail(guest.email || "");
        setPhone(guest.phone || "");
        setNationality(guest.nationality || "Peruana");
        setOriginCity(guest.originCity || "");
        setBusinessName(guest.businessName || "");
        setFiscalAddress(guest.fiscalAddress || "");
        setNotes(guest.notes || "");
      } else {
        setDocumentType("DNI");
        setDocumentNumber("");
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setNationality("Peruana");
        setOriginCity("");
        setBusinessName("");
        setFiscalAddress("");
        setNotes("");
      }
      setErrors({});
      setServerError(null);
    }
  }, [isOpen, guest]);

  const validate = () => {
    const parsed = guestSchema.safeParse({
      documentType,
      documentNumber,
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      nationality: nationality || "Peruana",
      originCity: originCity || null,
      businessName: businessName || null,
      fiscalAddress: fiscalAddress || null,
      notes: notes || null,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setLoading(true);

    try {
      const payload = {
        documentType,
        documentNumber: documentNumber.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        nationality: nationality.trim() || "Peruana",
        originCity: originCity.trim() || null,
        businessName:
          documentType === "RUC" ? businessName.trim() || null : null,
        fiscalAddress:
          documentType === "RUC" ? fiscalAddress.trim() || null : null,
        notes: notes.trim() || null,
      };

      if (isEditing && guest) {
        const res = await updateGuestAction(guest.id, payload);
        if (res.success) {
          toast.success(res.message);
          onSuccess();
          onClose();
        } else {
          if (res.errors) {
            setErrors(res.errors);
          }
          if (res.message) {
            setServerError(res.message);
            toast.error(res.message);
          }
        }
      } else {
        const res = await createGuestAction(payload);
        if (res.success) {
          toast.success(res.message);
          onSuccess();
          onClose();
        } else {
          if (res.errors) {
            setErrors(res.errors);
          }
          if (res.message) {
            setServerError(res.message);
            toast.error(res.message);
          }
        }
      }
    } catch (error) {
      console.error("Error al guardar huésped:", error);
      toast.error("Ocurrió un error inesperado al procesar el huésped.");
      setServerError(
        "Ocurrió un error inesperado al comunicarse con el servidor.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => {} : onClose}
      title={isEditing ? `Editar Huésped: ${guest?.fullName}` : "Nuevo Huésped"}
      subtitle={
        isEditing
          ? "Actualiza la información de identidad, contacto o facturación del huésped."
          : "Registra un nuevo cliente o huésped para asignación de habitaciones y reservas."
      }
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {serverError && (
          <div className="p-3 bg-danger-bg border border-danger-border rounded-xl flex items-start gap-2.5 text-xs text-danger-text">
            <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Fila 1: Documento */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label required>Tipo de Documento</Label>
            <Select
              options={DOCUMENT_TYPE_OPTIONS}
              value={documentType}
              onValueChange={(val) => {
                const newDocType = val as DocumentType;
                setDocumentType(newDocType);
                if (newDocType !== "RUC") {
                  setBusinessName("");
                  setFiscalAddress("");
                }
                if (errors.documentType || errors.documentNumber) {
                  setErrors((prev) => {
                    const u = { ...prev };
                    delete u.documentType;
                    delete u.documentNumber;
                    return u;
                  });
                }
              }}
              searchable={false}
              disabled={loading}
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="guest-doc-number" required>
              Número de Documento
            </Label>
            <Input
              id="guest-doc-number"
              placeholder={
                documentType === "DNI"
                  ? "Ej: 72849102 (8 dígitos)"
                  : documentType === "RUC"
                    ? "Ej: 20601234567 (11 dígitos)"
                    : "Número de documento de identidad"
              }
              value={documentNumber}
              onChange={(e) => {
                setDocumentNumber(e.target.value);
                if (errors.documentNumber) {
                  setErrors((prev) => {
                    const u = { ...prev };
                    delete u.documentNumber;
                    return u;
                  });
                }
              }}
              error={errors.documentNumber}
              disabled={loading}
            />
          </div>
        </div>

        {/* Fila 2: Nombres y Apellidos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="guest-first-name" required>
              Nombres
            </Label>
            <Input
              id="guest-first-name"
              placeholder="Ej: Juan Carlos"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (errors.firstName) {
                  setErrors((prev) => {
                    const u = { ...prev };
                    delete u.firstName;
                    return u;
                  });
                }
              }}
              error={errors.firstName}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="guest-last-name" required>
              Apellidos
            </Label>
            <Input
              id="guest-last-name"
              placeholder="Ej: Pérez Quispe"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (errors.lastName) {
                  setErrors((prev) => {
                    const u = { ...prev };
                    delete u.lastName;
                    return u;
                  });
                }
              }}
              error={errors.lastName}
              disabled={loading}
            />
          </div>
        </div>

        {/* Fila 3: Contacto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="guest-phone">Teléfono / Celular (Opcional)</Label>
            <Input
              id="guest-phone"
              placeholder="Ej: +51 987 654 321"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) {
                  setErrors((prev) => {
                    const u = { ...prev };
                    delete u.phone;
                    return u;
                  });
                }
              }}
              error={errors.phone}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="guest-email">Correo Electrónico (Opcional)</Label>
            <Input
              id="guest-email"
              type="email"
              placeholder="Ej: cliente@correo.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors((prev) => {
                    const u = { ...prev };
                    delete u.email;
                    return u;
                  });
                }
              }}
              error={errors.email}
              disabled={loading}
            />
          </div>
        </div>

        {/* Fila 4: Procedencia y Nacionalidad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="guest-nationality">Nacionalidad</Label>
            <Input
              id="guest-nationality"
              placeholder="Ej: Peruana, Argentina, Española..."
              value={nationality}
              onChange={(e) => setNationality(e.target.value)}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="guest-city">Ciudad de Procedencia (Opcional)</Label>
            <Input
              id="guest-city"
              placeholder="Ej: Lima, Cusco, Arequipa, Trujillo..."
              value={originCity}
              onChange={(e) => setOriginCity(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        {/* Fila 5: Datos de la Empresa (Solo visible si el documento es RUC) */}
        {documentType === "RUC" && (
          <div className="p-3.5 bg-brand-50/50 border border-brand-200/70 rounded-xl space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-800">
              <FiFileText className="w-3.5 h-3.5 text-brand-600" />
              <span>Datos de la Empresa (Razón Social para Facturación)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="guest-business-name" required>
                  Razón Social
                </Label>
                <Input
                  id="guest-business-name"
                  placeholder="Ej: Inversiones y Servicios S.A.C."
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="guest-fiscal-address">Dirección Fiscal</Label>
                <Input
                  id="guest-fiscal-address"
                  placeholder="Ej: Av. Javier Prado Este 1234, Lima"
                  value={fiscalAddress}
                  onChange={(e) => setFiscalAddress(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        )}

        {/* Fila 6: Observaciones / Notas */}
        <div>
          <Label htmlFor="guest-notes">
            Notas Técnicas o Preferencias del Huésped (Opcional)
          </Label>
          <Textarea
            id="guest-notes"
            rows={2}
            placeholder="Ej: Huésped corporativo frecuente, alérgico a plumas, solicita piso alto..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Botones de acción estandarizados (Guardar / Actualizar) */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-default/80">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading}
            className="shadow-2xs font-semibold"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Guardando...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <FiCheck className="w-4 h-4" />
                {isEditing ? "Actualizar" : "Guardar"}
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
