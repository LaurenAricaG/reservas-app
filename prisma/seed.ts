import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("🌱 Iniciando la siembra de datos para Hotel 'Party'...");

  // 1. Configuración del Hotel
  await prisma.hotelConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Hotel Party",
      description:
        "El mejor lugar para tu descanso, eventos y estadías confortables.",
      address: "Av. Principal 123, Miraflores, Lima",
      phone: "+51 987 654 321",
      whatsapp: "+51 987 654 321",
      email: "contacto@hotelparty.com",
      checkInTime: "14:00",
      checkOutTime: "12:00",
      ruc: "20601234567",
    },
  });
  console.log("✔ Configuración del Hotel lista");

  // 2. Series de Comprobantes (Boleta, Factura, Ticket)
  const seriesData = [
    { receiptType: "TICKET" as const, series: "T001", currentNumber: 0 },
    { receiptType: "BOLETA" as const, series: "B001", currentNumber: 0 },
    { receiptType: "FACTURA" as const, series: "F001", currentNumber: 0 },
  ];

  for (const s of seriesData) {
    await prisma.receiptSeries.upsert({
      where: { series: s.series },
      update: {},
      create: s,
    });
  }
  console.log("✔ Series de facturación listas (T001, B001, F001)");

  // 3. Roles
  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
      description: "Acceso total a todas las funciones y reportes del hotel",
    },
  });

  const recepRole = await prisma.role.upsert({
    where: { name: "RECEPCIONISTA" },
    update: {},
    create: {
      name: "RECEPCIONISTA",
      description:
        "Atención en mostrador, reservas, check-in, check-out y caja",
    },
  });

  const cleanRole = await prisma.role.upsert({
    where: { name: "LIMPIEZA" },
    update: {},
    create: {
      name: "LIMPIEZA",
      description: "Gestión y cambio de estado de habitaciones a disponible",
    },
  });
  console.log("✔ Roles creados (ADMIN, RECEPCIONISTA, LIMPIEZA)");

  // 4. Permisos Granulares
  const permissionsList = [
    // Habitaciones
    {
      code: "rooms:read",
      name: "Ver tablero y habitaciones",
      module: "habitaciones",
    },
    {
      code: "rooms:manage",
      name: "Crear y editar habitaciones",
      module: "habitaciones",
    },
    {
      code: "rooms:clean",
      name: "Marcar habitación como limpia",
      module: "habitaciones",
    },
    // Reservas
    { code: "bookings:read", name: "Ver reservas", module: "reservas" },
    { code: "bookings:create", name: "Crear reservas", module: "reservas" },
    { code: "bookings:cancel", name: "Cancelar reservas", module: "reservas" },
    // Estadías y Alquileres
    {
      code: "stays:read",
      name: "Ver huéspedes y estadías activas",
      module: "estadias",
    },
    { code: "stays:checkin", name: "Realizar Check-In", module: "estadias" },
    {
      code: "stays:checkout",
      name: "Realizar Check-Out y liquidación",
      module: "estadias",
    },
    {
      code: "stays:add_extra",
      name: "Agregar consumos de frigobar",
      module: "estadias",
    },
    // Caja
    { code: "cash:read", name: "Ver movimientos de caja", module: "caja" },
    { code: "cash:open", name: "Abrir turno de caja", module: "caja" },
    {
      code: "cash:close",
      name: "Cerrar y arquear turno de caja",
      module: "caja",
    },
    // Productos / Frigobar
    {
      code: "products:read",
      name: "Ver catálogo de productos",
      module: "productos",
    },
    {
      code: "products:manage",
      name: "Gestionar productos y precios",
      module: "productos",
    },
    // Usuarios y Configuración
    {
      code: "users:manage",
      name: "Gestionar empleados y permisos",
      module: "usuarios",
    },
    {
      code: "reports:read",
      name: "Ver reportes y ganancias",
      module: "reportes",
    },
  ];

  for (const p of permissionsList) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });

    // Asignar todos los permisos al ADMIN
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id },
      },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });

    // Asignar permisos operativos al RECEPCIONISTA
    if (
      p.module === "habitaciones" ||
      p.module === "reservas" ||
      p.module === "estadias" ||
      p.module === "caja" ||
      p.code === "products:read"
    ) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: recepRole.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: recepRole.id, permissionId: perm.id },
      });
    }

    // Asignar permiso de limpieza al personal de LIMPIEZA
    if (p.code === "rooms:clean" || p.code === "rooms:read") {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: cleanRole.id, permissionId: perm.id },
        },
        update: {},
        create: { roleId: cleanRole.id, permissionId: perm.id },
      });
    }
  }
  console.log("✔ Permisos asignados a los roles");

  // 5. Usuario Administrador por defecto
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("admin123", salt);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      name: "Administrador Party",
      username: "admin",
      email: "admin@hotelparty.com",
      passwordHash,
      roleId: adminRole.id,
      isActive: true,
    },
  });
  console.log("✔ Usuario Admin creado (Usuario: admin | Password: admin123)");

  // 6. Categorías y Productos de Frigobar
  const catBebidas = await prisma.category.upsert({
    where: { name: "Bebidas" },
    update: {},
    create: { name: "Bebidas", description: "Gaseosas, cervezas y aguas" },
  });

  const catSnacks = await prisma.category.upsert({
    where: { name: "Snacks" },
    update: {},
    create: { name: "Snacks", description: "Papas, chocolates y galletas" },
  });

  await prisma.product.upsert({
    where: { name: "Cerveza Corona 330ml" },
    update: {},
    create: {
      name: "Cerveza Corona 330ml",
      categoryId: catBebidas.id,
      price: 12.0,
      stock: 50,
    },
  });

  await prisma.product.upsert({
    where: { name: "Inka Cola 500ml" },
    update: {},
    create: {
      name: "Inka Cola 500ml",
      categoryId: catBebidas.id,
      price: 5.0,
      stock: 40,
    },
  });

  await prisma.product.upsert({
    where: { name: "Pringles Original" },
    update: {},
    create: {
      name: "Pringles Original",
      categoryId: catSnacks.id,
      price: 10.0,
      stock: 25,
    },
  });
  console.log("✔ Categorías y productos de frigobar creados");

  // 7. Pisos
  const piso1 = await prisma.floor.upsert({
    where: { number: 1 },
    update: {},
    create: { number: 1, name: "Piso 1" },
  });

  const piso2 = await prisma.floor.upsert({
    where: { number: 2 },
    update: {},
    create: { number: 2, name: "Piso 2" },
  });

  // 8. Tipos de Habitación
  const tipoMatrimonial = await prisma.roomType.upsert({
    where: { name: "Matrimonial" },
    update: {},
    create: {
      name: "Matrimonial",
      description:
        "Cama King Size, baño privado, Smart TV y aire acondicionado",
      basePrice: 90.0,
      hourlyPrice: 35.0,
      maxGuests: 2,
      amenities: ["Wifi", "Smart TV 55", "AC", "Agua Caliente"],
    },
  });

  const tipoSuiteVIP = await prisma.roomType.upsert({
    where: { name: "Suite VIP Party" },
    update: {},
    create: {
      name: "Suite VIP Party",
      description:
        "Jacuzzi con hidromasaje, luces LED fiesta, Smart TV 65 y Frigobar",
      basePrice: 180.0,
      hourlyPrice: 70.0,
      maxGuests: 4,
      amenities: [
        "Wifi",
        "Smart TV 65",
        "Jacuzzi",
        "Frigobar",
        "AC",
        "Luces Party",
      ],
    },
  });

  // 9. Habitaciones demo
  const roomsDemo = [
    { number: "101", floorId: piso1.id, roomTypeId: tipoMatrimonial.id },
    { number: "102", floorId: piso1.id, roomTypeId: tipoMatrimonial.id },
    { number: "201", floorId: piso2.id, roomTypeId: tipoSuiteVIP.id },
    { number: "202", floorId: piso2.id, roomTypeId: tipoSuiteVIP.id },
  ];

  for (const r of roomsDemo) {
    await prisma.room.upsert({
      where: { number: r.number },
      update: {},
      create: r,
    });
  }
  console.log("✔ Pisos, tipos y habitaciones demo creadas");
  console.log("🎉 ¡Siembra de datos completada con éxito!");
}

main()
  .catch((e) => {
    console.error("❌ Error en el Seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
