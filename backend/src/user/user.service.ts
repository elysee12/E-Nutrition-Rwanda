import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { generatePassword } from '../common/utils/password-generator';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) {}

  async create(createUserDto: CreateUserDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Generate password if not provided
    const plainPassword = createUserDto.password || generatePassword();
    
    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Generate user code
    const userCount = await this.prisma.user.count();
    const code = `U-${String(userCount + 1).padStart(4, '0')}`;

    // Create user
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        code,
        status: 'Active',
        facilityId: createUserDto.role === 'ADMIN' ? null : createUserDto.facilityId,
      },
      include: { facility: true },
    });

    // Send welcome email — fire-and-forget, never blocks user creation
    this.emailService.sendWelcomeEmail(
      user.email,
      user.name,
      user.email,
      plainPassword
    ).catch((err) => {
      // Already handled inside EmailService, but guard here too
      console.error('sendWelcomeEmail unexpected error:', err?.message);
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'USER_CREATED',
        userId: user.id,
        description: `User ${user.name} created with role ${user.role}`,
      },
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findAll(query?: {
    page?: number | string;
    limit?: number | string;
    role?: string;
    facilityId?: string;
    status?: string;
  }, user?: any) {
    const page = Number(query?.page) || 1;
    const limit = Math.min(Number(query?.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Data Manager can only see users from their own facility
    if (user?.role === 'DATA_MANAGER' && user?.facilityId) {
      where.facilityId = user.facilityId;
    }

    if (query?.role) {
      where.role = query.role;
    }

    if (query?.facilityId) {
      where.facilityId = query.facilityId;
    }

    if (query?.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          facility: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Remove password from results
    const sanitizedData = data.map(({ password, ...user }) => user);

    return {
      data: sanitizedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        facility: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id); // Check if exists

    // Prepare update data
    const updateData: any = { ...updateUserDto };

    // If updating password, hash it
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        facility: true,
      },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'USER_UPDATED',
        userId: user.id,
        description: `User ${user.name} updated`,
      },
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async remove(id: string) {
    await this.findOne(id); // Check if exists

    const user = await this.prisma.user.delete({
      where: { id },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'USER_UPDATED',
        description: `User ${user.name} (${user.email}) deleted`,
      },
    });

    return { 
      message: 'User deleted successfully', 
      user: {
        id: user.id,
        code: user.code,
        name: user.name,
        email: user.email,
      }
    };
  }

  async toggleStatus(id: string) {
    const user = await this.findOne(id);

    const newStatus = user.status === 'Active' ? 'Suspended' : 'Active';

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status: newStatus },
      include: {
        facility: true,
      },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'USER_UPDATED',
        userId: updatedUser.id,
        description: `User ${updatedUser.name} status changed to ${newStatus}`,
      },
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
}
