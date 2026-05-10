import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { ChatModule } from './chat/chat.module'
import { CharactersModule } from './characters/characters.module'
import { OpenRouterModule } from './openrouter/openrouter.module'
import { PaymentsModule } from './payments/payments.module'
import { AdminModule } from './admin/admin.module'
import { CommonModule } from './common/common.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    AuthModule,
    UsersModule,
    ChatModule,
    CharactersModule,
    OpenRouterModule,
    PaymentsModule,
    AdminModule,
  ],
})
export class AppModule {}
