import { Field, InputType, Int } from '@nestjs/graphql';
import { IsDateString, IsEmail, IsInt, IsPositive, IsString } from 'class-validator';

@InputType()
export class CreateReservationInput {
  @Field()
  @IsString()
  guestName!: string;

  @Field()
  @IsString()
  phone!: string;

  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsDateString()
  expectedArrivalTime!: string;

  @Field(() => Int)
  @IsInt()
  @IsPositive()
  tableSize!: number;
}

