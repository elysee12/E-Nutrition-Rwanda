import { Module, Global } from '@nestjs/common';
import { WHOClassificationService } from './services/who-classification.service';
import { EmailService } from './services/email.service';

@Global()
@Module({
  providers: [WHOClassificationService, EmailService],
  exports: [WHOClassificationService, EmailService],
})
export class CommonModule {}
