-- The routine intentionally evaluates the current local day at call time.
-- Match its volatility declaration to clock_timestamp() so PostgreSQL does
-- not make stable-function assumptions around a changing day boundary.
alter function public.get_today_study_summary() volatile;
