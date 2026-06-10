import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';

@Injectable()
export class FollowUpService {
  constructor(private prisma: PrismaService) {}

  // Helper to get the most recent assessment for a child
  private async getMostRecentAssessment(childId: string) {
    return this.prisma.assessment.findFirst({
      where: { childId },
      orderBy: { assessmentDate: 'desc' },
    });
  }

  // Helper to filter follow-ups: only keep if child still needs follow-up OR follow-up is completed
  private async filterActiveFollowUps(followUps: any[]) {
    const filteredFollowUps: any[] = [];
    for (const followUp of followUps) {
      // If follow-up is completed, always keep it (for history)
      if (followUp.status === 'Completed') {
        filteredFollowUps.push(followUp);
        continue;
      }

      // Otherwise, check the most recent assessment
      const recentAssessment = await this.getMostRecentAssessment(followUp.childId);
      // If no recent assessment or child is not SAM/MAM, skip this follow-up
      if (!recentAssessment || !(recentAssessment.isSAM || recentAssessment.isMAM)) {
        continue;
      }
      
      // Otherwise, keep the follow-up
      filteredFollowUps.push(followUp);
    }
    return filteredFollowUps;
  }

  async create(createFollowUpDto: CreateFollowUpDto, userId: string) {
    const followUpCount = await this.prisma.followUp.count();
    const code = `FU-${String(followUpCount + 1).padStart(5, '0')}`;

    const followUp = await this.prisma.followUp.create({
      data: {
        ...createFollowUpDto,
        code,
        status: 'Scheduled',
      },
      include: {
        child: { include: { facility: true } },
        assessment: true,
        conductedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
      },
    });

    await this.prisma.activity.create({
      data: {
        type: 'FOLLOW_UP_COMPLETED',
        userId,
        entityType: 'FollowUp',
        entityId: followUp.id,
        description: `Follow-up ${followUp.code} scheduled for ${followUp.child.name}`,
      },
    });

    return followUp;
  }

  async findAll(query: {
    page?: number | string;
    limit?: number | string;
    status?: string;
    facilityId?: string;
  }, userId?: string) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const where: any = {
      child: {
        isActive: true
      }
    };

    if (query.status) {
      where.status = query.status;
    }

    // Get user's facilityId if not provided
    let facilityId = query.facilityId;
    if (!facilityId && userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { facilityId: true },
      });
      facilityId = user?.facilityId || undefined;
    }

    if (facilityId) {
      where.child = {
        ...where.child,
        facilityId: facilityId,
      };
    }

    let data = await this.prisma.followUp.findMany({
      where,
      include: {
        child: { include: { facility: true } },
        assessment: true,
        conductedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
      },
      orderBy: { scheduledDate: 'desc' },
    });
    
    // Filter to only keep most recent per child and active only
    const childMap = new Map<string, any>();
    for (const f of data) {
      const existing = childMap.get(f.childId);
      if (!existing || new Date(f.scheduledDate) > new Date(existing.scheduledDate)) {
        childMap.set(f.childId, f);
      }
    }
    data = Array.from(childMap.values());
    data = await this.filterActiveFollowUps(data);
    
    // Calculate pagination for filtered data
    const total = data.length;
    const paginatedData = data.slice(skip, skip + limit);

    return {
      data: paginatedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const followUp = await this.prisma.followUp.findUnique({
      where: { id },
      include: {
        child: { include: { facility: true } },
        assessment: true,
        conductedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
      },
    });

    if (!followUp) {
      throw new NotFoundException(`Follow-up with ID ${id} not found`);
    }

    return followUp;
  }

  async update(id: string, updateFollowUpDto: UpdateFollowUpDto, userId: string) {
    await this.findOne(id);

    const followUp = await this.prisma.followUp.update({
      where: { id },
      data: {
        ...updateFollowUpDto,
        conductedById: updateFollowUpDto.status === 'Completed' ? userId : undefined,
        completedDate: updateFollowUpDto.status === 'Completed' ? new Date() : undefined,
      },
      include: {
        child: { include: { facility: true } },
        assessment: true,
        conductedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
      },
    });

    await this.prisma.activity.create({
      data: {
        type: 'FOLLOW_UP_COMPLETED',
        userId,
        entityType: 'FollowUp',
        entityId: followUp.id,
        description: `Follow-up ${followUp.code} updated to ${followUp.status}`,
      },
    });

    return followUp;
  }

  async getToday(userId?: string) {
    // Get the current user to get their facility (if any)
    let userFacilityId: string | null = null;
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { facilityId: true },
      });
      userFacilityId = user?.facilityId || null;
    }

    // Get today in UTC, start and end of day
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const where: any = {
      scheduledDate: {
        gte: today,
        lt: tomorrow,
      },
      child: {
        isActive: true
      }
    };

    // If user has a facility, only show follow-ups from that facility
    if (userFacilityId) {
      where.child = {
        ...where.child,
        facilityId: userFacilityId
      };
    }

    let data = await this.prisma.followUp.findMany({
      where,
      include: {
        child: { include: { facility: true } },
        assessment: true,
        conductedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });
    
    // Filter to only keep most recent per child and active only
    const childMap = new Map<string, any>();
    for (const f of data) {
      const existing = childMap.get(f.childId);
      if (!existing || new Date(f.scheduledDate) > new Date(existing.scheduledDate)) {
        childMap.set(f.childId, f);
      }
    }
    data = Array.from(childMap.values());
    data = await this.filterActiveFollowUps(data);
    
    return data;
  }

  async getUpcoming(userId?: string) {
    // Get the current user to get their facility (if any)
    let userFacilityId: string | null = null;
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { facilityId: true },
      });
      userFacilityId = user?.facilityId || null;
    }

    // Get tomorrow in UTC, start of day, and next week in UTC
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    
    const nextWeek = new Date(tomorrow);
    nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);

    const where: any = {
      scheduledDate: {
        gte: tomorrow,
        lt: nextWeek,
      },
      status: 'Scheduled',
      child: {
        isActive: true
      }
    };

    // If user has a facility, only show follow-ups from that facility
    if (userFacilityId) {
      where.child = {
        ...where.child,
        facilityId: userFacilityId
      };
    }

    let data = await this.prisma.followUp.findMany({
      where,
      include: {
        child: { include: { facility: true } },
        assessment: true,
        conductedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
    });
    
    // Filter to only keep most recent per child and active only
    const childMap = new Map<string, any>();
    for (const f of data) {
      const existing = childMap.get(f.childId);
      if (!existing || new Date(f.scheduledDate) > new Date(existing.scheduledDate)) {
        childMap.set(f.childId, f);
      }
    }
    data = Array.from(childMap.values());
    data = await this.filterActiveFollowUps(data);
    
    return data;
  }
}
