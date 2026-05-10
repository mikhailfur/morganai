import { Controller, Post, Body } from '@nestjs/common'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password)
    return this.authService.login(user)
  }

  @Post('register')
  async register(@Body() body: { email: string; password: string; displayName?: string }) {
    // In real app, delegate to UsersService.create
    return { message: 'Register stub' }
  }
}
