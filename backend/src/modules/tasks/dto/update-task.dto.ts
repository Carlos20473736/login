import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { TaskStatus } from '../task.entity';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus, {
    message: 'Status deve ser: pendente, em_andamento ou concluida',
  })
  @IsOptional()
  status?: TaskStatus;

  @IsDateString({}, { message: 'Data de vencimento deve estar no formato YYYY-MM-DD' })
  @IsOptional()
  dueDate?: string;
}
