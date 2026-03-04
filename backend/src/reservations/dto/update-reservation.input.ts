import { Field, InputType, Int } from '@nestjs/graphql';
import { IsDateString, IsInt, IsOptional, IsPositive } from 'class-validator';

@InputType()
export class UpdateReservationInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  expectedArrivalTime?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  tableSize?: number;
}

