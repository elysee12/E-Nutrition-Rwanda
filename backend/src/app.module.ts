import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ChildModule } from './child/child.module';
import { AssessmentModule } from './assessment/assessment.module';
import { FollowUpModule } from './follow-up/follow-up.module';
import { StatisticsModule } from './statistics/statistics.module';
import { FacilityModule } from './facility/facility.module';
import { ReferralModule } from './referral/referral.module';
import { ActivityModule } from './activity/activity.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    CommonModule,
    AuthModule,
    UserModule,
    FacilityModule,
    ChildModule,
    AssessmentModule,
    FollowUpModule,
    ReferralModule,
    ActivityModule,
    StatisticsModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
