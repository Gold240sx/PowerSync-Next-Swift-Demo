import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const customerRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    // This simulates fetching the same data that would come from PowerSync
    // In a real implementation, you would query your database using Drizzle ORM
    return [
      { id: "1", name: "Customer 1" },
      { id: "2", name: "Customer 2" },
      { id: "3", name: "Customer 3" },
    ];
  }),
});
