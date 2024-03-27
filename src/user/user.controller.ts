import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
  ValidationPipe,
  UseInterceptors,
  Post,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { UpdateDto } from './dto/update.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Controller('user')
export class UserController {
  constructor(
    private userService: UserService,
    private cloudinaryService: CloudinaryService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async findAll(@Req() req): Promise<any> {
    return this.userService.findAll(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
  ): Promise<any> {
    return this.userService.findOne(id, req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('avatar'))
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: UpdateDto,
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    if (file) {
      const imgUrl = await this.cloudinaryService.uploadFile(file);
      return this.userService.update(req.user, id, body, imgUrl);
    } else {
      return this.userService.update(req.user, id, body, null);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
  ): Promise<any> {
    return this.userService.delete(id, req.user);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('avatar'))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.cloudinaryService.uploadFile(file);
  }
}
