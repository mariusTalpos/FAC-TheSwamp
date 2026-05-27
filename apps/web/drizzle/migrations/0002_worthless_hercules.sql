CREATE TYPE "public"."event_lifecycle_status" AS ENUM('draft', 'published', 'registration_closed', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."event_registration_kind" AS ENUM('fighter', 'staff');--> statement-breakpoint
CREATE TYPE "public"."event_registration_status" AS ENUM('submitted', 'confirmed', 'waitlisted', 'withdrawn', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."schedule_entry_status" AS ENUM('planned', 'delayed', 'cancelled');--> statement-breakpoint
CREATE TABLE "event_registration" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"registration_kind" "event_registration_kind" NOT NULL,
	"staff_operational_role_key" text,
	"status" "event_registration_status" NOT NULL,
	"team_id" uuid,
	"team_membership_id" uuid,
	"team_name_snapshot" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"waitlisted_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"withdrawn_by_user_id" text,
	"withdrawal_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"venue_label" text NOT NULL,
	"lifecycle_status" "event_lifecycle_status" DEFAULT 'draft' NOT NULL,
	"is_sanctioned" boolean DEFAULT false NOT NULL,
	"sanctioning_notes" text,
	"organizer_user_id" text NOT NULL,
	"registration_opens_at" timestamp with time zone,
	"registration_closes_at" timestamp with time zone,
	"fighter_capacity" integer,
	"staff_capacity" jsonb,
	"fighter_confirmation_required_days_before" integer,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text
);
--> statement-breakpoint
CREATE TABLE "schedule_change_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_entry_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"field_name" text NOT NULL,
	"prior_value" text,
	"new_value" text,
	"reason" text,
	"actor_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"label" text NOT NULL,
	"scheduled_start_at" timestamp with time zone NOT NULL,
	"scheduled_end_at" timestamp with time zone,
	"duration_minutes" integer,
	"status" "schedule_entry_status" DEFAULT 'planned' NOT NULL,
	"venue_label_override" text,
	"event_registration_id" uuid,
	"placeholder_label" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_team_membership_id_team_membership_id_fk" FOREIGN KEY ("team_membership_id") REFERENCES "public"."team_membership"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_withdrawn_by_user_id_user_id_fk" FOREIGN KEY ("withdrawn_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_organizer_user_id_user_id_fk" FOREIGN KEY ("organizer_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_change_record" ADD CONSTRAINT "schedule_change_record_schedule_entry_id_schedule_entry_id_fk" FOREIGN KEY ("schedule_entry_id") REFERENCES "public"."schedule_entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_change_record" ADD CONSTRAINT "schedule_change_record_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_change_record" ADD CONSTRAINT "schedule_change_record_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_entry" ADD CONSTRAINT "schedule_entry_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_entry" ADD CONSTRAINT "schedule_entry_event_registration_id_event_registration_id_fk" FOREIGN KEY ("event_registration_id") REFERENCES "public"."event_registration"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "event_registration_event_user_kind_active" ON "event_registration" USING btree ("event_id","user_id","registration_kind") WHERE "event_registration"."status" IN ('confirmed', 'waitlisted', 'submitted');--> statement-breakpoint
CREATE INDEX "event_registration_event_id_idx" ON "event_registration" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_lifecycle_starts_at_idx" ON "event" USING btree ("lifecycle_status","starts_at");