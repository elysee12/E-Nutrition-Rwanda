import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  async getGlobalStats() {
    // Get global, unfiltered statistics for the homepage
    const [
      totalChildren,
      totalFacilities,
      totalCHWs,
    ] = await Promise.all([
      this.prisma.child.count(), // All children, no filters
      this.prisma.facility.count(), // All facilities, no filters
      this.prisma.user.count({ where: { role: 'CHW', status: 'Active' } }), // All active CHWs
    ]);

    return {
      totalChildren,
      totalFacilities,
      totalCHWs,
    };
  }

  async getDashboardStats(user: any) {
    // Child-level filters (village, facilityId are direct fields on Child)
    const childWhere: any = { isActive: true };

    // Assessment/FollowUp filters must route village through the child relation
    const assessmentWhere: any = { child: { isActive: true } };
    const childRelationWhere: any = {}; // used as { child: childRelationWhere }

    if (user.role === 'NURSE' || user.role === 'DATA_MANAGER') {
      childWhere.facilityId = user.facilityId;
      assessmentWhere.child.facilityId = user.facilityId;
      childRelationWhere.facilityId = user.facilityId;
    }

    if (user.role === 'CHW') {
      childWhere.assignedCHWId = user.id;
      // Assessment has no direct village — filter via child relation
      assessmentWhere.child.assignedCHWId = user.id;
      childRelationWhere.assignedCHWId = user.id;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Define user filter for counting CHWs
    const userWhere: any = { status: 'Active' };
    if (user.role === 'NURSE' || user.role === 'DATA_MANAGER') {
      userWhere.facilityId = user.facilityId;
    }

    // Fetch CHW's assigned facility if user is a CHW
    let chwFacility: any = null;
    if (user.role === 'CHW') {
      const userWithFacility = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: { facility: true }
      });
      chwFacility = userWithFacility?.facility || null;
    }

    // First get all unique childIds with at least one assessment
    const uniqueAssessedChildren = await this.prisma.assessment.findMany({
      where: assessmentWhere,
      select: { childId: true },
      distinct: ['childId']
    });
    const uniqueChildrenAssessed = uniqueAssessedChildren.length;

    const [
      totalChildren,
      pendingAssessments,
      samCount,
      mamCount,
      wastingCount,
      stuntingCount,
      underweightCount,
      followUpsToday,
      recentAssessments,
      screenedToday,
      totalCHWs,
      facilitiesCovered,
    ] = await Promise.all([
      this.prisma.child.count({ where: childWhere }),
      this.prisma.assessment.count({
        where: {
          ...assessmentWhere,
          OR: [{ isSAM: true }, { isMAM: true }],
        },
      }),
      this.prisma.child.count({
        where: { ...childWhere, currentStatus: 'SAM' },
      }),
      this.prisma.child.count({
        where: { ...childWhere, currentStatus: 'MAM' },
      }),
      this.prisma.child.count({
        where: { ...childWhere, currentStatus: 'Wasting' },
      }),
      this.prisma.child.count({
        where: { ...childWhere, currentStatus: 'Stunting' },
      }),
      this.prisma.child.count({
        where: { ...childWhere, currentStatus: 'Underweight' },
      }),
      this.getFollowUpsTodayCount(childRelationWhere),
      this.prisma.assessment.count({
        where: {
          ...assessmentWhere,
          assessmentDate: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7)),
          },
        },
      }),
      // Calculate unique children screened today (distinct childId)
      this.prisma.assessment.findMany({
        where: {
          ...assessmentWhere,
          assessmentDate: {
            gte: today,
            lt: tomorrow,
          },
        },
        select: { childId: true },
      }).then((assessments) => {
        const uniqueChildIds = new Set(assessments.map(a => a.childId));
        return uniqueChildIds.size;
      }),
      this.prisma.user.count({
        where: {
          ...userWhere,
          role: 'CHW',
        },
      }),
      this.prisma.child.findMany({
        where: childWhere,
        select: { facilityId: true },
        distinct: ['facilityId']
      }).then(children => children.length),
    ]);

    const normalCount = totalChildren - samCount - mamCount - wastingCount - stuntingCount - underweightCount;

    return {
      totalChildren,
      pendingAssessments,
      totalCHWs,
      facilitiesCovered,
      samCount,
      mamCount,
      wastingCount,
      stuntingCount,
      underweightCount,
      normalCount,
      followUpsToday,
      recentAssessments,
      screenedToday,
      chwFacilityName: chwFacility?.name || null,
      chwTotalAssessments: uniqueChildrenAssessed, // Count unique children, not total assessments
    };
  }

  private async getFollowUpsTodayCount(where: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.followUp.count({
      where: {
        scheduledDate: {
          gte: today,
          lt: tomorrow,
        },
        child: where,
      },
    });
  }

  async getFacilityStats(facilityId: string, query: { year?: number; month?: number }) {
    const childWhere: any = { facilityId, isActive: true };
    const assessmentWhere: any = { child: { facilityId, isActive: true } };

    if (query.year && query.month) {
      const startDate = new Date(query.year, query.month - 1, 1);
      const endDate = new Date(query.year, query.month, 0);
      assessmentWhere.assessmentDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [
      totalChildren,
      totalAssessments,
      samCases,
      mamCases,
      totalFollowUps,
      completedFollowUps,
    ] = await Promise.all([
      this.prisma.child.count({ where: childWhere }),
      this.prisma.assessment.count({ where: assessmentWhere }),
      this.prisma.assessment.count({ where: { ...assessmentWhere, isSAM: true } }),
      this.prisma.assessment.count({ where: { ...assessmentWhere, isMAM: true } }),
      this.prisma.followUp.count({ where: { child: { facilityId } } }),
      this.prisma.followUp.count({
        where: { child: { facilityId }, status: 'Completed' },
      }),
    ]);

    return {
      totalChildren,
      totalAssessments,
      samCases,
      mamCases,
      totalFollowUps,
      completedFollowUps,
      followUpRate: totalFollowUps > 0 ? (completedFollowUps / totalFollowUps) * 100 : 0,
    };
  }

  async getCHWStats(chwId: string, query: { year?: number; month?: number }) {
    const chw = await this.prisma.user.findUnique({
      where: { id: chwId },
    });

    if (!chw) {
      return null;
    }

    const childWhere: any = { assignedCHWId: chwId, isActive: true };
    const assessmentWhere: any = { child: { assignedCHWId: chwId } };

    if (query.year && query.month) {
      const startDate = new Date(query.year, query.month - 1, 1);
      const endDate = new Date(query.year, query.month, 0);
      assessmentWhere.assessmentDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    const [
      childrenInVillage,
      assessmentsConducted,
      samIdentified,
      mamIdentified,
    ] = await Promise.all([
      this.prisma.child.count({ where: childWhere }),
      this.prisma.assessment.count({
        where: { ...assessmentWhere, assessedById: chwId },
      }),
      this.prisma.assessment.count({
        where: { ...assessmentWhere, assessedById: chwId, isSAM: true },
      }),
      this.prisma.assessment.count({
        where: { ...assessmentWhere, assessedById: chwId, isMAM: true },
      }),
    ]);

    return {
      childrenInVillage,
      assessmentsConducted,
      samIdentified,
      mamIdentified,
      village: chw.village,
      sector: chw.sector,
    };
  }

  async getAnalytics(query: { from?: string; to?: string; facilityId?: string }, user: any) {
    const childWhere: any = { isActive: true };

    if (query.facilityId) {
      childWhere.facilityId = query.facilityId;
    } else if (user.role === 'NURSE' || user.role === 'DATA_MANAGER') {
      childWhere.facilityId = user.facilityId;
    } else if (user.role === 'CHW') {
      childWhere.assignedCHWId = user.id;
    }

    // Get children with their current status and latest assessment date
    const children = await this.prisma.child.findMany({
      where: childWhere,
      select: {
        id: true,
        currentStatus: true,
        assessments: {
          select: {
            assessmentDate: true,
          },
          orderBy: {
            assessmentDate: 'desc',
          },
          take: 1,
        },
      },
    });

    // Now calculate status distribution from child currentStatus
    const statusDistribution = children.reduce((acc, curr) => {
      const existing = acc.find(item => item.nutritionStatus === curr.currentStatus);
      if (existing) {
        existing._count++;
      } else {
        acc.push({ nutritionStatus: curr.currentStatus, _count: 1 });
      }
      return acc;
    }, [] as Array<{ nutritionStatus: string; _count: number }>);

    // Monthly trend: use child's latest assessment date if available
    const monthlyTrend = children
      .filter(c => c.assessments.length > 0)
      .map(c => ({
        assessmentDate: c.assessments[0].assessmentDate,
        nutritionStatus: c.currentStatus,
      }));

    return {
      statusDistribution,
      monthlyTrend,
    };
  }
}
