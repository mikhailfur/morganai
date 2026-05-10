import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { ValidationPipe } from '@nestjs/common'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Global prefix for REST endpoints
  app.setGlobalPrefix('api')

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })

  // Global pipes & filters
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.useGlobalFilters(new HttpExceptionFilter())

  const port = process.env.PORT ?? 4000
  await app.listen(port)
  console.log(`🚀 MorganAI backend running on http://localhost:${port}`)
}
bootstrap()
