import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
      },
    });
  }
  findUser(id: number, email: string) {
    return this.prisma.user.findUnique({
      where: {
        id,
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });
  }
}
