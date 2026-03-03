import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../shared/types/auth-user';
import { CreateKoiDto } from './dto/create-koi.dto';
import { ListKoiDto } from './dto/list-koi.dto';
import { UpdateKoiDto } from './dto/update-koi.dto';
import { KoiService } from './koi.service';

@Controller('koi')
export class KoiController {
  constructor(private readonly koiService: KoiService) {}

  @Get()
  list(@Query() query: ListKoiDto) {
    return this.koiService.list(query);
  }

  @Get(':koiId')
  detail(@Param('koiId') koiId: string) {
    return this.koiService.detail(koiId);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateKoiDto) {
    return this.koiService.create(user.id, dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':koiId')
  update(@Param('koiId') koiId: string, @CurrentUser() user: AuthUser, @Body() dto: UpdateKoiDto) {
    return this.koiService.update(koiId, user, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':koiId')
  remove(@Param('koiId') koiId: string, @CurrentUser() user: AuthUser) {
    return this.koiService.remove(koiId, user);
  }
}
