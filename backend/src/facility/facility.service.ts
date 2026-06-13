import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';

@Injectable()
export class FacilityService {
  constructor(private prisma: PrismaService) {}

  async create(createFacilityDto: CreateFacilityDto) {
    // Generate facility code with collision handling
    let code = '';
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      const lastFacility = await this.prisma.facility.findFirst({
        orderBy: { code: 'desc' },
      });
      
      let nextNumber = 1;
      if (lastFacility) {
        const match = lastFacility.code.match(/FAC-(\d+)/);
        if (match && match[1]) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      code = `FAC-${String(nextNumber).padStart(3, '0')}`;

      try {
        const facility = await this.prisma.facility.create({
          data: {
            ...createFacilityDto,
            code,
            status: 'Active',
          },
        });

        // Log activity
        await this.prisma.activity.create({
          data: {
            type: 'FACILITY_REGISTERED',
            facilityId: facility.id,
            description: `Facility ${facility.name} registered`,
          },
        });

        return facility;
      } catch (error) {
        if (error.code === 'P2002' && (error.meta?.target?.includes('code') || error.meta?.target?.includes('facilities_code_key'))) {
          retries++;
          continue;
        }
        throw error;
      }
    }

    throw new Error('Failed to generate a unique facility code after multiple attempts.');
  }

  async findAll(query?: {
    page?: number | string;
    limit?: number | string;
    type?: string;
    province?: string;
    district?: string;
    status?: string;
  }, user?: any) {
    const page = Number(query?.page) || 1;
    // Increase default limit to 100 and max limit to 1000 for management views
    const limit = Math.min(Number(query?.limit) || 100, 1000);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Data Manager can only see their own facility
    if (user?.role === 'DATA_MANAGER' && user?.facilityId) {
      where.id = user.facilityId;
    }

    if (query?.type) {
      where.type = query.type;
    }

    if (query?.province) {
      where.province = query.province;
    }

    if (query?.district) {
      where.district = query.district;
    }

    if (query?.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.facility.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              users: true,
              children: true,
              assessments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.facility.count({ where }),
    ]);

    // Map _count to staffCount and childrenCount
    const mappedData = data.map(facility => ({
      ...facility,
      staffCount: facility._count.users,
      childrenCount: facility._count.children,
    }));

    return {
      data: mappedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const facility = await this.prisma.facility.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            children: true,
            assessments: true,
            referralsFrom: true,
            referralsTo: true,
          },
        },
      },
    });

    if (!facility) {
      throw new NotFoundException(`Facility with ID ${id} not found`);
    }

    return facility;
  }

  async update(id: string, updateFacilityDto: UpdateFacilityDto) {
    await this.findOne(id); // Check if exists

    const facility = await this.prisma.facility.update({
      where: { id },
      data: updateFacilityDto,
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'FACILITY_REGISTERED',
        facilityId: facility.id,
        description: `Facility ${facility.name} updated`,
      },
    });

    return facility;
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    const facility = await this.prisma.facility.delete({
      where: { id },
    });

    return { message: 'Facility deleted successfully', facility };
  }

  async getStats(id: string) {
    const facility = await this.findOne(id);

    const [totalChildren, activeChildren, samCases, mamCases, totalAssessments, pendingFollowUps] =
      await Promise.all([
        this.prisma.child.count({ where: { facilityId: id } }),
        this.prisma.child.count({ where: { facilityId: id, isActive: true } }),
        this.prisma.child.count({ where: { facilityId: id, currentStatus: 'SAM', isActive: true } }),
        this.prisma.child.count({ where: { facilityId: id, currentStatus: 'MAM', isActive: true } }),
        this.prisma.assessment.count({ where: { facilityId: id } }),
        this.prisma.followUp.count({ where: { child: { facilityId: id }, status: 'Scheduled' } }),
      ]);

    return {
      facility: {
        id: facility.id,
        code: facility.code,
        name: facility.name,
        type: facility.type,
      },
      statistics: {
        totalChildren,
        activeChildren,
        samCases,
        mamCases,
        totalAssessments,
        pendingFollowUps,
      },
    };
  }
}
