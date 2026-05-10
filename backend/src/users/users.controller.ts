import { Controller, Get, Body, Patch } from '@nestjs/common'
import { UsersService } from './users.service'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser('userId') userId: string) {
    return this.usersService.findById(userId)
  }

  @Patch('me')
  async updateMe(@CurrentUser('userId') userId: string, @Body() body: { displayName?: string }) {
    // update stub
    return { userId, body }
  }
}
