-- CreateTable: platform_metrics
CREATE TABLE "platform_metrics" (
    "id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "summary" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_metrics_pkey" PRIMARY KEY ("id")
);

-- Unique index to ensure one report per day.
CREATE UNIQUE INDEX "platform_metrics_period_start_period_end_key"
    ON "platform_metrics"("period_start", "period_end");

-- Index for fast lookup of latest reports.
CREATE INDEX "platform_metrics_period_end_idx"
    ON "platform_metrics"("period_end");
