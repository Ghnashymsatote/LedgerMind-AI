import { Prisma, PrismaClient } from "@ledgermind/database";
import { z } from "zod";
import { hashPassword } from "./lib/password.js";
import { email, newPassword, role } from "./modules/auth/auth.schema.js";

async function main() {
  const args = z.tuple([email, role]).safeParse(process.argv.slice(2));
  if (!args.success || process.stdin.isTTY) {
    throw new Error("Usage: pipe a password into user:create <email> <ADMIN|OPERATOR>.");
  }

  process.stdin.setEncoding("utf8");
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
    if (input.length > 130) throw new Error("Password must be 12–128 characters on one line.");
  }
  const password = newPassword.safeParse(input.replace(/\r?\n$/, ""));
  if (!password.success) throw new Error("Password must be 12–128 characters on one line.");

  const [address, userRole] = args.data;
  const db = new PrismaClient();
  try {
    await db.user.create({
      data: { email: address, role: userRole, passwordHash: await hashPassword(password.data) },
      select: { id: true },
    });
    console.log(`Created ${userRole} account for ${address}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    console.error("An account with that email already exists.");
  } else {
    console.error(error instanceof Prisma.PrismaClientKnownRequestError
      ? "The account could not be created in PostgreSQL."
      : error instanceof Error && !error.constructor.name.startsWith("Prisma")
        ? error.message
        : "The account could not be created.");
  }
  process.exitCode = 1;
});
