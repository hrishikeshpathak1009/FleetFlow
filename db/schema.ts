import {
  pgTable,
  text,
  integer,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "manager",
  "dispatcher",
  "safety",
  "finance",
]);

export const vehicleStatusEnum = pgEnum("vehicle_status", [
  "active",
  "in_shop",
  "inactive",
]);

export const tripStatusEnum = pgEnum("trip_status", [
  "planned",
  "dispatched",
  "completed",
  "cancelled",
]);

export const drivers = pgTable("drivers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  licenseNumber: text("license_number").notNull(),
  licenseExpiresAt: timestamp("license_expires_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: text("id").primaryKey(),
  plate: text("plate").notNull(),
  unitNumber: text("unit_number").notNull(),
  status: vehicleStatusEnum("status").notNull().default("active"),
  mileage: integer("mileage").notNull().default(0),
  lastServiceAt: timestamp("last_service_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const maintenanceLogs = pgTable("maintenance_logs", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, {
    onDelete: "cascade",
  }),
  note: text("note").notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const trips = pgTable("trips", {
  id: text("id").primaryKey(),
  vehicleId: text("vehicle_id").notNull().references(() => vehicles.id, {
    onDelete: "restrict",
  }),
  driverId: text("driver_id").notNull().references(() => drivers.id, {
    onDelete: "restrict",
  }),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  status: tripStatusEnum("status").notNull().default("planned"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
