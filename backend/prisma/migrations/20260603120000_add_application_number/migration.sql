-- AlterTable
ALTER TABLE `children` ADD COLUMN `applicationNumber` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `children_applicationNumber_key` ON `children`(`applicationNumber`);

-- CreateIndex
CREATE INDEX `children_applicationNumber_idx` ON `children`(`applicationNumber`);
