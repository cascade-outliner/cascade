import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: ['.env.local', '.env'] })

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set configure it in .env.local')
}

export default defineConfig({
  out: './drizzle',
  schema: ['./src/**/*.schema.ts', '../../packages/auth/src/auth.schema.ts'],
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
