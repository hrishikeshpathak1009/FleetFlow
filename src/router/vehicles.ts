import Router from "@koa/router";
import { z } from "zod";
import {
  authenticate,
  requireRole,
  validate,
  AppError,
} from "../middleware/index.ts";
import type { UserRole } from "../types/index.ts";

type VehicleStatus = "active" | "in_shop" | "inactive";

interface MaintenanceLog {
  id: string;
  note: string;
  openedAt: string;
  completedAt?: string;
}

interface Vehicle {
  id: string;
  plate: string;
  unitNumber: string;
  status: VehicleStatus;
  mileage: number;
  lastServiceAt: string;
  maintenance: MaintenanceLog[];
}

const vehicles: Vehicle[] = [
  {
    id: "veh-001",
    plate: "FF-1024",
    unitNumber: "UNIT-01",
    status: "active",
    mileage: 78320,
    lastServiceAt: "2026-01-12T10:00:00.000Z",
    maintenance: [],
  },
  {
    id: "veh-002",
    plate: "FF-1188",
    unitNumber: "UNIT-02",
    status: "in_shop",
    mileage: 121402,
    lastServiceAt: "2025-12-03T09:30:00.000Z",
    maintenance: [
      {
        id: "mnt-001",
        note: "Transmission diagnostics",
        openedAt: "2026-02-15T16:00:00.000Z",
      },
    ],
  },
];

const createVehicleSchema = z.object({
  plate: z.string().min(3),
  unitNumber: z.string().min(2),
  mileage: z.number().int().nonnegative(),
});

const maintenanceSchema = z.object({
  note: z.string().min(3),
});

const vehicleRouter = new Router({ prefix: "/api/vehicles" });

vehicleRouter.use(authenticate());

vehicleRouter.get("/", requireRole("manager", "dispatcher", "safety", "finance"), (ctx) => {
  const role = ctx.state.user?.role as UserRole;
  const visible =
    role === "finance"
      ? vehicles.map(({ maintenance, ...vehicle }) => vehicle)
      : vehicles;

  ctx.body = {
    success: true,
    count: visible.length,
    data: visible,
  };
});

vehicleRouter.get("/kpis", requireRole("manager", "finance"), (ctx) => {
  const total = vehicles.length;
  const inShop = vehicles.filter((v) => v.status === "in_shop").length;
  const avgMileage = Math.round(
    vehicles.reduce((sum, v) => sum + v.mileage, 0) / Math.max(total, 1)
  );

  ctx.body = {
    success: true,
    data: {
      totalVehicles: total,
      inShop,
      active: vehicles.filter((v) => v.status === "active").length,
      averageMileage: avgMileage,
    },
  };
});

vehicleRouter.get("/in-shop", requireRole("manager"), (ctx) => {
  const inShop = vehicles.filter((v) => v.status === "in_shop");
  ctx.body = { success: true, count: inShop.length, data: inShop };
});

vehicleRouter.post(
  "/",
  requireRole("manager"),
  validate(createVehicleSchema),
  (ctx) => {
    const payload = ctx.state.validated as z.infer<typeof createVehicleSchema>;
    const vehicle: Vehicle = {
      id: `veh-${String(vehicles.length + 1).padStart(3, "0")}`,
      plate: payload.plate,
      unitNumber: payload.unitNumber,
      mileage: payload.mileage,
      status: "active",
      lastServiceAt: new Date().toISOString(),
      maintenance: [],
    };
    vehicles.push(vehicle);

    ctx.status = 201;
    ctx.body = { success: true, data: vehicle };
  }
);

vehicleRouter.post(
  "/:id/maintenance",
  requireRole("manager", "safety"),
  validate(maintenanceSchema),
  (ctx) => {
    const vehicle = vehicles.find((v) => v.id === ctx.params.id);
    if (!vehicle) throw new AppError(404, "Vehicle not found", "VEHICLE_NOT_FOUND");

    const payload = ctx.state.validated as z.infer<typeof maintenanceSchema>;
    const log: MaintenanceLog = {
      id: `mnt-${Date.now()}`,
      note: payload.note,
      openedAt: new Date().toISOString(),
    };
    vehicle.status = "in_shop";
    vehicle.maintenance.push(log);

    ctx.status = 201;
    ctx.body = { success: true, data: log };
  }
);

vehicleRouter.patch(
  "/:id/maintenance/:logId/complete",
  requireRole("manager", "safety"),
  (ctx) => {
    const vehicle = vehicles.find((v) => v.id === ctx.params.id);
    if (!vehicle) throw new AppError(404, "Vehicle not found", "VEHICLE_NOT_FOUND");

    const log = vehicle.maintenance.find((entry) => entry.id === ctx.params.logId);
    if (!log) throw new AppError(404, "Maintenance log not found", "MAINT_NOT_FOUND");
    if (log.completedAt) throw new AppError(409, "Maintenance already completed", "MAINT_DONE");

    log.completedAt = new Date().toISOString();
    vehicle.status = "active";
    vehicle.lastServiceAt = log.completedAt;

    ctx.body = { success: true, data: { vehicleId: vehicle.id, log } };
  }
);

export default vehicleRouter;
