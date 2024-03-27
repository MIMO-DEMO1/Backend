import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { PrismaService } from 'src/prisma.service';
import { UpdateDto } from './dto/update.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private prismaService: PrismaService,
  ) {}

  findAll = async (userReq: {
    id: number;
    email: string;
    uuid: string;
  }): Promise<any> => {
    const cacheValue = await this.cacheManager.get(userReq.uuid);
    if (!cacheValue) {
      throw new HttpException(
        { message: 'Unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const allUsers = await this.prismaService.users.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return {
      data: allUsers,
    };
  };

  findOne = async (
    userId: number,
    userReq: { id: number; email: string; uuid: string },
  ): Promise<any> => {
    const cacheValue = await this.cacheManager.get(userReq.uuid);
    if (!cacheValue) {
      throw new HttpException(
        { message: 'Unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const user = await this.prismaService.users.findUnique({
      where: {
        id: userId,
      },
    });
    if (!user)
      throw new HttpException(
        { message: `Cannot find user with id: ${userId}` },
        HttpStatus.NOT_FOUND,
      );
    return {
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  };

  update = async (
    userReq: { id: number; email: string; uuid: string },
    userId: number,
    body: UpdateDto,
    imgUrl: any,
  ): Promise<any> => {
    const cacheValue = await this.cacheManager.get(userReq.uuid);
    if (!cacheValue) {
      throw new HttpException(
        { message: 'Unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const validUser = await this.prismaService.users.findUnique({
      where: {
        id: userId,
      },
    });
    if (!validUser)
      throw new HttpException(
        { message: `Cannot find user with id: ${userId}` },
        HttpStatus.NOT_FOUND,
      );
    if (imgUrl !== null) {
      const result = await this.prismaService.users.update({
        where: {
          id: userId,
        },
        data: {
          ...body,
          avatar: imgUrl.secure_url,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return {
        message: 'Updated successfully.',
        data: result,
      };
    } else {
      const result = await this.prismaService.users.update({
        where: {
          id: userId,
        },
        data: body,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return {
        message: 'Updated successfully.',
        data: result,
      };
    }
  };

  delete = async (
    userId: number,
    userReq: { id: number; email: string; uuid: string },
  ): Promise<any> => {
    const cacheValue = await this.cacheManager.get(userReq.uuid);
    if (!cacheValue) {
      throw new HttpException(
        { message: 'Unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );
    }
    const validUser = await this.prismaService.users.findUnique({
      where: {
        id: userId,
      },
    });
    if (!validUser)
      throw new HttpException(
        { message: `Cannot find user with id: ${userId}` },
        HttpStatus.NOT_FOUND,
      );
    const result = await this.prismaService.users.delete({
      where: {
        id: userId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return {
      message: 'Delete successfully.',
      data: result,
    };
  };
}
