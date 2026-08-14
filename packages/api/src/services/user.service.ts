import { prisma } from '../config/database.js';
import { NotFoundError, ConflictError } from '../lib/errors.js';
import type { CreateUser, UpdateUser, User } from '@stellar-ambassador/shared';

export class UserService {
  /**
   * Get all users with pagination
   */
  static async getAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    return { users, total, page, limit };
  }

  /**
   * Get user by ID
   */
  static async getById(id: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Get user by email
   */
  static async getByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Create new user
   */
  static async create(data: CreateUser): Promise<User> {
    // Check if email already exists
    const existing = await this.getByEmail(data.email);
    if (existing) {
      throw new ConflictError(`User with email ${data.email} already exists`);
    }

    return prisma.user.create({
      data,
    });
  }

  /**
   * Update user
   */
  static async update(id: string, data: UpdateUser): Promise<User> {
    // Verify user exists
    await this.getById(id);

    // If email is being updated, check it's not taken
    if (data.email) {
      const existing = await this.getByEmail(data.email);
      if (existing && existing.id !== id) {
        throw new ConflictError(`Email ${data.email} is already taken`);
      }
    }

    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete user
   */
  static async delete(id: string): Promise<void> {
    // Verify user exists
    await this.getById(id);

    await prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Search users by name or email
   */
  static async search(query: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { email: { contains: query, mode: 'insensitive' as const } },
      ],
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }
}
