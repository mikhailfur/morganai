import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'
import { UserRole, SubscriptionProvider } from '@prisma/client'
import { CreateModelDto } from './admin.controller'

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(opts: { page: number; limit: number; search?: string }) {
    const where = opts.search
      ? {
          OR: [
            { email: { contains: opts.search, mode: 'insensitive' as const } },
            { displayName: { contains: opts.search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [data, count] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          isPremium: true,
          premiumUntil: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ])

    return { data, meta: { page: opts.page, limit: opts.limit, total: count } }
  }

  async updateUserRole(userId: string, role: UserRole) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    })
  }

  async overridePremium(userId: string, isPremium: boolean, premiumUntil?: Date) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isPremium, premiumUntil },
    })
  }

  async listModels() {
    return this.prisma.platformModel.findMany({ orderBy: { displayName: 'asc' } })
  }

  async createModel(dto: CreateModelDto) {
    return this.prisma.platformModel.create({ data: dto })
  }

  async updateModel(id: string, dto: Partial<CreateModelDto>) {
    return this.prisma.platformModel.update({ where: { id }, data: dto })
  }

  async deleteModel(id: string) {
    return this.prisma.platformModel.delete({ where: { id } })
  }

  async listSubscriptions(opts: { page: number; limit: number; provider?: 'STRIPE' | 'TRIBUTE' }) {
    const where = opts.provider ? { provider: opts.provider as SubscriptionProvider } : {}
    const [data, count] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, displayName: true } } },
      }),
      this.prisma.subscription.count({ where }),
    ])
    return { data, meta: { page: opts.page, limit: opts.limit, total: count } }
  }

  async getOverviewStats() {
    const [totalUsers, totalSessions, totalMessages, activeSubs] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.chatSession.count(),
      this.prisma.message.count(),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    ])
    return { totalUsers, totalSessions, totalMessages, activeSubs }
  }

  async getRevenueStats(from?: Date, to?: Date) {
    const where = {
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      status: 'ACTIVE' as const,
    }

    const rows = await this.prisma.subscription.findMany({ where })
    const byProvider = { STRIPE: 0, TRIBUTE: 0, total: 0 }
    for (const row of rows) {
      const cents = row.priceCents ?? 0
      byProvider[row.provider] += cents
      byProvider.total += cents
    }
    return byProvider
  }
}
