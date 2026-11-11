-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "near_account_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "land_m2" INTEGER NOT NULL,
    "building_m2" INTEGER NOT NULL,
    "floors" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "list_price_idr" BIGINT NOT NULL,
    "cash_discount_pct" INTEGER NOT NULL,
    "down_payment_pct" INTEGER NOT NULL,
    "annual_rate_pct" DOUBLE PRECISION NOT NULL,
    "tenor_years" JSONB NOT NULL,
    "included" JSONB NOT NULL,
    "not_included" JSONB NOT NULL,
    "share_price_near" INTEGER NOT NULL,
    "total_shares" INTEGER NOT NULL,
    "shares_sold" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'funding',
    "onchain_project_id" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "designs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "size_m2" DOUBLE PRECISION NOT NULL,
    "panorama_url" TEXT NOT NULL,
    "initial_yaw" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hotspots" JSONB NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "amount_yocto" TEXT NOT NULL,
    "shares" INTEGER NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposals" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "onchain_proposal_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "yes_weight" INTEGER NOT NULL DEFAULT 0,
    "no_weight" INTEGER NOT NULL DEFAULT 0,
    "create_tx" TEXT,
    "finalized_tx" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "yes" BOOLEAN NOT NULL,
    "weight" INTEGER NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "onchain_loan_id" TEXT,
    "mode" TEXT NOT NULL,
    "tenor_months" INTEGER,
    "down_payment_idr" BIGINT,
    "principal_idr" BIGINT,
    "monthly_idr" BIGINT,
    "total_idr" BIGINT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "create_tx" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_periods" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "period_index" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "amount_idr" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'due',
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "schedule_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "period_index" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'simulator',
    "provider_ref" TEXT NOT NULL,
    "va_number" TEXT,
    "qr_payload" TEXT,
    "amount_idr" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT,
    "event_id" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "signature_valid" BOOLEAN NOT NULL,
    "duplicate" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repayment_receipts" (
    "id" TEXT NOT NULL,
    "loan_id" TEXT NOT NULL,
    "period_index" INTEGER NOT NULL,
    "amount_idr" BIGINT NOT NULL,
    "receipt_hash" TEXT NOT NULL,
    "paid_at_iso" TEXT NOT NULL,
    "tx_hash" TEXT,
    "error" TEXT,
    "recorded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repayment_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reference_photo_url" TEXT,
    "descriptor" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "distance" DOUBLE PRECISION,
    "method" TEXT,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_messages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "latency_ms" INTEGER,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_sites" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "target_audience" TEXT NOT NULL,
    "language" TEXT NOT NULL,

    CONSTRAINT "marketing_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_reports" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "week_of" TEXT NOT NULL,
    "report" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_project_id_key_key" ON "rooms"("project_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "votes_proposal_id_user_id_key" ON "votes"("proposal_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "schedule_periods_loan_id_period_index_key" ON "schedule_periods"("loan_id", "period_index");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_loan_id_period_index_idx" ON "payments"("loan_id", "period_index");

-- CreateIndex
CREATE INDEX "payment_events_event_id_idx" ON "payment_events"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "repayment_receipts_loan_id_period_index_key" ON "repayment_receipts"("loan_id", "period_index");

-- CreateIndex
CREATE INDEX "agent_messages_user_id_agent_idx" ON "agent_messages"("user_id", "agent");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_sites_key_key" ON "marketing_sites"("key");

-- AddForeignKey
ALTER TABLE "designs" ADD CONSTRAINT "designs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "proposals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_periods" ADD CONSTRAINT "schedule_periods_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayment_receipts" ADD CONSTRAINT "repayment_receipts_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_reports" ADD CONSTRAINT "marketing_reports_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "marketing_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
