CREATE TYPE "public"."team_member_kind" AS ENUM('fighter', 'squire');--> statement-breakpoint
CREATE TYPE "public"."team_membership_status" AS ENUM('pending', 'active', 'rejected', 'ended');--> statement-breakpoint
CREATE TYPE "public"."team_status" AS ENUM('active', 'deactivated');--> statement-breakpoint
CREATE TABLE "team_captain_assignment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"assigned_by_user_id" text NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_to" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "team_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"member_kind" "team_member_kind" NOT NULL,
	"status" "team_membership_status" DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"decided_by_user_id" text,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"region" text,
	"tier_or_division" text,
	"contact_email" text,
	"contact_phone" text,
	"status" "team_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "expires_at" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "team_captain_assignment" ADD CONSTRAINT "team_captain_assignment_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_captain_assignment" ADD CONSTRAINT "team_captain_assignment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_captain_assignment" ADD CONSTRAINT "team_captain_assignment_assigned_by_user_id_user_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_membership" ADD CONSTRAINT "team_membership_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_membership" ADD CONSTRAINT "team_membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_membership" ADD CONSTRAINT "team_membership_decided_by_user_id_user_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "team_captain_assignment_team_user_active" ON "team_captain_assignment" USING btree ("team_id","user_id") WHERE "team_captain_assignment"."valid_to" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "team_membership_user_kind_active" ON "team_membership" USING btree ("user_id","member_kind") WHERE "team_membership"."status" = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "team_membership_user_team_kind_pending" ON "team_membership" USING btree ("user_id","team_id","member_kind") WHERE "team_membership"."status" = 'pending';