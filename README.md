# WellTrack Mini App

Telegram Mini App for the WellTrack coach. Static page, no build step.
Reads Supabase (`wt_recipes`, `wt_meals`, `wt_daily_nutrition_summary`, and the
coach tracking tables) with the anon key, read-only — row level security is what
protects the data, and writes are done by the bot with its secret key.

Source of truth lives in `clio/miniapp/`; this repo is the deploy target.
