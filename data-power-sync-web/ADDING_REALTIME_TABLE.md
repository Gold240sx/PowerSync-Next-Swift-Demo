# Adding a New Table with Real-Time Updates

This guide shows you how to add a new database table with full CRUD operations and real-time updates across all your apps (Swift, Next.js, etc.).

## Step 1: Create the Database Table in Supabase

Go to your Supabase dashboard and create a new table:

```sql
CREATE TABLE public.power_sync_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add an index on owner_id for better query performance
CREATE INDEX items_owner_idx ON public.power_sync_items(owner_id);
```

**Enable Realtime:**
1. In Supabase dashboard → Database → Tables → `power_sync_items`
2. Toggle "Enable Realtime" to ON
3. Go to Database → Replication
4. Ensure `power_sync_items` is enabled for replication

## Step 2: Add to PowerSync Schema

Update `src/library/powersync/AppSchema.ts`:

```typescript
import { column, Schema, Table } from '@powersync/web';

// Existing counters table
const powerSyncCounters = new Table(
  {
    count: column.integer,
    owner_id: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

// New items table
const powerSyncItems = new Table(
  {
    name: column.text,
    description: column.text,
    owner_id: column.text,
    created_at: column.text
  },
  { indexes: {} }
);

export const AppSchema = new Schema({
  'power_sync-counters': powerSyncCounters,
  'power_sync_items': powerSyncItems  // Add new table
});

export type Database = (typeof AppSchema)['types'];
export type Counter = Database['power_sync-counters'];
export type Item = Database['power_sync_items'];
```

## Step 3: Add to Drizzle Schema

Update `src/server/db/schema.ts`:

```typescript
export const items = createTable(
  "items",
  (d) => ({
    id: d.text().primaryKey(),
    name: d.text().notNull(),
    description: d.text(),
    owner_id: d.text(),
    created_at: d
      .timestamp({ withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  }),
  (t) => [index("items_owner_idx").on(t.owner_id)],
);
```

## Step 4: Create tRPC Router

Create `src/server/api/routers/items.ts`:

```typescript
import { z } from "zod"
import { eq } from "drizzle-orm"
import { randomUUID } from "crypto"
import EventEmitter, { on } from "events"
import { createClient } from '@supabase/supabase-js'

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"
import { items } from "~/server/db/schema"
import { env } from "~/env"

// Create an event emitter for real-time updates
const ee = new EventEmitter()

// Initialize Supabase client for realtime subscriptions
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Subscribe to database changes from Supabase
console.log('🔌 Setting up Supabase realtime subscription for table: power_sync_items');
const channel = supabase
  .channel('item-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
      schema: 'public',
      table: 'power_sync_items'
    },
    (payload) => {
      console.log('🎉 Supabase realtime change detected:', payload);
      console.log('Event type:', payload.eventType);
      console.log('📊 EventEmitter has', ee.listenerCount('update'), 'listeners');
      
      // Emit the change to all subscribed clients
      if (payload.eventType === 'DELETE') {
        console.log('Emitting DELETE event');
        ee.emit('update', { deleted: true, id: payload.old.id });
      } else {
        console.log('Emitting INSERT/UPDATE event');
        ee.emit('update', payload.new);
      }
    }
  )
  .subscribe((status) => {
    console.log('📡 Supabase subscription status:', status);
    if (status === 'SUBSCRIBED') {
      console.log('✅ Successfully subscribed to Supabase realtime for power_sync_items');
    }
  });

const itemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  owner_id: z.string().nullish(),
  created_at: z.date().optional(),
})

export const itemsRouter = createTRPCRouter({
  // Get all items
  getAll: publicProcedure
    .input(z.object({ owner_id: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (input?.owner_id) {
        return ctx.db.query.items.findMany({
          where: eq(items.owner_id, input.owner_id),
          orderBy: (items, { desc }) => [desc(items.created_at)],
        });
      }
      
      return ctx.db.query.items.findMany({
        orderBy: (items, { desc }) => [desc(items.created_at)],
      });
    }),

  // Create a new item
  create: publicProcedure
    .input(itemSchema.omit({ id: true, created_at: true }))
    .mutation(async ({ ctx, input }) => {
      const uuid = randomUUID();
      
      const result = await ctx.db.insert(items).values({
        id: uuid,
        name: input.name,
        description: input.description,
        owner_id: input.owner_id || null,
      }).returning();
      
      return result[0];
    }),

  // Update an item
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.update(items)
        .set({
          name: input.name,
          description: input.description,
        })
        .where(eq(items.id, input.id))
        .returning();
      
      return result[0];
    }),

  // Delete an item
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(items)
        .where(eq(items.id, input.id));
      
      return { success: true, id: input.id };
    }),
  
  // Subscribe to item updates in real-time
  onUpdate: publicProcedure.subscription(async function* (opts) {
    console.log('🎯 Client subscribed to item updates');
    
    for await (const [data] of on(ee, 'update', {
      signal: opts.signal,
    })) {
      console.log('📡 Emitting update to client:', data);
      yield data;
    }
    
    console.log('🔌 Client unsubscribed from item updates');
  }),
})
```

## Step 5: Add Router to Root

Update `src/server/api/root.ts`:

```typescript
import { itemsRouter } from "~/server/api/routers/items";
import { customerRouter } from "~/server/api/routers/customer";
import { postRouter } from "~/server/api/routers/post";
import { countersRouter } from "~/server/api/routers/counters";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  post: postRouter,
  customer: customerRouter,
  counters: countersRouter,
  items: itemsRouter,  // Add your new router
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
```

## Step 6: Create Client Component

Create `src/app/_components/ItemsList.tsx`:

```typescript
"use client";

import { Loader2, Trash2 } from "lucide-react";
import { api as clientApi } from "~/trpc/react";

export function ItemsList() {
  // Use tRPC for data fetching
  const { data: items, isLoading, refetch } = clientApi.items.getAll.useQuery({});
  
  // Subscribe to real-time updates
  clientApi.items.onUpdate.useSubscription(undefined, {
    onStarted: () => {
      console.log('✅ Subscribed to item updates');
    },
    onData: (update) => {
      console.log('🔔 Received item update:', update);
      refetch();
    },
    onError: (err) => {
      console.error('❌ Subscription error:', err);
    },
  });
  
  // Delete mutation
  const deleteItem = clientApi.items.delete.useMutation({
    onSuccess: () => {
      console.log('Item deleted');
    }
  });
  
  const handleDelete = (id: string) => {
    if (confirm("Delete this item?")) {
      deleteItem.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">Items</h2>
      <ul className="space-y-2">
        {items?.map((item: any) => (
          <li key={item.id} className="p-3 border rounded-md flex justify-between items-center">
            <div>
              <p className="font-medium">{item.name}</p>
              {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
            </div>
            <button 
              onClick={() => handleDelete(item.id)}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Step 7: Use the Component

In your page or wherever you want to display items:

```typescript
import { ItemsList } from "~/app/_components/ItemsList";

export default function MyPage() {
  return (
    <div className="p-6">
      <ItemsList />
    </div>
  );
}
```

## Step 8: Configure PowerSync Sync Rules

In your PowerSync dashboard, add sync rules for the new table:

```yaml
bucket_definitions:
  global:
    data:
      - SELECT * FROM counters
      - SELECT * FROM power_sync_items  # Add your new table
```

## Important Notes

### Real-Time Update Flow:

```
Swift App → Supabase Database → Supabase Realtime
                                       ↓
                               Next.js Server (EventEmitter)
                                       ↓
                               tRPC Subscription (SSE)
                                       ↓
                               Browser Client → UI Updates
```

### Checklist for Each New Table:

- [ ] Create table in Supabase
- [ ] Enable Realtime in Supabase for the table
- [ ] Enable Replication in Supabase for the table
- [ ] Add to PowerSync AppSchema
- [ ] Add to Drizzle schema
- [ ] Create tRPC router with:
  - [ ] Supabase Realtime subscription
  - [ ] EventEmitter for broadcasting
  - [ ] CRUD operations (getAll, create, update, delete)
  - [ ] `onUpdate` subscription procedure
- [ ] Add router to root AppRouter
- [ ] Create client component with `useSubscription` hook
- [ ] Add PowerSync sync rules in dashboard

### Troubleshooting

**If real-time updates aren't working:**

1. Check server console for "✅ Successfully subscribed to Supabase realtime"
2. Verify table name matches exactly in:
   - Supabase table name
   - Supabase subscription config
   - PowerSync schema
3. Ensure Supabase Realtime is enabled for the table
4. Check browser console for "✅ Subscribed to [table] updates"
5. Test by making a change from another source (Swift app, SQL editor, etc.)

**Common Issues:**

- **Table name mismatch**: Supabase uses underscores, ensure consistency
- **Realtime not enabled**: Check Supabase dashboard settings
- **Replication not enabled**: Required for PowerSync
- **Wrong schema in subscription**: Must be 'public' for most cases

## Example: Testing Real-Time Updates

1. Open your Next.js app in a browser
2. Open Supabase SQL Editor
3. Run: `UPDATE power_sync_items SET name = 'Updated!' WHERE id = 'some-id';`
4. Watch your Next.js app update automatically without refresh!

Or update from your Swift app and see changes appear instantly in the web app.

## Performance Tips

- Use indexes on frequently queried columns (especially foreign keys)
- Use `tracked()` in subscriptions for automatic reconnection support
- Consider adding `lastEventId` input to subscriptions for missed events recovery
- Limit subscription payload size for large datasets

## Advanced: Using tracked() for Resilient Subscriptions

For production apps, use the `tracked()` helper from tRPC to ensure no events are missed during reconnections:

```typescript
import { tracked } from '@trpc/server';

onUpdate: publicProcedure
  .input(z.object({ lastEventId: z.string().nullish() }).optional())
  .subscription(async function* (opts) {
    // Fetch missed events if client reconnected
    if (opts.input?.lastEventId) {
      // Query events since lastEventId and yield them first
      const missedEvents = await ctx.db.query.items.findMany({
        where: gt(items.created_at, opts.input.lastEventId)
      });
      
      for (const event of missedEvents) {
        yield tracked(event.id, event);
      }
    }
    
    // Then listen for new events
    for await (const [data] of on(ee, 'update', { signal: opts.signal })) {
      yield tracked(data.id, data);
    }
  }),
```

This ensures clients don't miss updates even if they temporarily disconnect!

## Summary

With this setup, you get:
- ✅ Full CRUD operations via tRPC
- ✅ Real-time updates from ANY source (Swift, web, SQL editor)
- ✅ Automatic UI updates without manual refresh
- ✅ Event-driven architecture (no polling!)
- ✅ Automatic reconnection and error recovery
- ✅ Type-safe end-to-end with TypeScript
