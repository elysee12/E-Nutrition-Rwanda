import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { generatePassword } from '../common/utils/password-generator';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService
  ) {}

  // Helper to generate 6-digit OTP
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Generate password if not provided
    const plainPassword = registerDto.password || generatePassword();

    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Generate user code
    const userCount = await this.prisma.user.count();
    const code = `U-${String(userCount + 1).padStart(4, '0')}`;

    // Create user
    const user = await this.prisma.user.create({
      data: {
        ...registerDto,
        password: hashedPassword,
        code,
        status: 'Active',
      },
      include: { facility: true },
    });

    // Send welcome email — fire-and-forget, never blocks registration
    this.emailService.sendWelcomeEmail(
      user.email,
      user.name,
      user.email,
      plainPassword
    ).catch(() => {});

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'USER_CREATED',
        userId: user.id,
        description: `User ${user.name} registered with role ${user.role}`,
      },
    });

    return userWithoutPassword;
  }

  async login(loginDto: LoginDto) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: { facility: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'Active') {
      throw new UnauthorizedException('User account is not active');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'USER_UPDATED',
        userId: user.id,
        description: `User ${user.name} logged in`,
      },
    });

    return {
      access_token,
      user: userWithoutPassword,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { facility: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async sendOtp(sendOtpDto: SendOtpDto) {
    const { email } = sendOtpDto;
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    // Generate OTP and set expiry (10 minutes)
    const otp = this.generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with OTP
    await this.prisma.user.update({
      where: { email },
      data: {
        otp,
        otpExpires,
      },
    });

    // Send OTP email — fire-and-forget
    this.emailService.sendOtpEmail(user.email, user.name, otp).catch(() => {});

    return { message: 'OTP sent successfully to your email' };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp } = verifyOtpDto;
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    // Validate OTP
    if (user.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Check if OTP is expired
    if (!user.otpExpires || new Date() > user.otpExpires) {
      throw new BadRequestException('OTP has expired');
    }

    return { message: 'OTP verified successfully' };
  }

  async updateProfile(userId: string, updateData: { name?: string; email?: string; phone?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    // Check email uniqueness if being updated
    if (updateData.email && updateData.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: updateData.email } });
      if (existing) throw new ConflictException('Email is already in use by another account');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { facility: true },
    });

    await this.prisma.activity.create({
      data: {
        type: 'USER_UPDATED',
        userId,
        description: `User ${updated.name} updated their profile`,
      },
    });

    const { password, ...result } = updated;
    return result;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    await this.prisma.activity.create({
      data: {
        type: 'USER_UPDATED',
        userId,
        description: `User ${user.name} changed their password`,
      },
    });

    return { message: 'Password changed successfully' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, otp, newPassword } = resetPasswordDto;
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    // Validate OTP
    if (user.otp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Check if OTP is expired
    if (!user.otpExpires || new Date() > user.otpExpires) {
      throw new BadRequestException('OTP has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear OTP
    await this.prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        otp: null,
        otpExpires: null,
      },
    });

    // Log activity
    await this.prisma.activity.create({
      data: {
        type: 'USER_UPDATED',
        userId: user.id,
        description: `User ${user.name} reset their password`,
      },
    });

    return { message: 'Password reset successfully' };
  }
}
