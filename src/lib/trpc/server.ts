import { initTRPC } from "@trpc/server";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";

export const createTRPCContext = async () => {
  return { prisma };
};

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
