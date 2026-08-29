-- Double-booking prevention.
--
-- Availability is computed in application code, but computation alone cannot
-- prevent two concurrent requests from both believing a slot is free. These
-- exclusion constraints move the guarantee into the database: PostgreSQL will
-- refuse to commit a second active assignment whose time range overlaps an
-- existing one for the same practitioner or the same room/equipment.
--
-- Intervals are half-open, '[)', so 10:00-11:00 and 11:00-12:00 coexist while
-- 10:00-11:00 and 10:30-11:30 conflict.
--
-- `WHERE (active)` means cancelled and expired bookings stop occupying the
-- slot without their history rows being deleted.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "BookingStaffAssignment"
  ADD CONSTRAINT "booking_staff_no_overlap"
  EXCLUDE USING gist (
    "staffId" WITH =,
    tstzrange("blockStartAt", "blockEndAt", '[)') WITH &&
  ) WHERE ("active");

ALTER TABLE "BookingResourceAssignment"
  ADD CONSTRAINT "booking_resource_no_overlap"
  EXCLUDE USING gist (
    "resourceId" WITH =,
    tstzrange("blockStartAt", "blockEndAt", '[)') WITH &&
  ) WHERE ("active");

-- Guard rails that belong in the database rather than only in validation code.
ALTER TABLE "Booking"
  ADD CONSTRAINT "booking_time_order" CHECK ("endAt" > "startAt"),
  ADD CONSTRAINT "booking_block_covers_appointment"
    CHECK ("blockStartAt" <= "startAt" AND "blockEndAt" >= "endAt");

ALTER TABLE "Review"
  ADD CONSTRAINT "review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "ScheduleRule"
  ADD CONSTRAINT "schedule_rule_minutes"
    CHECK ("startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute"),
  ADD CONSTRAINT "schedule_rule_dow" CHECK ("dayOfWeek" BETWEEN 0 AND 6);

-- Supports the "expire stale holds" sweep that runs before availability reads.
CREATE INDEX "Booking_pending_hold_idx"
  ON "Booking" ("holdExpiresAt")
  WHERE "status" = 'PENDING_PAYMENT';
