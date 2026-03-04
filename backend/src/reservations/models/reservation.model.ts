import { Field, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { ReservationStatus } from '../reservation-status.enum';

registerEnumType(ReservationStatus, {
  name: 'ReservationStatus',
});

@ObjectType()
export class ReservationModel {
  @Field(() => ID, { nullable: true })
  id?: string;

  @Field()
  guestName!: string;

  @Field()
  phone!: string;

  @Field()
  email!: string;

  @Field()
  expectedArrivalTime!: Date;

  @Field(() => Int)
  tableSize!: number;

  @Field(() => ReservationStatus)
  status!: ReservationStatus;
}

