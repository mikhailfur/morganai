import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { CharactersService } from './characters.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'

@Controller('characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Get()
  async list(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('tags') tags?: string,
    @Query('search') search?: string,
  ) {
    return this.charactersService.findAllPublic({
      page: Number(page),
      limit: Number(limit),
      tags: tags ? tags.split(',') : undefined,
      search,
    })
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.charactersService.findById(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @CurrentUser('userId') userId: string,
    @Body() body: {
      name: string
      description: string
      systemPrompt: string
      tags: string[]
      visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'
      avatarUrl?: string
    },
  ) {
    return this.charactersService.create(userId, body)
  }
}
