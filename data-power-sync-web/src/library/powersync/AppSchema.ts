import { column, Schema, Table } from '@powersync/web';

// Table matching your actual Supabase table name
const powerSyncCounters = new Table(
  {
    // id column (text) is automatically included
    count: column.integer,
    owner_id: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const AppSchema = new Schema({
  power_sync_counters: powerSyncCounters
});

export type Database = (typeof AppSchema)['types'];
export type Counter = Database['power_sync_counters'];