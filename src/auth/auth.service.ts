import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private prismaService: PrismaService,
    private jwtService: JwtService,
  ) {}

  register = async (data: RegisterDto): Promise<any> => {
    //Tìm trong database có email này chưa
    const user = await this.prismaService.users.findUnique({
      where: {
        email: data.email,
      },
    });

    //Nếu có thì thông báo email này đã được sử dụng
    if (user) {
      throw new HttpException(
        { message: 'This email has already been used' },
        HttpStatus.CONFLICT,
      );
    }

    //Nếu email này chưa được sử dụng thì đăng kí tài khoản mới
    //Băm mật khẩu
    const hashPassword = await bcrypt.hash(data.password, 10);
    //Đăng kí người dùng mới
    const newUser = await this.prismaService.users.create({
      data: {
        ...data,
        password: hashPassword,
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
      message: 'Register successfully.',
      data: newUser,
    };
  };

  login = async (data: LoginDto) => {
    //Kiểm tra xem email này đã được đăng kí chưa
    const user = await this.prismaService.users.findUnique({
      where: {
        email: data.email,
      },
    });

    //Nếu email này chưa đăng kí thì thông báo cho client biết
    if (!user) {
      throw new HttpException(
        { message: 'This email is not registered.' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    //Nếu email này đã đăng kí thì kiểm tra tiếp xem mật khẩu có chính xác không
    const isMatch = await bcrypt.compare(data.password, user.password);

    //Nếu mật khẩu không chính xác thì thông báo cho client biết
    if (!isMatch) {
      throw new HttpException(
        { message: 'Password is incorrect.' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    //Nếu cả email và pasword đều đúng thì tạo access token và refresh token cho user
    //Thêm field uuid nhằm mục đích kiểm tra xem mỗi request chứa access token từ client gửi lên có hợp lệ không
    const uuidAT = uuidv4();
    const payloadAT = {
      sub: user.id,
      email: user.email,
      uuid: uuidAT,
    };
    const payloadRT = {
      sub: user.id,
      email: user.email,
    };

    //Tạo access token và refresh token
    const accessToken = await this.jwtService.signAsync(payloadAT, {
      secret: process.env.ACCESS_JWT_SECRET,
      expiresIn: process.env.AT_EXPIRES_IN,
    });
    const refreshToken = await this.jwtService.signAsync(payloadRT, {
      secret: process.env.REFRESH_JWT_SECRET,
      expiresIn: process.env.RT_EXPIRES_IN,
    });

    //Thêm uuid vào trong redis nhằm kiểm tra tính hợp lệ của access token từ client gửi lên sau này và nó có ttl bằng với của access token
    await this.cacheManager.set(
      uuidAT,
      'hello',
      Number(process.env.AT_EXPIRES_IN_MS),
    );

    //Lưu refresh token vào redis để sau này generate ra access token mới
    await this.cacheManager.set(
      refreshToken,
      'refreshToken',
      Number(process.env.RT_EXPIRES_IN_MS),
    );

    return {
      message: 'Login successfully.',
      accessToken,
      refreshToken,
    };
  };

  logout = async (
    userData: {
      id: number;
      email: string;
      uuid: string;
    },
    userRT: string,
  ): Promise<any> => {
    const cacheValue = await this.cacheManager.get(userData.uuid);
    if (cacheValue) {
      await this.cacheManager.del(userData.uuid);
      await this.cacheManager.del(userRT);
      return {
        message: 'Logout successfully.',
      };
    }
    throw new HttpException(
      { message: 'Unauthorized' },
      HttpStatus.UNAUTHORIZED,
    );
  };

  refresh = async (userRT: string): Promise<any> => {
    const cacheValue = await this.cacheManager.get(userRT);
    if (!cacheValue)
      throw new HttpException(
        { message: 'Unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );
    await this.cacheManager.del(userRT);
    const user = await this.jwtService.verifyAsync(userRT, {
      secret: process.env.REFRESH_JWT_SECRET,
    });
    const userData = await this.prismaService.users.findUnique({
      where: {
        email: user.email,
      },
    });
    if (!userData)
      throw new HttpException(
        { message: 'User is not exist' },
        HttpStatus.NOT_FOUND,
      );
    const uuidAT = uuidv4();
    const payloadAT = {
      sub: userData.id,
      email: userData.email,
      uuid: uuidAT,
    };
    const payloadRT = {
      sub: userData.id,
      email: userData.email,
    };

    //Tạo access token và refresh token
    const accessToken = await this.jwtService.signAsync(payloadAT, {
      secret: process.env.ACCESS_JWT_SECRET,
      expiresIn: process.env.AT_EXPIRES_IN,
    });
    const refreshToken = await this.jwtService.signAsync(payloadRT, {
      secret: process.env.REFRESH_JWT_SECRET,
      expiresIn: process.env.RT_EXPIRES_IN,
    });

    //Thêm uuid vào trong redis nhằm kiểm tra tính hợp lệ của access token từ client gửi lên sau này và nó có ttl bằng với của access token
    await this.cacheManager.set(
      uuidAT,
      'hello',
      Number(process.env.AT_EXPIRES_IN_MS),
    );

    //Lưu refresh token vào redis để sau này generate ra access token mới
    await this.cacheManager.set(
      refreshToken,
      'refreshToken',
      Number(process.env.RT_EXPIRES_IN_MS),
    );

    return {
      message: 'Refresh token successfully.',
      accessToken,
      refreshToken,
    };
  };

  me = async (data: {
    id: number;
    email: string;
    uuid: string;
  }): Promise<any> => {
    const verifyAT = await this.cacheManager.get(data.uuid);
    if (verifyAT) {
      const user = await this.prismaService.users.findUnique({
        where: {
          email: data.email,
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
        data: user,
      };
    }
    throw new HttpException(
      { message: 'Unauthorized' },
      HttpStatus.UNAUTHORIZED,
    );
  };
}
