import { Injectable } from '@nestjs/common'
import { PrismaService } from '../common/prisma.service'

@Injectable()
export class CharactersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPublic(opts: { tags?: string[]; search?: string; page: number; limit: number }) {
    const where: any = { visibility: 'PUBLIC' }
    if (opts.tags?.length) where.tags = { hasSome: opts.tags }
    if (opts.search) {
      where.OR = [
        { name: { contains: opts.search, mode: 'insensitive' } },
        { description: { contains: opts.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      this.prisma.character.findMany({
        where,
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { displayName: true } } },
      }),
      this.prisma.character.count({ where }),
    ])

    return { data, meta: { page: opts.page, limit: opts.limit, total } }
  }

  async findById(id: string) {
    return this.prisma.character.findUnique({
      where: { id },
      include: { creator: { select: { id: true, displayName: true } } },
    })
  }

  async create(userId: string, dto: {
    name: string
    description: string
    systemPrompt: string
    tags: string[]
    visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'
    avatarUrl?: string
  }) {
    return this.prisma.character.create({
      data: { ...dto, creatorId: userId },
    })
  }
}
