import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';

@Injectable()
export class ReferralService {
  constructor(private prisma: PrismaService) {}

  async create(createReferralDto: CreateReferralDto, madeById: string) {
    // Verify child exists
    const child = await this.prisma.child.findUnique({
      where: { id: createReferralDto.childId },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    // Verify assessment exists
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: createReferralDto.assessmentId },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    // Check if assessment already has a referral
    const existingReferral = await this.prisma.referral.findUnique({
      where: { assessmentId: createReferralDto.assessmentId },
    });

    if (existingReferral) {
      throw new BadRequestException('Assessment already has a referral');
    }

    // Generate referral code
    const referralCount = await this.prisma.referral.count();
    const code = `REF-${String(referralCount + 1).padStart(4, '0')}`;

    const referral = await this.prisma.referral.create({
      data: {
        ...createReferralDto,
        code,
        madeById,
        status: 'Pending',
      },
      include: {
        child: true,
        assessment: true,
        fromFacility: true,
        toFacility: true,
        madeBy: {
          select: {
            id: true,
            code: true,
            name: true,
            role: true,
          },
        },
      },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'REFERRAL_MADE',
        userId: madeById,
        facilityId: createReferralDto.fromFacilityId,
        description: `Referral ${code} created for child ${child.name}`,
      },
    });

    return referral;
  }

  async findAll(query?: {
    page?: number;
    limit?: number;
    childId?: string;
    fromFacilityId?: string;
    toFacilityId?: string;
    status?: string;
    urgency?: string;
  }) {
    const page = Number(query?.page) || 1;
    const limit = Math.min(Number(query?.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query?.childId) {
      where.childId = query.childId;
    }

    if (query?.fromFacilityId) {
      where.fromFacilityId = query.fromFacilityId;
    }

    if (query?.toFacilityId) {
      where.toFacilityId = query.toFacilityId;
    }

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.urgency) {
      where.urgency = query.urgency;
    }

    const [data, total] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        skip,
        take: limit,
        include: {
          child: {
            select: {
              id: true,
              code: true,
              name: true,
              sex: true,
              ageMonths: true,
              currentStatus: true,
            },
          },
          assessment: {
            select: {
              id: true,
              code: true,
              nutritionStatus: true,
              isSAM: true,
              isMAM: true,
            },
          },
          fromFacility: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
            },
          },
          toFacility: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
            },
          },
          madeBy: {
            select: {
              id: true,
              code: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.referral.count({ where }),
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
    const referral = await this.prisma.referral.findUnique({
      where: { id },
      include: {
        child: true,
        assessment: true,
        fromFacility: true,
        toFacility: true,
        madeBy: {
          select: {
            id: true,
            code: true,
            name: true,
            role: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!referral) {
      throw new NotFoundException(`Referral with ID ${id} not found`);
    }

    return referral;
  }

  async update(id: string, updateReferralDto: UpdateReferralDto) {
    await this.findOne(id); // Check if exists

    const referral = await this.prisma.referral.update({
      where: { id },
      data: updateReferralDto,
      include: {
        child: true,
        assessment: true,
        fromFacility: true,
        toFacility: true,
        madeBy: {
          select: {
            id: true,
            code: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return referral;
  }

  async acceptReferral(id: string) {
    const referral = await this.findOne(id);

    if (referral.status !== 'Pending') {
      throw new BadRequestException('Only pending referrals can be accepted');
    }

    const updatedReferral = await this.prisma.referral.update({
      where: { id },
      data: {
        status: 'Accepted',
        acceptedDate: new Date(),
      },
      include: {
        child: true,
        fromFacility: true,
        toFacility: true,
      },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'REFERRAL_MADE',
        facilityId: referral.toFacilityId,
        description: `Referral ${referral.code} accepted by ${referral.toFacility.name}`,
      },
    });

    return updatedReferral;
  }

  async completeReferral(id: string, outcome: string) {
    const referral = await this.findOne(id);

    if (referral.status !== 'Accepted') {
      throw new BadRequestException('Only accepted referrals can be completed');
    }

    const updatedReferral = await this.prisma.referral.update({
      where: { id },
      data: {
        status: 'Completed',
        completedDate: new Date(),
        outcome,
      },
      include: {
        child: true,
        fromFacility: true,
        toFacility: true,
      },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'REFERRAL_MADE',
        facilityId: referral.toFacilityId,
        description: `Referral ${referral.code} completed`,
      },
    });

    return updatedReferral;
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    const referral = await this.prisma.referral.delete({
      where: { id },
    });

    return { message: 'Referral deleted successfully', referral };
  }
}
