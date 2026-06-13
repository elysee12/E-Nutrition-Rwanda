import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { User } from '@prisma/client';

@Injectable()
export class MessageService {
  constructor(private prisma: PrismaService) {}

  /**
   * Send a message (creates conversation if doesn't exist)
   */
  async sendMessage(senderId: string, dto: CreateMessageDto) {
    const { recipientId, content, attachments } = dto;

    // Validate senderId
    if (!senderId) {
      throw new ForbiddenException('User ID is required');
    }

    // Verify sender exists
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
    });

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    // Verify recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    // Find or create conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        OR: [
          { participant1Id: senderId, participant2Id: recipientId },
          { participant1Id: recipientId, participant2Id: senderId },
        ],
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          participant1Id: senderId,
          participant2Id: recipientId,
          lastMessage: content.substring(0, 100),
          lastMessageAt: new Date(),
        },
      });
    } else {
      // Update conversation last message
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: content.substring(0, 100),
          lastMessageAt: new Date(),
        },
      });
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId,
        content,
        attachments: attachments ? attachments : undefined,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
            email: true,
          },
        },
      },
    });

    // Create notification for recipient
    await this.prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'SYSTEM',
        title: 'New Message',
        message: `You have a new message from ${message.sender.name}`,
        relatedId: conversation.id,
        relatedType: 'conversation',
      },
    });

    return message;
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
      include: {
        participant1: {
          select: {
            id: true,
            name: true,
            role: true,
            email: true,
            facility: {
              select: {
                name: true,
              },
            },
          },
        },
        participant2: {
          select: {
            id: true,
            name: true,
            role: true,
            email: true,
            facility: {
              select: {
                name: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            status: true,
            createdAt: true,
            senderId: true,
          },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    // Calculate unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            readAt: null,
          },
        });

        // Determine the other participant
        const otherParticipant =
          conv.participant1Id === userId ? conv.participant2 : conv.participant1;

        return {
          ...conv,
          unreadCount,
          otherParticipant,
        };
      }),
    );

    return conversationsWithUnread;
  }

  /**
   * Get messages in a conversation
   */
  async getMessages(userId: string, conversationId: string, page = 1, limit = 50) {
    // Verify user is a participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.participant1Id !== userId &&
      conversation.participant2Id !== userId
    ) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.message.count({
      where: { conversationId },
    });

    return {
      data: messages.reverse(), // Reverse to show oldest first
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark messages as read
   */
  async markAsRead(userId: string, conversationId: string) {
    // Verify user is a participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.participant1Id !== userId &&
      conversation.participant2Id !== userId
    ) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Mark all unread messages from the other participant as read
    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(userId: string) {
    // Get all conversations for the user
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ participant1Id: userId }, { participant2Id: userId }],
      },
      select: { id: true },
    });

    const conversationIds = conversations.map((c) => c.id);

    // Count unread messages from other participants
    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        readAt: null,
      },
    });

    return { unreadCount };
  }

  /**
   * Get admin users (for staff to chat with)
   */
  async getAdminUsers() {
    return this.prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'Active',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  /**
   * Get staff users (for admin to chat with)
   */
  async getStaffUsers(facilityId?: string) {
    const where: any = {
      role: { in: ['DATA_MANAGER', 'NURSE', 'CHW'] },
      status: 'Active',
    };

    if (facilityId) {
      where.facilityId = facilityId;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        facility: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(userId: string, conversationId: string) {
    // Verify user is a participant
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      conversation.participant1Id !== userId &&
      conversation.participant2Id !== userId
    ) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Delete the conversation (messages will cascade delete)
    await this.prisma.conversation.delete({
      where: { id: conversationId },
    });

    return { message: 'Conversation deleted successfully' };
  }
}
