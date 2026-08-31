-- AlterTable
ALTER TABLE "endpoints" ADD COLUMN "documentedStatuses" JSONB;
ALTER TABLE "endpoints" ADD COLUMN "requiresAuth" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "test_results" ADD COLUMN "probe" JSONB;
