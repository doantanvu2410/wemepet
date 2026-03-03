import { PartialType } from '@nestjs/swagger';
import { CreateKoiDto } from './create-koi.dto';

export class UpdateKoiDto extends PartialType(CreateKoiDto) {}
