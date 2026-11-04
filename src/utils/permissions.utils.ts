/**
 * Utilidades para verificación de permisos y control de acceso basado en roles (RBAC).
 * 
 * Diseñado para soportar permisos granulares futuros (ej: 'rooms:create', 'rooms:update')
 * manteniendo total retrocompatibilidad con permisos maestros/comodines (ej: 'rooms:manage')
 * y otorgando pase total automático al rol 'ADMIN'.
 */

export function hasPermission(
  userPermissions: string[] | undefined | null,
  required: string | string[],
  userRole?: string | null,
): boolean {
  // 1. El rol 'ADMIN' tiene acceso total a todas las operaciones
  if (userRole === "ADMIN") {
    return true;
  }

  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  // 2. Si se pasa un string o lista, comprobar si tiene al menos uno
  const requiredList = Array.isArray(required) ? required : [required];
  return requiredList.some((perm) => userPermissions.includes(perm));
}

export function hasAllPermissions(
  userPermissions: string[] | undefined | null,
  required: string[],
  userRole?: string | null,
): boolean {
  if (userRole === "ADMIN") {
    return true;
  }

  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  return required.every((perm) => userPermissions.includes(perm));
}

