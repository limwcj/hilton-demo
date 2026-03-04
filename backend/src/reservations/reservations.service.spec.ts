import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { ReservationsService } from './reservations.service';
import { ReservationStatus } from './reservation-status.enum';
import { PrismaService } from '../prisma/prisma.service';

describe('ReservationsService', () => {
  let service: ReservationsService;

  const prismaMock = {
    reservation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a reservation with REQUESTED status', async () => {
      const input = {
        guestName: 'Alice',
        phone: '+1 555 111 2222',
        email: 'alice@example.com',
        expectedArrivalTime: '2026-04-01T18:00:00.000Z',
        tableSize: 4,
      };

      const created = { id: 'r1', ...input, status: ReservationStatus.REQUESTED };
      (prismaMock.reservation.create as jest.Mock).mockResolvedValueOnce(created);

      const result = await service.create(input);

      expect(prismaMock.reservation.create).toHaveBeenCalledWith({
        data: {
          guestName: 'Alice',
          phone: '+1 555 111 2222',
          email: 'alice@example.com',
          expectedArrivalTime: new Date('2026-04-01T18:00:00.000Z'),
          tableSize: 4,
          status: ReservationStatus.REQUESTED,
        },
      });
      expect(result.status).toBe(ReservationStatus.REQUESTED);
    });
  });

  describe('update', () => {
    it('updates arrival time and table size', async () => {
      const existing = {
        id: 'r1',
        expectedArrivalTime: new Date('2026-04-01T18:00:00.000Z'),
        tableSize: 4,
        status: ReservationStatus.REQUESTED,
      };
      (prismaMock.reservation.findUnique as jest.Mock).mockResolvedValueOnce(existing);
      (prismaMock.reservation.update as jest.Mock).mockResolvedValueOnce({
        ...existing,
        tableSize: 6,
      });

      const result = await service.update('r1', { tableSize: 6 });

      expect(prismaMock.reservation.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: {
          expectedArrivalTime: existing.expectedArrivalTime,
          tableSize: 6,
        },
      });
      expect(result.tableSize).toBe(6);
    });

    it('throws NotFoundException when reservation does not exist', async () => {
      (prismaMock.reservation.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.update('missing', { tableSize: 2 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('throws when reservation not found on cancel', async () => {
      (prismaMock.reservation.findUnique as jest.Mock).mockResolvedValueOnce(null);
      await expect(service.cancel('123')).rejects.toThrow('Reservation not found');
    });

    it('updates status to CANCELLED', async () => {
      const existing = {
        id: '1',
        status: ReservationStatus.REQUESTED,
        expectedArrivalTime: new Date(),
        tableSize: 2,
      };
      (prismaMock.reservation.findUnique as jest.Mock).mockResolvedValueOnce(existing);
      (prismaMock.reservation.update as jest.Mock).mockResolvedValueOnce({
        ...existing,
        status: ReservationStatus.CANCELLED,
      });

      const result = await service.cancel('1');

      expect(prismaMock.reservation.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: ReservationStatus.CANCELLED },
      });
      expect(result.status).toBe(ReservationStatus.CANCELLED);
    });
  });

  describe('updateStatus', () => {
    it('updates to APPROVED', async () => {
      const existing = { id: 'r1', status: ReservationStatus.REQUESTED };
      (prismaMock.reservation.findUnique as jest.Mock).mockResolvedValueOnce(existing);
      (prismaMock.reservation.update as jest.Mock).mockResolvedValueOnce({
        ...existing,
        status: ReservationStatus.APPROVED,
      });

      const result = await service.updateStatus('r1', ReservationStatus.APPROVED);
      expect(result.status).toBe(ReservationStatus.APPROVED);
    });

    it('throws NotFoundException for non-existent reservation', async () => {
      (prismaMock.reservation.findUnique as jest.Mock).mockResolvedValueOnce(null);
      await expect(
        service.updateStatus('missing', ReservationStatus.APPROVED),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns all reservations without filters', async () => {
      const reservations = [
        { id: 'r1', status: ReservationStatus.REQUESTED },
        { id: 'r2', status: ReservationStatus.APPROVED },
      ];
      (prismaMock.reservation.findMany as jest.Mock).mockResolvedValueOnce(reservations);

      const result = await service.findAll({});

      expect(prismaMock.reservation.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { expectedArrivalTime: 'asc' },
      });
      expect(result).toHaveLength(2);
    });

    it('filters by status', async () => {
      (prismaMock.reservation.findMany as jest.Mock).mockResolvedValueOnce([]);

      await service.findAll({ status: ReservationStatus.APPROVED });

      expect(prismaMock.reservation.findMany).toHaveBeenCalledWith({
        where: { status: ReservationStatus.APPROVED },
        orderBy: { expectedArrivalTime: 'asc' },
      });
    });

    it('filters by date range', async () => {
      (prismaMock.reservation.findMany as jest.Mock).mockResolvedValueOnce([]);

      await service.findAll({ date: '2026-04-01' });

      const call = (prismaMock.reservation.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.expectedArrivalTime.gte).toEqual(new Date('2026-04-01'));
    });
  });

  describe('findOne', () => {
    it('returns reservation by id', async () => {
      const reservation = { id: 'r1', guestName: 'Alice' };
      (prismaMock.reservation.findUnique as jest.Mock).mockResolvedValueOnce(reservation);

      const result = await service.findOne('r1');
      expect(result).toEqual(reservation);
    });

    it('throws NotFoundException when not found', async () => {
      (prismaMock.reservation.findUnique as jest.Mock).mockResolvedValueOnce(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
