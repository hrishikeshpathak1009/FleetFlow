import Router from "@koa/router";
import { z } from "zod";
import {
  authenticate,
  requireRole,
  validate,
  AppError,
} from "../middleware/index.ts";

type TripStatus = "planned" | "dispatched" | "completed" | "cancelled";

interface Trip {
  id: string;
  vehicleId: string;
  driverId: string;
  origin: string;
  destination: string;
  scheduledAt: string;
  status: TripStatus;
}

const trips: Trip[] = [
  {
    id: "trp-001",
    vehicleId: "veh-001",
    driverId: "drv-001",
    origin: "Los Angeles, CA",
    destination: "San Diego, CA",
    scheduledAt: "2026-02-22T14:00:00.000Z",
    status: "planned",
  },
];

const createTripSchema = z.object({
  vehicleId: z.string().min(1),
  driverId: z.string().min(1),
  origin: z.string().min(2),
  destination: z.string().min(2),
  scheduledAt: z.string().datetime(),
});

const tripRouter = new Router({ prefix: "/api/trips" });

tripRouter.use(authenticate());

tripRouter.get(
  "/",
  requireRole("manager", "dispatcher", "safety", "finance"),
  (ctx) => {
    ctx.body = { success: true, count: trips.length, data: trips };
  }
);

tripRouter.post("/", requireRole("manager", "dispatcher"), validate(createTripSchema), (ctx) => {
  const payload = ctx.state.validated as z.infer<typeof createTripSchema>;
  const trip: Trip = {
    id: `trp-${String(trips.length + 1).padStart(3, "0")}`,
    status: "planned",
    ...payload,
  };

  trips.push(trip);
  ctx.status = 201;
  ctx.body = { success: true, data: trip };
});

tripRouter.post("/:id/dispatch", requireRole("dispatcher", "manager"), (ctx) => {
  const trip = trips.find((t) => t.id === ctx.params.id);
  if (!trip) throw new AppError(404, "Trip not found", "TRIP_NOT_FOUND");
  if (trip.status !== "planned") {
    throw new AppError(409, "Only planned trips can be dispatched", "INVALID_TRIP_STATE");
  }

  trip.status = "dispatched";
  ctx.body = { success: true, data: trip };
});

tripRouter.post("/:id/complete", requireRole("dispatcher", "manager"), (ctx) => {
  const trip = trips.find((t) => t.id === ctx.params.id);
  if (!trip) throw new AppError(404, "Trip not found", "TRIP_NOT_FOUND");
  if (trip.status !== "dispatched") {
    throw new AppError(409, "Only dispatched trips can be completed", "INVALID_TRIP_STATE");
  }

  trip.status = "completed";
  ctx.body = { success: true, data: trip };
});

tripRouter.post("/:id/cancel", requireRole("dispatcher", "manager"), (ctx) => {
  const trip = trips.find((t) => t.id === ctx.params.id);
  if (!trip) throw new AppError(404, "Trip not found", "TRIP_NOT_FOUND");
  if (trip.status === "completed") {
    throw new AppError(409, "Completed trips cannot be cancelled", "INVALID_TRIP_STATE");
  }

  trip.status = "cancelled";
  ctx.body = { success: true, data: trip };
});

export default tripRouter;
