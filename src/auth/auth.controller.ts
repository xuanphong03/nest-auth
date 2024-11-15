import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private userService: UsersService,
  ) {}

  @Post('/register')
  async register(@Body() body: RegisterAuthDto, @Res() res) {
    const schema = z.object({
      name: z
        .string({
          required_error: 'Tên bắt buộc phải nhập',
        })
        .min(4, 'Tên phải chứa ít nhất 4 ký tự'),
      email: z
        .string({
          required_error: 'Email bắt buộc phải nhập',
        })
        .email('Email không đúng định dạng')
        .refine(async (email) => {
          const user = await this.userService.findByEmail(email);
          return !user;
        }, 'Email đã có người sử dụng'),
      password: z
        .string({
          required_error: 'Mật khẩu bắt buộc phải nhập',
        })
        .min(6, 'Mật khẩu phải chứa ít nhất 6 ký tự'),
    });
    // Xử lý validate body (nếu schema sử dụng async => schema.safeParseAsync(body))
    const validatedFields = await schema.safeParseAsync(body);
    if (!validatedFields.success) {
      const errors = validatedFields.error.flatten().fieldErrors;
      const errorKeys = Object.keys(errors);
      const errorMessage = errors[errorKeys[0]][0];
      return res.status(HttpStatus.BAD_REQUEST).json({
        status: HttpStatus.BAD_REQUEST,
        success: false,
        errors,
        message: errorMessage,
      });
    }
    const data = await this.authService.register(body);
    return res.status(HttpStatus.CREATED).json({
      status: HttpStatus.CREATED,
      success: true,
      data,
      message: 'Đăng ký tài khoản thành công',
    });
  }

  @Post('/login')
  async login(@Body() body: LoginAuthDto, @Res() res) {
    const schema = z.object({
      email: z
        .string({
          required_error: 'Email bắt buộc phải nhập',
        })
        .email('Email không đúng định dạng')
        .refine(async (email) => {
          const user = await this.userService.findByEmail(email);
          return user;
        }, 'Email chưa được đăng ký'),
      password: z.string({
        required_error: 'Mật khẩu bắt buộc phải nhập',
      }),
    });
    // Xử lý validate body (nếu schema sử dụng async => schema.safeParseAsync(body))
    const validatedFields = await schema.safeParseAsync(body);
    if (!validatedFields.success) {
      const errors = validatedFields.error.flatten().fieldErrors;
      return res.status(HttpStatus.BAD_REQUEST).json({
        status: HttpStatus.BAD_REQUEST,
        success: false,
        errors,
        message: 'Email hoặc mật khẩu không chính xác',
      });
    }
    const tokens = await this.authService.login(body);
    if (!tokens) {
      return res.status(HttpStatus.FORBIDDEN).json({
        status: HttpStatus.FORBIDDEN,
        success: false,
        message: 'Tài khoản hoặc mật khẩu chưa chính xác',
      });
    }

    return res.status(HttpStatus.OK).json({
      status: HttpStatus.OK,
      success: true,
      data: tokens,
      message: 'Đăng nhập thành công',
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('/logout')
  async logout(@Req() req, @Res() res) {
    const user = req.user;
    await this.authService.logout(user.id);
    return res.status(HttpStatus.OK).json({
      success: true,
      status: HttpStatus.OK,
      message: 'Đăng xuất thành công',
    });
  }

  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('/refresh')
  async refreshTokens(@Req() req, @Res() res) {
    const user = req.user;
    const tokens = await this.authService.refreshTokens(
      user.sub,
      user.refreshToken,
    );

    if (!tokens) {
      return res.status(HttpStatus.FORBIDDEN).json({
        status: HttpStatus.FORBIDDEN,
        success: false,
        message: 'Token không hợp lệ',
      });
    }
    return res.status(HttpStatus.OK).json({
      status: HttpStatus.OK,
      success: true,
      data: tokens,
      message: 'SUCCESS',
    });
  }
}
