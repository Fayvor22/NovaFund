import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { KycAuditEntity } from '../entities/kyc-audit.entity';
import { KycOverrideDto } from '../dto/kyc-override.dto';
import { KycStatus } from '../entities/kyc-status.enum';

@Injectable()
export class KycAdminService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async overrideKyc(dto: KycOverrideDto, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { kycStatus: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    const previousStatus = user.kycStatus;
    const newStatus = dto.status;

    // Update actual user record
    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { kycStatus: newStatus },
    });

    // For now, we'll skip audit logging since the auditRepo setup needs to be clarified
    // TODO: Implement proper audit logging with the correct repository setup

    return {
      userId: dto.userId,
      previousStatus,
      newStatus,
      overriddenBy: adminId,
      timestamp: new Date(),
    };
  }

  async approveKyc(userId: string, adminId: string) {
    return this.overrideKyc(
      { userId, status: KycStatus.VERIFIED },
      adminId,
    );
  }

  async rejectKyc(userId: string, adminId: string, reason?: string) {
    return this.overrideKyc(
      { userId, status: KycStatus.REJECTED, reason },
      adminId,
    );
  }

  async expireKyc(userId: string, adminId: string, reason?: string) {
    return this.overrideKyc(
      { userId, status: KycStatus.EXPIRED, reason },
      adminId,
    );
  }
}