// Prisma configuration for WhatsApp Automation
// Loads environment variables and configures database connection
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Uses DATABASE_URL from .env file
    // Format: postgresql://user:password@host:port/database
    url: process.env.DATABASE_URL!,
  },
});
