import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Reservation as ReservationEntity } from '@prisma/client';

import { ReservationsService } from './reservations.service';
import { ReservationModel } from './models/reservation.model';
import { CreateReservationInput } from './dto/create-reservation.input';
import { UpdateReservationInput } from './dto/update-reservation.input';
import { ReservationStatus } from './reservation-status.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Resolver(() => ReservationModel)
export class ReservationsResolver {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Mutation(() => ReservationModel)
  createReservation(
    @Args('input') input: CreateReservationInput,
  ): Promise<ReservationEntity> {
    return this.reservationsService.create(input);
  }

  @Mutation(() => ReservationModel)
  updateReservation(
    @Args({ name: 'id', type: () => ID }) id: string,
    @Args('input') input: UpdateReservationInput,
  ): Promise<ReservationEntity> {
    return this.reservationsService.update(id, input);
  }

  @Mutation(() => ReservationModel)
  cancelReservation(
    @Args({ name: 'id', type: () => ID }) id: string,
  ): Promise<ReservationEntity> {
    return this.reservationsService.cancel(id);
  }

  @Mutation(() => ReservationModel)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('EMPLOYEE')
  updateReservationStatus(
    @Args({ name: 'id', type: () => ID }) id: string,
    @Args('status', { type: () => ReservationStatus })
    status: ReservationStatus,
  ): Promise<ReservationEntity> {
    return this.reservationsService.updateStatus(id, status);
  }

  @Query(() => [ReservationModel])
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('EMPLOYEE')
  reservations(
    @Args('status', { type: () => ReservationStatus, nullable: true })
    status?: ReservationStatus,
    @Args('date', { type: () => String, nullable: true })
    date?: string,
  ): Promise<ReservationEntity[]> {
    return this.reservationsService.findAll({ status, date });
  }

  @Query(() => ReservationModel)
  reservation(
    @Args({ name: 'id', type: () => ID }) id: string,
  ): Promise<ReservationEntity> {
    return this.reservationsService.findOne(id);
  }
}
