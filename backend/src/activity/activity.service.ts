import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityType } from '@prisma/client';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: {
    page?: number;
    limit?: number;
    userId?: string;
    facilityId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }, user?: any) {
    const page = query?.page ? Number(query.page) : 1;
    const limit = query?.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query?.userId) {
      where.userId = query.userId;
    }

    if (query?.facilityId) {
      where.facilityId = query.facilityId;
    } else if (user && (user.role === 'NURSE' || user.role === 'DATA_MANAGER')) {
      where.facilityId = user.facilityId;
    }

    if (query?.type) {
      where.type = query.type;
    }

    if (query?.startDate || query?.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              code: true,
              name: true,
              email: true,
              role: true,
            },
          },
          facility: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    return this.prisma.activity.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            code: true,
            name: true,
            email: true,
            role: true,
          },
        },
        facility: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
    });
  }

  async findByUser(userId: string, query?: { page?: number; limit?: number }) {
    return this.findAll({ ...query, userId });
  }

  async findByFacility(facilityId: string, query?: { page?: number; limit?: number }) {
    return this.findAll({ ...query, facilityId });
  }

  async getActivityStats(query?: {
    facilityId?: string;
    startDate?: string;
    endDate?: string;
  }, user?: any) {
    const where: any = {};

    if (query?.facilityId) {
      where.facilityId = query.facilityId;
    } else if (user && (user.role === 'NURSE' || user.role === 'DATA_MANAGER')) {
      where.facilityId = user.facilityId;
    }

    if (query?.startDate || query?.endDate) {
      where.createdAt = {};
      if (query?.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query?.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const activities = await this.prisma.activity.groupBy({
      by: ['type'],
      where,
      _count: {
        id: true,
      },
    });

    return activities.map((activity) => ({
      type: activity.type,
      count: activity._count.id,
    }));
  }
}
