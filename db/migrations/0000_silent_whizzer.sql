CREATE TYPE "public"."trip_status" AS ENUM('planned', 'dispatched', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('manager', 'dispatcher', 'safety', 'finance');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('active', 'in_shop', 'inactive');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drivers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"license_number" text NOT NULL,
	"license_expires_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"note" text NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trips" (
	"id" text PRIMARY KEY NOT NULL,
	"vehicle_id" text NOT NULL,
	"driver_id" text NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"status" "trip_status" DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicles" (
	"id" text PRIMARY KEY NOT NULL,
	"plate" text NOT NULL,
	"unit_number" text NOT NULL,
	"status" "vehicle_status" DEFAULT 'active' NOT NULL,
	"mileage" integer DEFAULT 0 NOT NULL,
	"last_service_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
