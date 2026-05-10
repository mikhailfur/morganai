import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { AdminService } from './admin.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '@prisma/client'

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ───────────────────────────────────────── Users ─────────────────────────────────────────
  @Get('users')
  async listUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers({
      page: Number(page),
      limit: Number(limit),
      search,
    })
  }

  @Patch('users/:id/role')
  async updateUserRole(@Param('id') id: string, @Body('role') role: UserRole) {
    return this.adminService.updateUserRole(id, role)
  }

  @Patch('users/:id/premium')
  async overridePremium(
    @Param('id') id: string,
    @Body('isPremium') isPremium: boolean,
    @Body('premiumUntil') premiumUntil?: string,
  ) {
    return this.adminService.overridePremium(id, isPremium, premiumUntil ? new Date(premiumUntil) : undefined)
  }

  // ───────────────────────────────────────── Models ─────────────────────────────────────────
  @Get('models')
  async listModels() {
    return this.adminService.listModels()
  }

  @Post('models')
  async createModel(@Body() dto: CreateModelDto) {
    return this.adminService.createModel(dto)
  }

  @Patch('models/:id')
  async updateModel(@Param('id') id: string, @Body() dto: Partial<CreateModelDto>) {
    return this.adminService.updateModel(id, dto)
  }

  @Delete('models/:id')
  async deleteModel(@Param('id') id: string) {
    return this.adminService.deleteModel(id)
  }

  // ───────────────────────────────────────── Subscriptions ─────────────────────────────────────────
  @Get('subscriptions')
  async listSubscriptions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('provider') provider?: 'STRIPE' | 'TRIBUTE',
  ) {
    return this.adminService.listSubscriptions({
      page: Number(page),
      limit: Number(limit),
      provider,
    })
  }

  // ───────────────────────────────────────── Analytics ─────────────────────────────────────────
  @Get('analytics/overview')
  async getOverview() {
    return this.adminService.getOverviewStats()
  }

  @Get('analytics/revenue')
  async getRevenueByProvider(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.getRevenueStats(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    )
  }
}

export interface CreateModelDto {
  providerId: string
  displayName: string
  description?: string
  contextLength: number
  isActive?: boolean
  isPremium?: boolean
  pricingMultiplier?: number
}
