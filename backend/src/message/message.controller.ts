import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Patch,
  Delete,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  async sendMessage(@Request() req, @Body() createMessageDto: CreateMessageDto) {
    return this.messageService.sendMessage(req.user.id, createMessageDto);
  }

  @Get('conversations')
  async getConversations(@Request() req) {
    return this.messageService.getConversations(req.user.id);
  }

  @Get('conversations/:conversationId')
  async getMessages(
    @Request() req,
    @Param('conversationId') conversationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messageService.getMessages(
      req.user.id,
      conversationId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Patch('conversations/:conversationId/read')
  async markAsRead(@Request() req, @Param('conversationId') conversationId: string) {
    return this.messageService.markAsRead(req.user.id, conversationId);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    return this.messageService.getUnreadCount(req.user.id);
  }

  @Get('admin-users')
  async getAdminUsers() {
    return this.messageService.getAdminUsers();
  }

  @Get('staff-users')
  async getStaffUsers(@Query('facilityId') facilityId?: string) {
    return this.messageService.getStaffUsers(facilityId);
  }

  @Delete('conversations/:conversationId')
  async deleteConversation(@Request() req, @Param('conversationId') conversationId: string) {
    return this.messageService.deleteConversation(req.user.id, conversationId);
  }
}
