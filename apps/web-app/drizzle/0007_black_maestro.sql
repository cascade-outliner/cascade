-- due_date moves from timestamptz (an instant) to date (a calendar day) —
-- see #323. Existing values are backfilled to their UTC calendar day; the
-- original timezone the day was picked in isn't recoverable, and UTC is
-- this app's own server/session timezone convention.
ALTER TABLE "nodes" ALTER COLUMN "due_date" TYPE date USING (due_date AT TIME ZONE 'UTC')::date;