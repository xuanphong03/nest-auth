import {
  Controller,
  Get,
  HttpStatus,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('/me')
  async me(@Req() req, @Res() res) {
    const user = req.user;
    if (!user) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        status: HttpStatus.UNAUTHORIZED,
        success: false,
        message: 'Unauthorized',
      });
    }
    const profile = await this.usersService.findUser(user.id, user.email);
    return res.status(HttpStatus.OK).json({
      status: HttpStatus.OK,
      success: true,
      data: profile,
      message: 'Success',
    });
  }
}
