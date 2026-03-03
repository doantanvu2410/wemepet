import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AuthUser } from '../../shared/types/auth-user';
import { DecideTransferDto } from './dto/decide-transfer.dto';
import { ListTransfersDto } from './dto/list-transfers.dto';
import { RequestTransferDto } from './dto/request-transfer.dto';
import { TransfersService } from './transfers.service';

@Controller('transfers')
@UseGuards(AuthGuard)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  request(@CurrentUser() user: AuthUser, @Body() dto: RequestTransferDto) {
    return this.transfersService.request(user.id, dto);
  }

  @Get('incoming')
  incoming(@CurrentUser() user: AuthUser, @Query() query: ListTransfersDto) {
    return this.transfersService.incoming(user.id, query);
  }

  @Get('history')
  history(@CurrentUser() user: AuthUser, @Query() query: ListTransfersDto) {
    return this.transfersService.history(user.id, query);
  }

  @Post(':transferId/accept')
  accept(
    @Param('transferId') transferId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: DecideTransferDto,
  ) {
    return this.transfersService.accept(transferId, user.id, body.reason);
  }

  @Post(':transferId/reject')
  reject(
    @Param('transferId') transferId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: DecideTransferDto,
  ) {
    return this.transfersService.reject(transferId, user.id, body.reason);
  }

  @Post(':transferId/cancel')
  cancel(
    @Param('transferId') transferId: string,
    @CurrentUser() user: AuthUser,
    @Body() body: DecideTransferDto,
  ) {
    return this.transfersService.cancel(transferId, user.id, body.reason);
  }
}
