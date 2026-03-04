import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationInput } from './dto/create-reservation.input';
import { UpdateReservationInput } from './dto/update-reservation.input';
import { ReservationStatus } from './reservation-status.enum';
import { Reservation as ReservationEntity } from '@prisma/client';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(input: CreateReservationInput): Promise<ReservationEntity> {
    this.logger.log(
      `Creating reservation: guest=${input.guestName}, tableSize=${input.tableSize}, arrivalTime=${input.expectedArrivalTime}`,
    );
    const reservation = await this.prisma.reservation.create({
      data: {
        guestName: input.guestName,
        phone: input.phone,
        email: input.email,
        expectedArrivalTime: new Date(input.expectedArrivalTime),
        tableSize: input.tableSize,
        status: ReservationStatus.REQUESTED,
      },
    });
    this.logger.log(`Reservation created: id=${reservation.id}, guest=${reservation.guestName}`);
    return reservation;
  }

  async update(
    id: string,
    input: UpdateReservationInput,
  ): Promise<ReservationEntity> {
    this.logger.log(`Updating reservation: id=${id}, fields=${JSON.stringify(input)}`);
    const existing = await this.prisma.reservation.findUnique({ where: { id } });
    if (!existing) {
      this.logger.warn(`Update failed — reservation not found: id=${id}`);
      throw new NotFoundException('Reservation not found');
    }

    const reservation = await this.prisma.reservation.update({
      where: { id },
      data: {
        expectedArrivalTime: input.expectedArrivalTime
          ? new Date(input.expectedArrivalTime)
          : existing.expectedArrivalTime,
        tableSize: input.tableSize ?? existing.tableSize,
      },
    });
    this.logger.log(`Reservation updated: id=${id}, guest=${reservation.guestName}`);
    return reservation;
  }

  async cancel(id: string): Promise<ReservationEntity> {
    this.logger.log(`Cancelling reservation: id=${id}`);
    return this.updateStatus(id, ReservationStatus.CANCELLED);
  }

  async updateStatus(
    id: string,
    status: ReservationStatus,
  ): Promise<ReservationEntity> {
    this.logger.log(`Updating reservation status: id=${id}, newStatus=${status}`);
    const existing = await this.prisma.reservation.findUnique({ where: { id } });
    if (!existing) {
      this.logger.warn(`Status update failed — reservation not found: id=${id}`);
      throw new NotFoundException('Reservation not found');
    }

    const reservation = await this.prisma.reservation.update({
      where: { id },
      data: { status },
    });
    this.logger.log(
      `Reservation status updated: id=${id}, guest=${reservation.guestName}, ${existing.status} → ${status}`,
    );
    return reservation;
  }

  async findAll(args: {
    status?: ReservationStatus;
    date?: string;
  }): Promise<ReservationEntity[]> {
    const where: Record<string, unknown> = {};
    if (args.status) {
      where.status = args.status;
    }
    if (args.date) {
      const day = new Date(args.date);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      where.expectedArrivalTime = {
        gte: day,
        lt: nextDay,
      };
    }

    const reservations = await this.prisma.reservation.findMany({
      where,
      orderBy: { expectedArrivalTime: 'asc' },
    });

    return reservations;
  }

  async findOne(id: string): Promise<ReservationEntity> {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation) {
      this.logger.warn(`Reservation not found: id=${id}`);
      throw new NotFoundException('Reservation not found');
    }
    
    return reservation;
  }
}

