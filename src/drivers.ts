import Router from "@koa/router";
import { z } from "zod";
import {
  authenticate,
  requireRole,
  validate,
  AppError,
} from "../middleware/index.ts";

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseExpiresAt: string;
  status: "active" | "inactive";
}

const drivers: Driver[] = [
  {
    id: "drv-001",
    name: "Marcus Hill",
    licenseNumber: "CA-DL-5521",
    licenseExpiresAt: "2026-03-20T00:00:00.000Z",
    status: "active",
  },
  {
    id: "drv-002",
    name: "Angela Ruiz",
    licenseNumber: "CA-DL-6710",
    licenseExpiresAt: "2026-08-14T00:00:00.000Z",
    status: "active",
  },
];

const updateDriverSchema = z.object({
  status: z.enum(["active", "inactive"]).optional(),
  licenseExpiresAt: z.string().datetime().optional(),
});

const driverRouter = new Router({ prefix: "/api/drivers" });

driverRouter.use(authenticate());

driverRouter.get(
  "/",
  requireRole("manager", "dispatcher", "safety", "finance"),
  (ctx) => {
    ctx.body = { success: true, count: drivers.length, data: drivers };
  }
);

driverRouter.get(
  "/expiring-licences",
  requireRole("manager", "safety"),
  (ctx) => {
    const horizon = Date.now() + 45 * 24 * 60 * 60 * 1000;
    const expiring = drivers.filter(
      (driver) => new Date(driver.licenseExpiresAt).getTime() <= horizon
    );

    ctx.body = { success: true, count: expiring.length, data: expiring };
  }
);

driverRouter.patch(
  "/:id",
  requireRole("manager", "safety"),
  validate(updateDriverSchema),
  (ctx) => {
    const driver = drivers.find((d) => d.id === ctx.params.id);
    if (!driver) throw new AppError(404, "Driver not found", "DRIVER_NOT_FOUND");

    const update = ctx.state.validated as z.infer<typeof updateDriverSchema>;
    if (update.status) driver.status = update.status;
    if (update.licenseExpiresAt) driver.licenseExpiresAt = update.licenseExpiresAt;

    ctx.body = { success: true, data: driver };
  }
);

export default driverRouter;
