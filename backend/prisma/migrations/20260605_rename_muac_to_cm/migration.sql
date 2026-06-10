-- RenameField: muacMm -> muacCm in Assessment table
-- This migration converts MUAC measurements from millimeters to centimeters
-- 1 cm = 10 mm, so we divide existing values by 10

ALTER TABLE `assessments` 
ADD COLUMN `muacCm_temp` FLOAT NULL;

-- Convert existing mm values to cm (divide by 10)
UPDATE `assessments` 
SET `muacCm_temp` = `muacMm` / 10 
WHERE `muacMm` IS NOT NULL;

-- Drop old column and rename new one
ALTER TABLE `assessments` 
DROP COLUMN `muacMm`;

ALTER TABLE `assessments` 
RENAME COLUMN `muacCm_temp` TO `muacCm`;

-- Add NOT NULL constraint if needed
ALTER TABLE `assessments` 
MODIFY COLUMN `muacCm` FLOAT NOT NULL;
