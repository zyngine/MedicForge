-- =============================================================================
-- Migration: 20261123000001_schedule_attendance_auto_open_cron.sql
-- Description: Actually run the auto-open, on a schedule.
--
-- The functions in the previous migration do the work; this is what calls them
-- when nobody is logged in, which was the whole problem.
--
-- Guarded with unschedule-if-exists so re-running is safe, and so the schedule
-- can be changed by editing this file rather than by hand in the dashboard.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Every five minutes. A class opens within five minutes of its 15-minute lead,
-- so students can check in from roughly ten minutes before class starts.
SELECT cron.unschedule('attendance-auto-open')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'attendance-auto-open');

SELECT cron.schedule(
  'attendance-auto-open',
  '*/5 * * * *',
  $$SELECT open_due_sessions_all_tenants(15)$$
);

-- Daily. Keeps the rolling 60-day window of generated sessions topped up, so
-- there is always something on the calendar for the job above to open. 07:00
-- UTC is the small hours in US Eastern, well clear of any class.
SELECT cron.unschedule('attendance-generate-window')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'attendance-generate-window');

SELECT cron.schedule(
  'attendance-generate-window',
  '0 7 * * *',
  $$SELECT generate_sessions_all_tenants(60)$$
);
