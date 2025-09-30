-- Add check constraints to feedback_responses table for additional database-level validation
-- Run this after Prisma migration to add extra security layer

-- Drop existing constraints if they exist (for re-running)
ALTER TABLE feedback_responses DROP CONSTRAINT IF EXISTS check_question1_rating;
ALTER TABLE feedback_responses DROP CONSTRAINT IF EXISTS check_question2_rating;
ALTER TABLE feedback_responses DROP CONSTRAINT IF EXISTS check_question3_rating;
ALTER TABLE feedback_responses DROP CONSTRAINT IF EXISTS check_question4_rating;
ALTER TABLE feedback_responses DROP CONSTRAINT IF EXISTS check_question5_rating;
ALTER TABLE feedback_responses DROP CONSTRAINT IF EXISTS check_comment_length;
ALTER TABLE feedback_responses DROP CONSTRAINT IF EXISTS check_username_length;
ALTER TABLE feedback_responses DROP CONSTRAINT IF EXISTS check_useremail_length;

-- Add check constraints for rating ranges (1-10)
ALTER TABLE feedback_responses
ADD CONSTRAINT check_question1_rating CHECK (question1_rating >= 1 AND question1_rating <= 10);

ALTER TABLE feedback_responses
ADD CONSTRAINT check_question2_rating CHECK (question2_rating >= 1 AND question2_rating <= 10);

ALTER TABLE feedback_responses
ADD CONSTRAINT check_question3_rating CHECK (question3_rating >= 1 AND question3_rating <= 10);

ALTER TABLE feedback_responses
ADD CONSTRAINT check_question4_rating CHECK (question4_rating >= 1 AND question4_rating <= 10);

ALTER TABLE feedback_responses
ADD CONSTRAINT check_question5_rating CHECK (question5_rating >= 1 AND question5_rating <= 10);

-- Add check constraint for comment length (5000 chars max)
ALTER TABLE feedback_responses
ADD CONSTRAINT check_comment_length CHECK (LENGTH(comment) <= 5000);

-- Add check constraint for userName length (255 chars max)
ALTER TABLE feedback_responses
ADD CONSTRAINT check_username_length CHECK (LENGTH(user_name) <= 255);

-- Add check constraint for userEmail length (255 chars max)
ALTER TABLE feedback_responses
ADD CONSTRAINT check_useremail_length CHECK (LENGTH(user_email) <= 255);

-- Verify constraints were added
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'feedback_responses'::regclass
  AND contype = 'c'
ORDER BY conname;