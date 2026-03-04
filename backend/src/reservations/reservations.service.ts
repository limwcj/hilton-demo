import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateReservationInput } from './dto/create-reservation.input';
import { UpdateReservationInput } from './dto/update-reservation.input';
import { ReservationStatus } from './reservation-status.enum';
import { Reservation as ReservationEntity } from '@prisma/client';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(input: CreateReservationInput): Promise<ReservationEntity> {
    return this.prisma.reservation.create({
      data: {
        guestName: input.guestName,
        phone: input.phone,
        email: input.email,
        expectedArrivalTime: new Date(input.expectedArrivalTime),
        tableSize: input.tableSize,
        status: ReservationStatus.REQUESTED,
      },
    });
  }

  async update(
    id: string,
    input: UpdateReservationInput,
  ): Promise<ReservationEntity> {
    const existing = await this.prisma.reservation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Reservation not found');

    return this.prisma.reservation.update({
      where: { id },
      data: {
        expectedArrivalTime: input.expectedArrivalTime
          ? new Date(input.expectedArrivalTime)
          : existing.expectedArrivalTime,
        tableSize: input.tableSize ?? existing.tableSize,
      },
    });
  }

  async cancel(id: string): Promise<ReservationEntity> {
    return this.updateStatus(id, ReservationStatus.CANCELLED);
  }

  async updateStatus(
    id: string,
    status: ReservationStatus,
  ): Promise<ReservationEntity> {
    const existing = await this.prisma.reservation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Reservation not found');

    return this.prisma.reservation.update({
      where: { id },
      data: { status },
    });
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

    return this.prisma.reservation.findMany({
      where,
      orderBy: { expectedArrivalTime: 'asc' },
    });
  }

  async findOne(id: string): Promise<ReservationEntity> {
    const reservation = await this.prisma.reservation.findUnique({ where: { id } });
    if (!reservation) throw new NotFoundException('Reservation not found');
    return reservation;
  }
}

