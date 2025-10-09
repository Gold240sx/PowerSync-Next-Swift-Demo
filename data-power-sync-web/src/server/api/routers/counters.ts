import { z } from "zod"
import { eq } from "drizzle-orm"
import { randomUUID } from "crypto"
import EventEmitter, { on } from "events"
import { createClient } from '@supabase/supabase-js'

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"
import { counters } from "~/server/db/schema"
import { env } from "~/env"

// Create an event emitter for real-time updates
const ee = new EventEmitter()

// Initialize Supabase client for realtime subscriptions
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Subscribe to database changes from Supabase
console.log('🔌 Setting up Supabase realtime subscription for table: power_sync_counters');
const channel = supabase
  .channel('counter-changes')
  .on(
    'postgres_changes',
    {
      event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
      schema: 'public',
      table: 'power_sync_counters' // Corrected table name with underscore
    },
    (payload) => {
      console.log('🎉 Supabase realtime change detected:', payload);
      console.log('Event type:', payload.eventType);
      console.log('New data:', payload.new);
      console.log('📊 EventEmitter has', ee.listenerCount('update'), 'listeners');
      
      // Emit the change to all subscribed clients
      if (payload.eventType === 'DELETE') {
        console.log('Emitting DELETE event to', ee.listenerCount('update'), 'listeners');
        ee.emit('update', { deleted: true, id: payload.old.id });
      } else {
        // For INSERT and UPDATE, send the new data
        console.log('Emitting INSERT/UPDATE event to', ee.listenerCount('update'), 'listeners');
        ee.emit('update', payload.new);
      }
    }
  )
  .subscribe((status) => {
    console.log('📡 Supabase subscription status:', status);
    if (status === 'SUBSCRIBED') {
      console.log('✅ Successfully subscribed to Supabase realtime for power_sync_counters');
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.error('❌ Supabase subscription failed:', status);
    }
  });

// Define the Counter model schema matching database structure
const counterSchema = z.object({
  id: z.string().optional(),
  count: z.number().int().default(0),
  owner_id: z.string().nullish(),
  created_at: z.date().optional(),
})

export const countersRouter = createTRPCRouter({
  // Create a new counter
  create: publicProcedure
    .input(counterSchema.omit({ id: true, created_at: true }))
    .mutation(async ({ ctx, input }) => {
      // Generate a UUID for the id field since it's required
      const uuid = randomUUID();
      
      const result = await ctx.db.insert(counters).values({
        id: uuid,
        count: input.count,
        owner_id: input.owner_id || null,
      }).returning();
      
      // Event will be automatically triggered by Supabase realtime
      return result[0];
    }),

  // Get a counter by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.counters.findFirst({
        where: eq(counters.id, input.id)
      });
      
      return result;
    }),

  // Get all counters (with optional owner_id filter)
  getAll: publicProcedure
    .input(z.object({ owner_id: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (input?.owner_id) {
        return ctx.db.query.counters.findMany({
          where: eq(counters.owner_id, input.owner_id),
          orderBy: (counters, { desc }) => [desc(counters.created_at)],
        });
      }
      
      return ctx.db.query.counters.findMany({
        orderBy: (counters, { desc }) => [desc(counters.created_at)],
      });
    }),

  // Update a counter
  update: publicProcedure
    .input(z.object({
      id: z.string(),
      count: z.number().int(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.update(counters)
        .set({ count: input.count })
        .where(eq(counters.id, input.id))
        .returning();
      
      // Event will be automatically triggered by Supabase realtime
      return result[0];
    }),

  // Increment a counter
  increment: publicProcedure
    .input(z.object({
      id: z.string(),
      amount: z.number().int().default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // First get the current counter
      const counter = await ctx.db.query.counters.findFirst({
        where: eq(counters.id, input.id)
      });
      
      if (!counter) {
        throw new Error(`Counter with ID ${input.id} not found`);
      }
      
      // Increment the count (handle null count as 0)
      const currentCount = counter.count ?? 0;
      const newCount = currentCount + input.amount;
      
      // Update the counter
      const result = await ctx.db.update(counters)
        .set({ count: newCount })
        .where(eq(counters.id, input.id))
        .returning();
      
      // Event will be automatically triggered by Supabase realtime
      return result[0];
    }),

  // Delete a counter
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(counters)
        .where(eq(counters.id, input.id));
      
      // Event will be automatically triggered by Supabase realtime
      return { success: true, id: input.id };
    }),
  
  // Subscribe to counter updates in real-time
  // This subscription receives updates from Supabase Realtime (from ANY source - Swift app, web app, etc.)
  onUpdate: publicProcedure.subscription(async function* (opts) {
    console.log('🎯 Client subscribed to counter updates');
    
    // Listen for update events
    for await (const [data] of on(ee, 'update', {
      // Passing the AbortSignal automatically cancels the subscription when the client disconnects
      signal: opts.signal,
    })) {
      console.log('📡 Emitting update to client:', data);
      // Yield the updated counter data to the client
      yield data;
    }
    
    console.log('🔌 Client unsubscribed from counter updates');
  }),

  // Get the latest counter
  getLatest: publicProcedure
    .input(z.object({ owner_id: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (input?.owner_id) {
        return ctx.db.query.counters.findFirst({
          where: eq(counters.owner_id, input.owner_id),
          orderBy: (counters, { desc }) => [desc(counters.created_at)],
        });
      }
      
      return ctx.db.query.counters.findFirst({
        orderBy: (counters, { desc }) => [desc(counters.created_at)],
      });
    }),
})