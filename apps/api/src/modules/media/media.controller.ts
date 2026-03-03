import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AuthUser } from '../../shared/types/auth-user';
import { CreateSignedUploadDto } from './dto/create-signed-upload.dto';
import { MediaService } from './media.service';

@Controller('media')
@UseGuards(AuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('signed-upload')
  createSignedUpload(@CurrentUser() user: AuthUser, @Body() dto: CreateSignedUploadDto) {
    return this.mediaService.createSignedUpload(user.id, dto);
  }

  @Post(':intentId/complete')
  completeUpload(@CurrentUser() user: AuthUser, @Param('intentId') intentId: string) {
    return this.mediaService.completeUpload(user.id, intentId);
  }
}
