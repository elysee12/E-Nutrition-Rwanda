
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WHOClassificationService } from '../common/services/who-classification.service';
import { NotificationService } from '../notification/notification.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';

@Injectable()
export class AssessmentService {
  constructor(
    private prisma: PrismaService,
    private whoService: WHOClassificationService,
    private notificationService: NotificationService,
  ) {}

  private transformAssessment(assessment: any) {
    if (!assessment) return assessment;
    const transformed = { ...assessment };
    // If muacCm is missing but muacMm is present, convert mm to cm
    if (transformed.muacCm == null && transformed.muacMm != null) {
      transformed.muacCm = transformed.muacMm / 10;
    }
    return transformed;
  }

  private transformAssessments(assessments: any[]) {
    return assessments.map(this.transformAssessment);
  }

  async create(createAssessmentDto: CreateAssessmentDto, userId: string) {
    // Get child details for classification
    const child = await this.prisma.child.findUnique({
      where: { id: createAssessmentDto.childId },
    });

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    // Validate MUAC for children >= 6 months
    if (child.ageMonths >= 6) {
      if (createAssessmentDto.muacCm == null) {
        throw new Error('MUAC must be provided for children 6 months and older');
      }
      if (createAssessmentDto.muacCm < 5 || createAssessmentDto.muacCm > 20) {
        throw new Error('MUAC must be between 5 and 20 cm');
      }
    }

    // Get user to check role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    
    const isCHW = user?.role === 'CHW';

    // Perform WHO classification - use 0 for muacCm if child < 6 months
    const muacForClassification = child.ageMonths >= 6 ? (createAssessmentDto.muacCm as number) : 0;
    
    const classification = this.whoService.classifyMalnutrition({
      weight: createAssessmentDto.weightKg,
      height: createAssessmentDto.heightCm,
      muac: muacForClassification,
      sex: child.sex,
      ageMonths: child.ageMonths,
    });

    // Generate assessment code
    const assessmentCount = await this.prisma.assessment.count();
    const code = `ASS-${String(assessmentCount + 1).padStart(5, '0')}`;

    // Create assessment
    const assessment = await this.prisma.assessment.create({
      data: {
        code,
        type: isCHW ? 'INITIAL_SCREENING' : 'CLINICAL_REVIEW',
        status: isCHW ? 'Pending' : 'Reviewed',
        childId: createAssessmentDto.childId,
        facilityId: createAssessmentDto.facilityId,
        assessedById: userId,
        reviewedById: isCHW ? null : userId,
        reviewedAt: isCHW ? null : new Date(),
        weightKg: createAssessmentDto.weightKg,
        heightCm: createAssessmentDto.heightCm,
        muacCm: muacForClassification,
        zScoreWFH: classification.zScores.wfh,
        zScoreHFA: classification.zScores.hfa,
        zScoreWFA: classification.zScores.wfa,
        nutritionStatus: classification.nutritionStatus,
        isSAM: classification.isSAM,
        isMAM: classification.isMAM,
        isStunted: classification.isStunted,
        isUnderweight: classification.isUnderweight,
        isWasted: classification.isWasted,
        hasOedema: createAssessmentDto.hasOedema || false,
        diagnosis: classification.nutritionStatus,
        recommendations: classification.recommendations.join('; '),
        requiresFollowUp: classification.isSAM || classification.isMAM,
        followUpDate: classification.isSAM || classification.isMAM 
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          : null,
        assessmentDate: new Date(),
      },
      include: {
        child: true,
        facility: true,
        assessedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
      },
    });

    // Update child's current status
    await this.prisma.child.update({
      where: { id: child.id },
      data: {
        currentStatus: classification.nutritionStatus,
        lastAssessmentDate: new Date(),
      },
    });

    // Create growth record
    await this.prisma.growthRecord.create({
      data: {
        childId: child.id,
        ageMonths: child.ageMonths,
        weightKg: createAssessmentDto.weightKg,
        heightCm: createAssessmentDto.heightCm,
        muacCm: muacForClassification,
        zScoreWFH: classification.zScores.wfh,
        zScoreHFA: classification.zScores.hfa,
        zScoreWFA: classification.zScores.wfa,
        status: classification.nutritionStatus,
        measuredDate: new Date(),
      },
    });

    // Create follow-up if needed (only for SAM/MAM; normal just has recommendation)
    if (classification.isSAM || classification.isMAM) {
      const followUpCount = await this.prisma.followUp.count();
      const followUpCode = `FU-${String(followUpCount + 1).padStart(5, '0')}`;
      await this.prisma.followUp.create({
        data: {
          code: followUpCode,
          childId: child.id,
          assessmentId: assessment.id,
          scheduledDate: assessment.followUpDate!,
          status: 'Scheduled',
          reason: `Follow-up for ${classification.nutritionStatus}`,
        },
      });
    }

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'ASSESSMENT_CREATED',
        userId,
        facilityId: createAssessmentDto.facilityId,
        entityType: 'Assessment',
        entityId: assessment.id,
        description: `Assessment ${assessment.code} for ${child.name}: ${classification.nutritionStatus}`,
      },
    });

    // Send notifications to nurses and data managers at the facility
    const facilityStaff = await this.prisma.user.findMany({
      where: {
        facilityId: createAssessmentDto.facilityId,
        status: 'Active',
        role: { in: ['NURSE', 'DATA_MANAGER'] },
        id: { not: userId } // don't notify the user who created it
      },
      select: { id: true },
    });

    // Create a notification for each staff member
    for (const staff of facilityStaff) {
      await this.notificationService.createNotification({
        userId: staff.id,
        type: 'ASSESSMENT_CREATED',
        title: 'New Assessment Submitted',
        message: `A new assessment has been submitted for ${child.name} (${child.code}). Please review it soon.`,
        relatedId: assessment.id,
        relatedType: 'assessment',
      });
    }

    return assessment;
  }

  async findAll(query: {
    page?: number | string;
    limit?: number | string;
    status?: string;
    facilityId?: string;
    criticalOnly?: boolean;
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
      where.nutritionStatus = query.status;
    }

    if (query.facilityId) {
      where.child = {
        ...where.child,
        facilityId: query.facilityId
      };
    } else if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { facilityId: true, role: true }
      });
      if (user && user.facilityId && user.role !== 'ADMIN') {
        where.child = {
          ...where.child,
          facilityId: user.facilityId
        };
      }
    }

    if (query.criticalOnly) {
      where.isSAM = true;
    }

    const [data, total] = await Promise.all([
      this.prisma.assessment.findMany({
        where,
        skip,
        take: limit,
        include: {
          child: true,
          facility: true,
          assessedBy: {
            select: {
              id: true,
              name: true,
              code: true,
              role: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              name: true,
              code: true,
              role: true,
            },
          },
        },
        orderBy: { assessmentDate: 'desc' },
      }),
      this.prisma.assessment.count({ where }),
    ]);

    return {
      data: this.transformAssessments(data),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        child: true,
        facility: true,
        assessedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException(`Assessment with ID ${id} not found`);
    }

    return assessment;
  }

  async update(id: string, updateAssessmentDto: UpdateAssessmentDto, userId: string) {
    await this.findOne(id);

    const assessment = await this.prisma.assessment.update({
      where: { id },
      data: updateAssessmentDto,
      include: {
        child: true,
        facility: true,
        assessedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
      },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'ASSESSMENT_UPDATED',
        userId,
        entityType: 'Assessment',
        entityId: assessment.id,
        description: `Assessment ${assessment.code} updated`,
      },
    });

    return assessment;
  }

  async reviewAssessment(id: string, userId: string) {
    await this.findOne(id);

    const assessment = await this.prisma.assessment.update({
      where: { id },
      data: {
        status: 'Reviewed',
        reviewedById: userId,
        reviewedAt: new Date(),
      },
      include: {
        child: true,
        facility: true,
        assessedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
      },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'ASSESSMENT_REVIEWED',
        userId,
        entityType: 'Assessment',
        entityId: assessment.id,
        description: `Assessment ${assessment.code} reviewed`,
      },
    });

    return assessment;
  }

  async getPending() {
    return this.prisma.assessment.findMany({
      where: {
        OR: [
          { isMAM: true },
          { isSAM: true },
        ],
        child: {
          isActive: true
        }
      },
      include: {
        child: true,
        facility: true,
        assessedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
      },
      orderBy: { assessmentDate: 'desc' },
      take: 50,
    });
  }

  async getCritical() {
    return this.prisma.assessment.findMany({
      where: {
        isSAM: true,
        child: {
          isActive: true
        }
      },
      include: {
        child: true,
        facility: true,
        assessedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
      },
      orderBy: { assessmentDate: 'desc' },
      take: 50,
    });
  }
}

