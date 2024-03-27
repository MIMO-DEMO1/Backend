import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body(new ValidationPipe({whitelist: true, forbidNonWhitelisted: true})) body: RegisterDto): Promise<any> {
    return this.authService.register(body);
  }

  @Post('login')
  async login(
    @Body(new ValidationPipe({whitelist: true, forbidNonWhitelisted: true})) body: LoginDto,
    @Res({ passthrough: true }) res,
  ): Promise<any> {
    const result = await this.authService.login(body);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: false,
    });
    return {
      message: result.message,
      accessToken: result.accessToken,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  async logout(@Req() req): Promise<any> {
    return this.authService.logout(req.user, req.cookies.refreshToken);
  }

  @Post('refresh')
  async refresh(@Req() req, @Res({ passthrough: true }) res): Promise<any> {
    const result = await this.authService.refresh(req.cookies.refreshToken);
    const { refreshToken, ...rest } = result;
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
    });
    return rest;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Req() req): Promise<any> {
    return this.authService.me(req.user);
  }
}
