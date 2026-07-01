import { PartialType } from '@nestjs/mapped-types';
import { CreateDevelopmentRecordDto } from './create-development-record.dto';

/**
 * Every field from CreateDevelopmentRecordDto, but optional —
 * supports PATCH semantics: send only the fields you want to change.
 */
export class UpdateDevelopmentRecordDto extends PartialType(
  CreateDevelopmentRecordDto,
) {}