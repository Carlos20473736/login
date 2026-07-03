import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do projeto é obrigatório' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
