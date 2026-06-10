import { Module } from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { AssessmentController } from './assessment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WHOClassificationService } from '../common/services/who-classification.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [AssessmentController],
  providers: [AssessmentService, WHOClassificationService],
  exports: [AssessmentService],
})
export class AssessmentModule {}
