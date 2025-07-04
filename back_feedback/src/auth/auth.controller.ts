import {
  BadRequestException,
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Request, Response } from "express";
import { UserService } from "src/user/application/user.service";
import { AuthGuard } from "@nestjs/passport";
import { GoogleUser } from "src/types/auth.type";
import { CreateUser, User } from "src/types/user.type";
import { BypassAuth } from "src/common/decorators/bypass-auth.decorator";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Get("/google")
  @BypassAuth()
  @UseGuards(AuthGuard("google"))
  async googleLogin() {}

  @Get("/google/callback")
  @BypassAuth()
  @UseGuards(AuthGuard("google"))
  async googleLoginCallback(
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user: GoogleUser = req.user;
    const { providerAccountId, email, name, type } = user;

    let loggedInUser: User;
    switch (type) {
      case "login": {
        loggedInUser = await this.authService.login(providerAccountId);
        break;
      }

      case "signup": {
        const createUser: CreateUser = { providerAccountId, email, name };
        loggedInUser = await this.authService.signUp(createUser);
        break;
      }
    }

    const accessToken =
      await this.authService.generateAccessToken(providerAccountId);
    const refreshToken = await this.authService.generateRefreshToken(
      loggedInUser.id,
    );

    await this.userService.updateRefreshToken(providerAccountId, refreshToken);

    res.cookie("provider_account_id", providerAccountId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60, // 1 hour
    });
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });

    res.redirect(`${process.env.CLIENT_URL}/login-success`);
  }

  @Get("/refresh")
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const providerAccountId: string | undefined =
      req.cookies["provider_account_id"];
    const refreshToken: string | undefined = req.cookies["refresh_token"];

    if (!providerAccountId || !refreshToken) {
      throw new BadRequestException("Have to login");
    }

    const user =
      await this.userService.findUserByProviderAccountId(providerAccountId);

    const newAccessToken = await this.authService.refreshAccessToken(
      providerAccountId,
      refreshToken,
    );
    const newRefreshToken = await this.authService.generateRefreshToken(
      user.id,
    );

    await this.userService.updateRefreshToken(
      providerAccountId,
      newRefreshToken,
    );

    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60, // 1 hour
    });
    res.cookie("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    });
  }

  @Get("/logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const providerAccountId: string | undefined =
      req.cookies["provider_account_id"];

    if (!providerAccountId) {
      throw new BadRequestException("Have to login");
    }

    await this.authService.logout(providerAccountId);

    res.clearCookie("provider_account_id", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
  }

  @Get("/withdraw")
  async withdraw(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const providerAccountId: string | undefined =
      req.cookies["provider_account_id"];

    if (!providerAccountId) {
      throw new BadRequestException("Have to login");
    }

    await this.authService.withdraw(providerAccountId);

    res.clearCookie("provider_account_id", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
  }
}
