import type { UserRepository } from '../database/repositories/user.repository.js';
import type { User } from '../database/schema.js';

export class UserService {
  constructor(private userRepo: UserRepository) {}

  async getOrCreate(telegramUser: {
    id: number;
    username?: string;
    first_name?: string;
  }): Promise<User> {
    return this.userRepo.upsert({
      id: telegramUser.id,
      username: telegramUser.username,
      firstName: telegramUser.first_name,
    });
  }

  async setActiveCharacter(userId: number, charId: number): Promise<void> {
    await this.userRepo.updateActiveChar(userId, charId);
  }
}
