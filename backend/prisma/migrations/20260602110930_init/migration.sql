-- CreateTable
CREATE TABLE `facilities` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('HEALTH_CENTER', 'HEALTH_POST', 'DISTRICT_HOSPITAL', 'REFERRAL_HOSPITAL') NOT NULL,
    `province` VARCHAR(191) NOT NULL,
    `district` VARCHAR(191) NOT NULL,
    `sector` VARCHAR(191) NULL,
    `directorName` VARCHAR(191) NULL,
    `facilityPhone` VARCHAR(191) NULL,
    `facilityEmail` VARCHAR(191) NULL,
    `staffCount` INTEGER NOT NULL DEFAULT 0,
    `childrenCount` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('Active', 'Pending', 'Suspended') NOT NULL DEFAULT 'Active',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `facilities_code_key`(`code`),
    INDEX `facilities_province_district_idx`(`province`, `district`),
    INDEX `facilities_status_idx`(`status`),
    INDEX `facilities_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'DATA_MANAGER', 'NURSE', 'CHW') NOT NULL,
    `status` ENUM('Active', 'Suspended', 'Pending') NOT NULL DEFAULT 'Active',
    `facilityId` VARCHAR(191) NULL,
    `province` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `sector` VARCHAR(191) NULL,
    `cell` VARCHAR(191) NULL,
    `village` VARCHAR(191) NULL,
    `lastLogin` DATETIME(3) NULL,
    `loginAttempts` INTEGER NOT NULL DEFAULT 0,
    `passwordResetToken` VARCHAR(191) NULL,
    `passwordResetExpires` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_code_key`(`code`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_role_idx`(`role`),
    INDEX `users_facilityId_idx`(`facilityId`),
    INDEX `users_status_idx`(`status`),
    INDEX `users_village_sector_idx`(`village`, `sector`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `children` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `sex` ENUM('M', 'F') NOT NULL,
    `dateOfBirth` DATETIME(3) NOT NULL,
    `ageMonths` INTEGER NOT NULL,
    `fatherName` VARCHAR(191) NULL,
    `motherName` VARCHAR(191) NULL,
    `caregiverName` VARCHAR(191) NULL,
    `caregiverNationalId` VARCHAR(191) NULL,
    `caregiverPhone` VARCHAR(191) NULL,
    `caregiverRelation` VARCHAR(191) NULL,
    `otherInfo` TEXT NULL,
    `province` VARCHAR(191) NOT NULL,
    `district` VARCHAR(191) NOT NULL,
    `sector` VARCHAR(191) NOT NULL,
    `cell` VARCHAR(191) NOT NULL,
    `village` VARCHAR(191) NOT NULL,
    `facilityId` VARCHAR(191) NOT NULL,
    `currentStatus` ENUM('Normal', 'MAM', 'SAM', 'Stunting', 'Underweight', 'Wasting') NOT NULL DEFAULT 'Normal',
    `lastAssessmentDate` DATETIME(3) NULL,
    `registeredById` VARCHAR(191) NOT NULL,
    `registeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `children_code_key`(`code`),
    INDEX `children_code_idx`(`code`),
    INDEX `children_facilityId_idx`(`facilityId`),
    INDEX `children_currentStatus_idx`(`currentStatus`),
    INDEX `children_village_sector_idx`(`village`, `sector`),
    INDEX `children_registeredById_idx`(`registeredById`),
    INDEX `children_isActive_idx`(`isActive`),
    FULLTEXT INDEX `children_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessments` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` ENUM('INITIAL_SCREENING', 'CLINICAL_REVIEW', 'FOLLOW_UP', 'EMERGENCY') NOT NULL DEFAULT 'CLINICAL_REVIEW',
    `childId` VARCHAR(191) NOT NULL,
    `facilityId` VARCHAR(191) NOT NULL,
    `assessedById` VARCHAR(191) NOT NULL,
    `weightKg` DOUBLE NOT NULL,
    `heightCm` DOUBLE NOT NULL,
    `muacMm` DOUBLE NOT NULL,
    `zScoreWFH` DOUBLE NULL,
    `zScoreHFA` DOUBLE NULL,
    `zScoreWFA` DOUBLE NULL,
    `nutritionStatus` ENUM('Normal', 'MAM', 'SAM', 'Stunting', 'Underweight', 'Wasting') NOT NULL,
    `isSAM` BOOLEAN NOT NULL DEFAULT false,
    `isMAM` BOOLEAN NOT NULL DEFAULT false,
    `isStunted` BOOLEAN NOT NULL DEFAULT false,
    `isUnderweight` BOOLEAN NOT NULL DEFAULT false,
    `isWasted` BOOLEAN NOT NULL DEFAULT false,
    `hasOedema` BOOLEAN NULL DEFAULT false,
    `oedemaGrade` VARCHAR(191) NULL,
    `appetite` VARCHAR(191) NULL,
    `clinicalSigns` TEXT NULL,
    `diagnosis` TEXT NULL,
    `recommendations` TEXT NULL,
    `interventions` JSON NULL,
    `requiresFollowUp` BOOLEAN NOT NULL DEFAULT false,
    `followUpDate` DATETIME(3) NULL,
    `assessmentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `assessments_code_key`(`code`),
    INDEX `assessments_childId_idx`(`childId`),
    INDEX `assessments_facilityId_idx`(`facilityId`),
    INDEX `assessments_assessedById_idx`(`assessedById`),
    INDEX `assessments_nutritionStatus_idx`(`nutritionStatus`),
    INDEX `assessments_isSAM_isMAM_idx`(`isSAM`, `isMAM`),
    INDEX `assessments_assessmentDate_idx`(`assessmentDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `follow_ups` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `childId` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NULL,
    `scheduledDate` DATETIME(3) NOT NULL,
    `completedDate` DATETIME(3) NULL,
    `status` ENUM('Scheduled', 'Completed', 'Missed', 'Rescheduled', 'Cancelled') NOT NULL DEFAULT 'Scheduled',
    `conductedById` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    `outcome` TEXT NULL,
    `nextFollowUp` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `follow_ups_code_key`(`code`),
    INDEX `follow_ups_childId_idx`(`childId`),
    INDEX `follow_ups_assessmentId_idx`(`assessmentId`),
    INDEX `follow_ups_scheduledDate_idx`(`scheduledDate`),
    INDEX `follow_ups_status_idx`(`status`),
    INDEX `follow_ups_conductedById_idx`(`conductedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `referrals` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `childId` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `fromFacilityId` VARCHAR(191) NOT NULL,
    `toFacilityId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `urgency` VARCHAR(191) NOT NULL DEFAULT 'Routine',
    `status` ENUM('Pending', 'Accepted', 'Completed', 'Missed') NOT NULL DEFAULT 'Pending',
    `madeById` VARCHAR(191) NOT NULL,
    `referralDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acceptedDate` DATETIME(3) NULL,
    `completedDate` DATETIME(3) NULL,
    `clinicalNotes` TEXT NULL,
    `transportArranged` BOOLEAN NOT NULL DEFAULT false,
    `outcome` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `referrals_code_key`(`code`),
    UNIQUE INDEX `referrals_assessmentId_key`(`assessmentId`),
    INDEX `referrals_childId_idx`(`childId`),
    INDEX `referrals_assessmentId_idx`(`assessmentId`),
    INDEX `referrals_fromFacilityId_idx`(`fromFacilityId`),
    INDEX `referrals_toFacilityId_idx`(`toFacilityId`),
    INDEX `referrals_status_idx`(`status`),
    INDEX `referrals_referralDate_idx`(`referralDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `growth_records` (
    `id` VARCHAR(191) NOT NULL,
    `childId` VARCHAR(191) NOT NULL,
    `ageMonths` INTEGER NOT NULL,
    `weightKg` DOUBLE NOT NULL,
    `heightCm` DOUBLE NOT NULL,
    `muacMm` DOUBLE NULL,
    `zScoreWFH` DOUBLE NULL,
    `zScoreHFA` DOUBLE NULL,
    `zScoreWFA` DOUBLE NULL,
    `status` ENUM('Normal', 'MAM', 'SAM', 'Stunting', 'Underweight', 'Wasting') NOT NULL DEFAULT 'Normal',
    `measuredDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `growth_records_childId_measuredDate_idx`(`childId`, `measuredDate`),
    INDEX `growth_records_ageMonths_idx`(`ageMonths`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activities` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('CHILD_REGISTRATION', 'ASSESSMENT_CREATED', 'ASSESSMENT_UPDATED', 'FOLLOW_UP_COMPLETED', 'REFERRAL_MADE', 'USER_CREATED', 'USER_UPDATED', 'FACILITY_REGISTERED', 'DATA_SYNCED') NOT NULL,
    `userId` VARCHAR(191) NULL,
    `facilityId` VARCHAR(191) NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activities_userId_idx`(`userId`),
    INDEX `activities_facilityId_idx`(`facilityId`),
    INDEX `activities_type_idx`(`type`),
    INDEX `activities_createdAt_idx`(`createdAt`),
    INDEX `activities_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `facility_stats` (
    `id` VARCHAR(191) NOT NULL,
    `facilityId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `totalScreened` INTEGER NOT NULL DEFAULT 0,
    `newRegistrations` INTEGER NOT NULL DEFAULT 0,
    `samCases` INTEGER NOT NULL DEFAULT 0,
    `mamCases` INTEGER NOT NULL DEFAULT 0,
    `stuntingCases` INTEGER NOT NULL DEFAULT 0,
    `followUpsCompleted` INTEGER NOT NULL DEFAULT 0,
    `followUpsMissed` INTEGER NOT NULL DEFAULT 0,
    `referralsMade` INTEGER NOT NULL DEFAULT 0,
    `referralsReceived` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `facility_stats_year_month_idx`(`year`, `month`),
    UNIQUE INDEX `facility_stats_facilityId_year_month_key`(`facilityId`, `year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chw_stats` (
    `id` VARCHAR(191) NOT NULL,
    `chwId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `childrenScreened` INTEGER NOT NULL DEFAULT 0,
    `samIdentified` INTEGER NOT NULL DEFAULT 0,
    `mamIdentified` INTEGER NOT NULL DEFAULT 0,
    `referralsMade` INTEGER NOT NULL DEFAULT 0,
    `homeVisits` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `chw_stats_year_month_idx`(`year`, `month`),
    UNIQUE INDEX `chw_stats_chwId_year_month_key`(`chwId`, `year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `children` ADD CONSTRAINT `children_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `children` ADD CONSTRAINT `children_registeredById_fkey` FOREIGN KEY (`registeredById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_childId_fkey` FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_assessedById_fkey` FOREIGN KEY (`assessedById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follow_ups` ADD CONSTRAINT `follow_ups_childId_fkey` FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follow_ups` ADD CONSTRAINT `follow_ups_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follow_ups` ADD CONSTRAINT `follow_ups_conductedById_fkey` FOREIGN KEY (`conductedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_childId_fkey` FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_fromFacilityId_fkey` FOREIGN KEY (`fromFacilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_toFacilityId_fkey` FOREIGN KEY (`toFacilityId`) REFERENCES `facilities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referrals` ADD CONSTRAINT `referrals_madeById_fkey` FOREIGN KEY (`madeById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `growth_records` ADD CONSTRAINT `growth_records_childId_fkey` FOREIGN KEY (`childId`) REFERENCES `children`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `activities_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activities` ADD CONSTRAINT `activities_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `facility_stats` ADD CONSTRAINT `facility_stats_facilityId_fkey` FOREIGN KEY (`facilityId`) REFERENCES `facilities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chw_stats` ADD CONSTRAINT `chw_stats_chwId_fkey` FOREIGN KEY (`chwId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
