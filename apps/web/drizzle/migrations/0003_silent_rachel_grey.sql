-- Keep one pending application per user/member_kind (newest by requested_at); close duplicates.
UPDATE "team_membership" AS keeper
SET
  "status" = 'rejected',
  "decided_at" = NOW(),
  "decision_note" = 'Closed duplicate pending application (migration)',
  "updated_at" = NOW()
WHERE keeper."status" = 'pending'
  AND keeper."id" NOT IN (
    SELECT DISTINCT ON ("user_id", "member_kind") "id"
    FROM "team_membership"
    WHERE "status" = 'pending'
    ORDER BY "user_id", "member_kind", "requested_at" DESC, "id" DESC
  );--> statement-breakpoint
CREATE UNIQUE INDEX "team_membership_user_kind_pending" ON "team_membership" USING btree ("user_id","member_kind") WHERE "team_membership"."status" = 'pending';