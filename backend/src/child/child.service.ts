import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';

@Injectable()
export class ChildService {
  constructor(
    private prisma: PrismaService, 
    private notificationService: NotificationService
  ) {}

  async create(createChildDto: CreateChildDto, user: any) {
    // Check for idempotency using syncId
    if ((createChildDto as any).syncId) {
      const existing = await this.prisma.child.findUnique({
        where: { syncId: (createChildDto as any).syncId } as any,
        include: {
          facility: true,
          registeredBy: {
            select: { id: true, name: true, code: true, role: true },
          },
          assignedCHW: {
            select: { id: true, name: true, code: true, phone: true, village: true }
          }
        },
      });
      if (existing) {
        console.log(`📡 Idempotency: Returning existing child for syncId ${(createChildDto as any).syncId}`);
        return existing;
      }
    }

    // Calculate age in months
    const birthDate = new Date(createChildDto.dateOfBirth);
    const today = new Date();
    const ageMonths = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

    // Validate age (under 60 months for everyone)
    if (ageMonths >= 60) {
      throw new BadRequestException('Child must be under 60 months (5 years) old');
    }

    // Validate user ID
    if (!user || !user.id) {
      throw new BadRequestException('Invalid user authentication');
    }

    // Determine facility assignment from payload or authenticated user
    const facilityId = createChildDto.facilityId ?? user.facilityId;
    if (!facilityId) {
      throw new BadRequestException('Facility assignment is required to register a child');
    }

    // Find CHW assigned to this village OR use explicitly assigned CHW
    let assignedCHW: { id: string; name: string; code: string; phone: string | null; village: string | null } | null = null;
    
    // If the current user is a CHW, assign the child directly to them!
    if (user.role === 'CHW') {
      assignedCHW = await this.prisma.user.findFirst({
        where: {
          id: user.id,
          role: 'CHW',
          status: 'Active',
        },
        select: {
          id: true,
          name: true,
          code: true,
          phone: true,
          village: true,
        },
      });
    } else if (createChildDto.assignedCHWId) {
      // Explicit CHW assignment from the form (for non-CHW users like Nurse/Admin)
      assignedCHW = await this.prisma.user.findFirst({
        where: {
          id: createChildDto.assignedCHWId,
          role: 'CHW',
          status: 'Active',
          facilityId: facilityId,
        },
        select: {
          id: true,
          name: true,
          code: true,
          phone: true,
          village: true,
        },
      });
    } else if (createChildDto.village) {
      // Auto-assignment based on village matching (for non-CHW users)
      assignedCHW = await this.prisma.user.findFirst({
        where: {
          role: 'CHW',
          status: 'Active',
          village: createChildDto.village,
          sector: createChildDto.sector,
          facilityId: facilityId,
        },
        select: {
          id: true,
          name: true,
          code: true,
          phone: true,
          village: true,
        },
      });
    }

    // Generate child code: get last child and increment with collision handling
    let code = '';
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      const lastChild = await this.prisma.child.findFirst({
        orderBy: { code: 'desc' },
      });
      
      let nextNumber = 1;
      if (lastChild) {
        const match = lastChild.code.match(/ENR-(\d+)/);
        if (match && match[1]) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      code = `ENR-${String(nextNumber).padStart(5, '0')}`;

      try {
        // Create child with caregiver relation if CHW is assigned OR provided via DTO
        let finalCaregiverRelation: string | undefined;
        if (createChildDto.caregiverRelation) {
          finalCaregiverRelation = createChildDto.caregiverRelation;
        } else if (assignedCHW) {
          finalCaregiverRelation = `CHW: ${assignedCHW.name}`;
        }

        const child = await this.prisma.child.create({
          data: {
            name: createChildDto.name,
            sex: createChildDto.sex,
            dateOfBirth: new Date(createChildDto.dateOfBirth).toISOString(),
            applicationNumber: createChildDto.applicationNumber || null,
            syncId: createChildDto.syncId || null,
            fatherName: createChildDto.fatherName,
            motherName: createChildDto.motherName,
            caregiverName: createChildDto.caregiverName,
            caregiverPhone: createChildDto.caregiverPhone,
            caregiverNationalId: createChildDto.caregiverNationalId,
            otherInfo: createChildDto.otherInfo,
            caregiverRelation: finalCaregiverRelation,
            code,
            ageMonths,
            currentStatus: 'Normal',
            isActive: true,
            registeredById: user.id,
            assignedCHWId: assignedCHW?.id,
            facilityId,
            province: createChildDto.province,
            district: createChildDto.district,
            sector: createChildDto.sector,
            cell: createChildDto.cell,
            village: createChildDto.village,
          },
          include: {
            facility: true,
            registeredBy: {
              select: {
                id: true,
                name: true,
                code: true,
                role: true,
              },
            },
            assignedCHW: {
              select: {
                id: true,
                name: true,
                code: true,
                phone: true,
                village: true,
              }
            }
          },
        });

        // Log activity
        await this.prisma.activity.create({
          data: {
            type: 'CHILD_REGISTRATION',
            userId: user.id,
            facilityId,
            entityType: 'Child',
            entityId: child.id,
            description: assignedCHW 
              ? `Child ${child.name} (${child.code}) registered and assigned to CHW ${assignedCHW.name}`
              : `Child ${child.name} (${child.code}) registered`,
          },
        });

        // Send notification to CHW if assigned
        if (assignedCHW) {
          await this.notificationService.createNotification({
            userId: assignedCHW.id,
            type: 'USER_CREATED',
            title: 'New Child Assigned',
            message: `You have been assigned a new child: ${child.name} (${child.code}). Please schedule a screening as soon as possible.`,
            relatedId: child.id,
            relatedType: 'child',
          });
        }

        return {
          ...child,
          assignedCHW: assignedCHW || undefined,
        };
      } catch (error) {
        if (error.code === 'P2002') {
          const target = error.meta?.target as string;
          
          // Check if it's a syncId conflict - if yes, return existing record
          if (target.includes('syncId') && createChildDto.syncId) {
            const existing = await this.prisma.child.findUnique({
              where: { syncId: createChildDto.syncId },
              include: {
                facility: true,
                registeredBy: {
                  select: { id: true, name: true, code: true, role: true },
                },
                assignedCHW: {
                  select: { id: true, name: true, code: true, phone: true, village: true }
                }
              },
            });
            if (existing) {
              console.log(`📡 Idempotency (race condition): Returning existing child for syncId ${createChildDto.syncId}`);
              return existing;
            }
          }
          
          // If it's a code conflict, retry
          if (target.includes('code') || target.includes('children_code_key')) {
            retries++;
            continue;
          }
        }
        throw error;
      }
    }

    throw new Error('Failed to generate a unique child code after multiple attempts.');
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    facilityId?: string;
    village?: string;
    applicationNumber?: string;
  }, user?: any) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    // Apply role-based filtering ALWAYS
    if (user?.role === 'CHW') {
      // If it's a CHW, only show children assigned to them OR registered by them
      where.OR = [
        { assignedCHWId: user.id },
        { registeredById: user.id }
      ];
    } else if (user && user.role !== 'ADMIN' && user.facilityId) {
      // For NURSE, DATA_MANAGER, etc., only show children in their facility
      where.facilityId = user.facilityId;
    }

    if (query.search) {
      const searchConditions = [
        { name: { contains: query.search } },
        { code: { contains: query.search } },
        { caregiverName: { contains: query.search } },
        { applicationNumber: { contains: query.search } },
      ];
      
      if (where.OR) {
        // If we already have OR conditions (CHW case), combine with search
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions }
        ];
        delete where.OR; // Remove the original OR to avoid confusion
      } else {
        where.OR = searchConditions;
      }
    }

    if (query.applicationNumber) {
      where.applicationNumber = query.applicationNumber;
    }

    if (query.status && query.status !== 'all' && query.status !== 'undefined') {
      where.currentStatus = query.status;
    }

    if (query.facilityId) {
      where.facilityId = query.facilityId;
    }

    if (query.village) {
      where.village = query.village;
    }

    const [data, total] = await Promise.all([
      this.prisma.child.findMany({
        where,
        skip,
        take: limit,
        include: {
          facility: true,
          assignedCHW: {
            select: {
              id: true,
              name: true,
              code: true,
              phone: true,
              village: true,
            }
          },
          assessments: {
            orderBy: { assessmentDate: 'desc' },
            take: 1,
            include: {
              facility: true,
              assessedBy: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.child.count({ where }),
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

  async searchChildren(query: string, user?: any) {
    const where: any = { isActive: true };
    
    // Search Child History should search ALL children across the system, regardless of user role
    // No role-based filtering here!

    if (query) {
      where.OR = [
        { name: { contains: query } },
        { code: { contains: query } },
        { caregiverName: { contains: query } },
        { applicationNumber: { contains: query } },
      ];
    }

    return this.prisma.child.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        sex: true,
        dateOfBirth: true,
        ageMonths: true,
        applicationNumber: true,
        fatherName: true,
        motherName: true,
        caregiverName: true,
        caregiverPhone: true,
        caregiverNationalId: true,
        province: true,
        district: true,
        sector: true,
        cell: true,
        village: true,
        facilityId: true,
        assignedCHWId: true,
      },
      take: 10,
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    const child = await this.prisma.child.findUnique({
      where: { id },
      include: {
        facility: true,
      },
    });

    if (!child) {
      throw new NotFoundException(`Child with ID ${id} not found`);
    }

    return child;
  }

  async findByApplicationNumber(applicationNumber: string) {
    const child = await this.prisma.child.findFirst({
      where: { applicationNumber, isActive: true },
      include: {
        facility: true,
        assessments: {
          include: {
            facility: true,
            assessedBy: { select: { id: true, name: true, code: true, role: true } },
          },
          orderBy: { assessmentDate: 'desc' },
          take: 20,
        },
      },
    });
    return child;
  }

  async update(id: string, updateChildDto: UpdateChildDto, user: any) {
    const existingChild = await this.prisma.child.findUnique({
      where: { id },
      select: { id: true, assignedCHWId: true },
    });

    if (!existingChild) {
      throw new NotFoundException(`Child with ID ${id} not found`);
    }

    // Prepare data, making sure dateOfBirth is a proper ISO string if provided
    const data: any = { ...updateChildDto };
    if (updateChildDto.dateOfBirth) {
      data.dateOfBirth = new Date(updateChildDto.dateOfBirth).toISOString();
      
      // Recalculate age in months when date of birth changes
      const birthDate = new Date(updateChildDto.dateOfBirth);
      const today = new Date();
      const ageMonths = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      
      // Validate age (must be under 60 months)
      if (ageMonths >= 60) {
        throw new BadRequestException('Child must be under 60 months (5 years) old');
      }
      
      data.ageMonths = ageMonths;
    }

    // If current user is a CHW, automatically assign this child to them, unless explicitly specified otherwise
    if (user.role === 'CHW') {
      if (!('assignedCHWId' in updateChildDto) || updateChildDto.assignedCHWId === null || updateChildDto.assignedCHWId === undefined) {
        data.assignedCHWId = user.id;
        // Also update caregiverRelation if not provided
        if (!('caregiverRelation' in updateChildDto)) {
          data.caregiverRelation = `CHW: ${user.name}`;
        }
      }
    } else {
      // Handle CHW assignment and caregiverRelation for non-CHW users (existing logic)
      if ('assignedCHWId' in updateChildDto) {
        data.assignedCHWId = updateChildDto.assignedCHWId;
        // Only update caregiverRelation if not provided in DTO
        if (!('caregiverRelation' in updateChildDto)) {
          if (updateChildDto.assignedCHWId) {
            const chw = await this.prisma.user.findUnique({
              where: { id: updateChildDto.assignedCHWId },
              select: { name: true, code: true }
            });
            if (chw) {
              data.caregiverRelation = `CHW: ${chw.name}`;
            }
          } else {
            data.caregiverRelation = null;
          }
        }
      }
    }

    const child = await this.prisma.child.update({
      where: { id },
      data,
      include: {
        facility: true,
        assignedCHW: true
      },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'ASSESSMENT_UPDATED',
        userId: user.id,
        entityType: 'Child',
        entityId: child.id,
        description: `Child ${child.name} (${child.code}) updated`,
      },
    });

    // Send notification to new CHW if assigned and different from before
    if (child.assignedCHWId && existingChild.assignedCHWId !== child.assignedCHWId) {
      await this.notificationService.createNotification({
        userId: child.assignedCHWId,
        type: 'USER_CREATED',
        title: 'New Child Assigned',
        message: `You have been assigned a new child: ${child.name} (${child.code}). Please review their history and schedule any necessary screenings.`,
        relatedId: child.id,
        relatedType: 'child',
      });
    }

    return child;
  }

  async getAssessments(childId: string) {
    const existingChild = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { id: true },
    });

    if (!existingChild) {
      throw new NotFoundException(`Child with ID ${childId} not found`);
    }

    return this.prisma.assessment.findMany({
      where: { childId },
      include: {
        assessedBy: {
          select: {
            id: true,
            name: true,
            code: true,
            role: true,
          },
        },
        facility: true,
      },
      orderBy: { assessmentDate: 'desc' },
    });
  }

  async getGrowthChart(childId: string) {
    const existingChild = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { id: true },
    });

    if (!existingChild) {
      throw new NotFoundException(`Child with ID ${childId} not found`);
    }

    return this.prisma.growthRecord.findMany({
      where: { childId },
      orderBy: { ageMonths: 'asc' },
    });
  }

  async remove(id: string, user: any) {
    const existingChild = await this.prisma.child.findUnique({
      where: { id },
      select: { id: true, name: true, code: true },
    });

    if (!existingChild) {
      throw new NotFoundException(`Child with ID ${id} not found`);
    }

    // Soft delete by setting isActive to false
    const child = await this.prisma.child.update({
      where: { id },
      data: { isActive: false },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'ASSESSMENT_UPDATED',
        userId: user.id,
        entityType: 'Child',
        entityId: child.id,
        description: `Child ${child.name} (${child.code}) deactivated`,
      },
    });

    return { 
      message: 'Child deactivated successfully',
      child: {
        id: child.id,
        code: child.code,
        name: child.name,
      },
    };
  }

  async getCHWsByFacility(facilityId: string) {
    return this.prisma.user.findMany({
      where: {
        role: 'CHW',
        status: 'Active',
        facilityId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        village: true,
        sector: true,
        cell: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
