DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'patient',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetROM" DOUBLE PRECISION,
    "escalationFlag" BOOLEAN NOT NULL DEFAULT false,
    "escalationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "romAchieved" DOUBLE PRECISION,
    "validRepCount" INTEGER,
    "rejectedRepCount" INTEGER,
    "formQualityFlags" TEXT[],
    "groqSessionFeedback" TEXT,
    "formAccuracyScore" DOUBLE PRECISION,
    "painScorePre" INTEGER,
    "painScorePost" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "blockedReason" TEXT,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PainRecord" (
    "id" TEXT NOT NULL,
    "painScore" INTEGER NOT NULL,
    "timing" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    CONSTRAINT "PainRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PainRecord" ADD CONSTRAINT "PainRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PainRecord" ADD CONSTRAINT "PainRecord_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert Seed Data
INSERT INTO "User" ("id", "name", "email", "role") VALUES 
('test-user-id', 'Test User', 'test@example.com', 'patient');

INSERT INTO "Exercise" ("id", "name", "description", "targetROM") VALUES 
('ex-knee-id', 'Knee Flexion', 'Bending the knee joint.', 135),
('ex-shoulder-id', 'Shoulder Abduction', 'Raising the arm straight out to the side.', 180);

INSERT INTO "Session" ("id", "userId", "exerciseId", "date", "status", "romAchieved", "validRepCount", "rejectedRepCount", "formQualityFlags", "groqSessionFeedback", "formAccuracyScore", "painScorePre", "painScorePost") VALUES
('sess-1', 'test-user-id', 'ex-shoulder-id', current_date - interval '4 days', 'completed', 140, 8, 4, ARRAY['Jerky movement', 'Asymmetric compensation (shoulder tilt)'], 'You completed 8 valid reps with a max range of 140 degrees, but 4 reps were rejected. Try to keep your opposite shoulder still to avoid compensation next time.', 0.666, 3, 4),
('sess-2', 'test-user-id', 'ex-shoulder-id', current_date - interval '3 days', 'completed', 145, 10, 2, ARRAY['Jerky movement'], 'Good effort today hitting 145 degrees over 10 valid reps. Your form is improving, but continue to focus on smooth, controlled movements.', 0.833, 2, 3),
('sess-3', 'test-user-id', 'ex-shoulder-id', current_date - interval '2 days', 'completed', 155, 12, 1, ARRAY[]::TEXT[], 'Excellent session. You reached 155 degrees and completed 12 clean reps with steady form.', 0.923, 1, 2),
('sess-4', 'test-user-id', 'ex-shoulder-id', current_date - interval '1 days', 'completed', 160, 12, 0, ARRAY[]::TEXT[], 'Great consistency! 12 valid reps and a new max of 160 degrees with perfect form. Keep it up.', 1.0, 1, 1),
('sess-5', 'test-user-id', 'ex-shoulder-id', current_date, 'completed', 150, 9, 3, ARRAY['Asymmetric compensation (shoulder tilt)'], 'You completed 9 valid reps today but had 3 rejected due to form issues. Noticeable shoulder tilt was detected; remember to stay aligned.', 0.75, 2, 4);
