-- Clinical Scheduling Workflow: Step 1 of 2
-- ONLY extends the booking_status enum.
--
-- IMPORTANT: Run this file first in the Supabase Dashboard SQL editor,
-- then run 20250312000005_clinical_scheduling_workflow_schema.sql.
-- PostgreSQL requires ALTER TYPE ... ADD VALUE to be committed before
-- the new values can be used in views or functions.

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending_poc_approval';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'poc_approved';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'poc_denied';
