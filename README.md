# PowerSync-Next-Swift-Demo

This app is a simple demo between a SwiftUI app and a Next.js app.

The SwiftUI App (for MacOS) uses PowerSync to sync real-time data to Postgres (Supabase)with offline app support.

The Next.js app (for web) uses Drizzle and TRPC to sync data to the same database. It updates the UI based upon event changes in the database.

Both are enhanced for speed and code-simplicity.

## How it works

The two apps working in parrellel define updates to a table called "counters". which allow increment, delete, and create operations.
