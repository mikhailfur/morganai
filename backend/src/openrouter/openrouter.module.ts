import { Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { OpenRouterService } from './openrouter.service'

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [OpenRouterService],
  exports: [OpenRouterService],
})
export class OpenRouterModule {}
