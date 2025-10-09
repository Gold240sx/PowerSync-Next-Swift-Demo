import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc"
// Routers
import { customerRouter } from "~/server/api/routers/customer"
import { postRouter } from "~/server/api/routers/post"
import { countersRouter } from "~/server/api/routers/counters"

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	post: postRouter,
	customer: customerRouter,
	counters: countersRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter)
