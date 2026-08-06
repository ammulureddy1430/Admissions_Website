-- Preserve every game and assignment while replacing game-domain grade
-- categorization with the canonical age-group labels.
ALTER TABLE "games" RENAME COLUMN "grade" TO "age_group";
ALTER TABLE "GameAssessment" RENAME COLUMN "grade" TO "age_group";
ALTER TABLE "RealTimeGameAssignments" RENAME COLUMN "grade" TO "age_group";

UPDATE "games"
SET "age_group" = CASE lower(trim("age_group"))
  WHEN 'nursery' THEN '3–4 Years'
  WHEN 'pre-nursery' THEN '3–4 Years'
  WHEN 'preschool' THEN '3–4 Years'
  WHEN 'lkg' THEN '4–5 Years'
  WHEN 'kindergarten' THEN '4–5 Years'
  WHEN 'ukg' THEN '5–7 Years'
  WHEN 'grade 1' THEN '5–7 Years'
  WHEN 'class 1' THEN '5–7 Years'
  WHEN 'grade 2' THEN '7–9 Years'
  WHEN 'class 2' THEN '7–9 Years'
  WHEN 'grade 3' THEN '7–9 Years'
  WHEN 'class 3' THEN '7–9 Years'
  WHEN 'grade 4' THEN '9–11 Years'
  WHEN 'class 4' THEN '9–11 Years'
  WHEN 'grade 5' THEN '9–11 Years'
  WHEN 'class 5' THEN '9–11 Years'
  WHEN 'grade 6' THEN '11–13 Years'
  WHEN 'class 6' THEN '11–13 Years'
  WHEN 'grade 7' THEN '11–13 Years'
  WHEN 'class 7' THEN '11–13 Years'
  ELSE '13–16 Years'
END;

-- The registered catalog gives legacy "All ages" games a concrete supported
-- age group. Follow the Lights is explicitly the 3–4 Years game.
UPDATE "games" SET "age_group" = CASE "slug"
  WHEN 'follow-the-lights' THEN '3–4 Years'
  WHEN 'balloon-popper' THEN '4–5 Years'
  WHEN 'fishing-master' THEN '5–7 Years'
  WHEN 'maze-dash' THEN '5–7 Years'
  WHEN 'airport-controller' THEN '9–11 Years'
  WHEN 'bridge-builder' THEN '9–11 Years'
  WHEN 'factory-automation' THEN '11–13 Years'
  WHEN 'robot-programming' THEN '11–13 Years'
  ELSE '7–9 Years'
END;

UPDATE "GameAssessment"
SET "age_group" = CASE lower(trim("age_group"))
  WHEN 'nursery' THEN '3–4 Years' WHEN 'pre-nursery' THEN '3–4 Years' WHEN 'preschool' THEN '3–4 Years'
  WHEN 'lkg' THEN '4–5 Years' WHEN 'kindergarten' THEN '4–5 Years'
  WHEN 'ukg' THEN '5–7 Years' WHEN 'grade 1' THEN '5–7 Years' WHEN 'class 1' THEN '5–7 Years'
  WHEN 'grade 2' THEN '7–9 Years' WHEN 'class 2' THEN '7–9 Years' WHEN 'grade 3' THEN '7–9 Years' WHEN 'class 3' THEN '7–9 Years'
  WHEN 'grade 4' THEN '9–11 Years' WHEN 'class 4' THEN '9–11 Years' WHEN 'grade 5' THEN '9–11 Years' WHEN 'class 5' THEN '9–11 Years'
  WHEN 'grade 6' THEN '11–13 Years' WHEN 'class 6' THEN '11–13 Years' WHEN 'grade 7' THEN '11–13 Years' WHEN 'class 7' THEN '11–13 Years'
  ELSE '13–16 Years'
END;

UPDATE "RealTimeGameAssignments" assignment
SET "age_group" = game."age_group"
FROM "games" game
WHERE game."id" = assignment."gameId";

DROP INDEX IF EXISTS "games_category_grade_idx";
DROP INDEX IF EXISTS "GameAssessment_schoolId_grade_subject_idx";
DROP INDEX IF EXISTS "RealTimeGameAssignments_schoolId_gameId_grade_status_idx";
CREATE INDEX "games_category_age_group_idx" ON "games"("category", "age_group");
CREATE INDEX "GameAssessment_schoolId_age_group_subject_idx" ON "GameAssessment"("schoolId", "age_group", "subject");
CREATE INDEX "RealTimeGameAssignments_schoolId_gameId_age_group_status_idx" ON "RealTimeGameAssignments"("schoolId", "gameId", "age_group", "status");
