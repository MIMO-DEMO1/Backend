import { IsNotEmpty, IsOptional } from 'class-validator';

IsNotEmpty;
export class UpdateDto {
  @IsOptional()
  @IsNotEmpty()
  firstName: string;

  @IsOptional()
  @IsNotEmpty()
  lastName: string;
}
