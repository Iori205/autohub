-- Login throttle in the database instead of process memory, so the limit holds
-- when requests land on different serverless instances (Vercel).
CREATE TABLE "LoginThrottle" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "until" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("key")
);

-- Same lockdown as 20261019010000_rls_lockdown (default privileges already revoke anon/authenticated).
ALTER TABLE "LoginThrottle" ENABLE ROW LEVEL SECURITY;
