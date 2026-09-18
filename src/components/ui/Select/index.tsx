"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useId,
  forwardRef,
  useImperativeHandle,
} from "react";
import { cn } from "@/utils/cn.utils";
import { FiChevronDown, FiCheck, FiSearch, FiX } from "react-icons/fi";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  options?: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  /** Habilitar o deshabilitar explícitamente el buscador. Si es undefined, se muestra automáticamente cuando las opciones superan `searchThreshold` */
  searchable?: boolean;
  /** Cantidad mínima de opciones a partir de la cual el buscador aparece automáticamente (por defecto 6) */
  searchThreshold?: number;
  searchPlaceholder?: string;
  /** Cantidad de ítems visibles antes de generar scroll (por defecto 5) */
  maxVisibleItems?: number;
  /** Alias de maxVisibleItems */
  visibleItems?: number;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  name?: string;
  id?: string;
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}

export interface SelectRef {
  focus: () => void;
  blur: () => void;
  value: string;
}

const Select = forwardRef<SelectRef, SelectProps>(
  (
    {
      options: optionsProp,
      value: controlledValue,
      defaultValue,
      onChange,
      onValueChange,
      placeholder = "Seleccionar una opción...",
      error,
      disabled = false,
      searchable,
      searchThreshold = 6,
      searchPlaceholder = "Buscar opción...",
      maxVisibleItems,
      visibleItems,
      className,
      triggerClassName,
      menuClassName,
      name,
      id,
      size = "md",
      children,
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;

    // Extraer opciones si se pasaron etiquetas <option> como children
    const parsedOptions: SelectOption[] = React.useMemo(() => {
      if (optionsProp && optionsProp.length > 0) {
        return optionsProp;
      }
      if (children) {
        const extracted: SelectOption[] = [];
        React.Children.forEach(children, (child) => {
          if (React.isValidElement(child)) {
            const childProps = child.props as {
              value?: string;
              children?: React.ReactNode;
              disabled?: boolean;
            };
            const val =
              childProps.value ??
              (typeof childProps.children === "string" ? childProps.children : "");
            const lbl =
              typeof childProps.children === "string" ? childProps.children : val;
            if (val !== undefined) {
              extracted.push({
                value: String(val),
                label: String(lbl),
                disabled: childProps.disabled,
              });
            }
          }
        });
        return extracted;
      }
      return [];
    }, [optionsProp, children]);

    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState<string>(() => {
      if (isControlled) return controlledValue || "";
      if (defaultValue !== undefined) return defaultValue;
      return parsedOptions[0]?.value || "";
    });

    const currentValue = isControlled ? controlledValue || "" : internalValue;

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => triggerRef.current?.focus(),
      blur: () => triggerRef.current?.blur(),
      value: currentValue,
    }));

    // Determinar si mostrar buscador automáticamente cuando la cantidad de opciones es grande
    const shouldShowSearch = React.useMemo(() => {
      if (typeof searchable === "boolean") return searchable;
      return parsedOptions.length >= searchThreshold;
    }, [searchable, parsedOptions.length, searchThreshold]);

    // Cerrar menú al hacer clic afuera
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen]);

    // Enfocar el input de búsqueda cuando se abre el menú
    useEffect(() => {
      if (isOpen && shouldShowSearch) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
      }
      if (!isOpen) {
        setSearchQuery("");
        setHighlightedIndex(-1);
      }
    }, [isOpen, shouldShowSearch]);

    // Filtrar opciones
    const filteredOptions = React.useMemo(() => {
      if (!searchQuery.trim()) return parsedOptions;
      const q = searchQuery.toLowerCase();
      return parsedOptions.filter(
        (opt) =>
          opt.label.toLowerCase().includes(q) ||
          (opt.description && opt.description.toLowerCase().includes(q)),
      );
    }, [parsedOptions, searchQuery]);

    const selectedOption = parsedOptions.find((opt) => opt.value === currentValue);

    const handleSelect = (option: SelectOption) => {
      if (option.disabled) return;
      if (!isControlled) {
        setInternalValue(option.value);
      }
      onChange?.({ target: { value: option.value, name } });
      onValueChange?.(option.value);
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    // Navegación con teclado
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (!isOpen) {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev + 1;
            return next >= filteredOptions.length ? 0 : next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev - 1;
            return next < 0 ? filteredOptions.length - 1 : next;
          });
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
            const target = filteredOptions[highlightedIndex];
            if (!target.disabled) {
              handleSelect(target);
            }
          }
          break;
        case "Tab":
          setIsOpen(false);
          break;
      }
    };

    const renderIcon = (icon: SelectOption["icon"]) => {
      if (!icon) return null;
      if (React.isValidElement(icon)) return icon;
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className="w-4 h-4 shrink-0 text-text-secondary" />;
    };

    // Cálculo dinámico de la altura máxima para el scroll según la cantidad de ítems visibles configurada
    const hasDescriptions = React.useMemo(() => {
      return parsedOptions.some((opt) => Boolean(opt.description));
    }, [parsedOptions]);

    const effectiveVisibleItems = maxVisibleItems ?? visibleItems ?? 5;
    const estimatedItemHeight = hasDescriptions ? 50 : 38;
    const computedMaxHeight = `${effectiveVisibleItems * estimatedItemHeight + 10}px`;

    const sizeStyles = {
      sm: "min-h-9 px-3 py-1.5 text-xs rounded-lg gap-2",
      md: "min-h-10.5 px-3.5 py-2.5 text-sm rounded-xl gap-2.5",
      lg: "min-h-12 px-4 py-3 text-base rounded-xl gap-3",
    };

    return (
      <div ref={containerRef} className={cn("w-full relative select-none", className)}>
        {/* Input oculto para compatibilidad con formularios nativos */}
        {name && <input type="hidden" name={name} value={currentValue} />}

        {/* Trigger Button */}
        <button
          ref={triggerRef}
          type="button"
          id={selectId}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-invalid={Boolean(error)}
          className={cn(
            "w-full flex items-center justify-between bg-bg-card border border-border-default text-text-primary transition-all duration-150 text-left outline-none cursor-pointer shadow-2xs",
            sizeStyles[size],
            "hover:border-brand-300 hover:bg-bg-surface/30",
            isOpen && "border-brand-500 ring-3 ring-brand-100/80 bg-bg-card",
            "focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-100",
            disabled && "opacity-50 bg-bg-surface cursor-not-allowed hover:border-border-default",
            error &&
              "border-danger-border focus-visible:border-danger-text focus-visible:ring-3 focus-visible:ring-danger-bg/50",
            triggerClassName,
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {selectedOption ? (
              <>
                {selectedOption.icon && renderIcon(selectedOption.icon)}
                <span className="font-medium text-text-primary truncate">
                  {selectedOption.label}
                </span>
                {selectedOption.badge && (
                  <span className="shrink-0 ml-1">{selectedOption.badge}</span>
                )}
              </>
            ) : (
              <span className="text-text-tertiary truncate">{placeholder}</span>
            )}
          </div>

          <div
            className={cn(
              "text-text-tertiary transition-transform duration-200 shrink-0 ml-2",
              isOpen && "rotate-180 text-brand-600",
            )}
          >
            <FiChevronDown className="w-4 h-4" />
          </div>
        </button>

        {/* Dropdown Menu Popover */}
        {isOpen && (
          <div
            className={cn(
              "absolute left-0 right-0 top-full mt-1.5 z-50 bg-bg-card border border-border-default rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-98 duration-150 origin-top",
              menuClassName,
            )}
          >
            {/* Buscador: se muestra automáticamente si hay muchos ítems o si searchable={true} */}
            {shouldShowSearch && (
              <div className="p-2 border-b border-border-default bg-bg-surface/40">
                <div className="relative flex items-center">
                  <FiSearch className="absolute left-2.5 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={searchPlaceholder}
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-bg-card border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        searchInputRef.current?.focus();
                      }}
                      className="absolute right-2 p-0.5 text-text-tertiary hover:text-text-primary rounded-sm transition-colors"
                      title="Limpiar búsqueda"
                    >
                      <FiX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Lista de Opciones con scroll a partir de maxVisibleItems */}
            <ul
              ref={listRef}
              role="listbox"
              tabIndex={-1}
              style={{ maxHeight: computedMaxHeight }}
              className="p-1.5 overflow-y-auto space-y-0.5 focus:outline-none overscroll-contain"
            >
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs text-text-tertiary">
                  No se encontraron resultados
                </li>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = option.value === currentValue;
                  const isHighlighted = index === highlightedIndex;

                  return (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={option.disabled}
                      onClick={() => handleSelect(option)}
                      onMouseEnter={() => !option.disabled && setHighlightedIndex(index)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-100 text-sm select-none",
                        isSelected
                          ? "bg-brand-50 text-brand-700 font-semibold"
                          : "text-text-secondary hover:bg-bg-surface hover:text-text-primary",
                        isHighlighted && !isSelected && "bg-bg-surface text-text-primary",
                        option.disabled &&
                          "opacity-40 cursor-not-allowed hover:bg-transparent text-text-tertiary",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {option.icon && renderIcon(option.icon)}
                        <div className="flex flex-col min-w-0">
                          <span className="truncate leading-snug">{option.label}</span>
                          {option.description && (
                            <span className="text-[11px] font-normal text-text-tertiary truncate leading-tight">
                              {option.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {option.badge && <span>{option.badge}</span>}
                        {isSelected && (
                          <FiCheck className="w-4 h-4 text-brand-600 stroke-[2.5]" />
                        )}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <p className="mt-1.5 text-xs font-medium text-danger-text select-none animate-fade-in">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

export default Select;
