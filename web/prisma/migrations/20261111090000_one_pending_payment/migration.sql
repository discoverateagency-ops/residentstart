-- At most one pending payment per loan period (guards double-click across serverless instances)
CREATE UNIQUE INDEX IF NOT EXISTS "payments_one_pending_per_period" ON "payments" ("loan_id", "period_index") WHERE "status" = 'pending';
