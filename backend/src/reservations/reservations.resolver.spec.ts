import { Test, TestingModule } from '@nestjs/testing';

import { ReservationsResolver } from './reservations.resolver';
import { ReservationsService } from './reservations.service';
import { ReservationStatus } from './reservation-status.enum';

describe('ReservationsResolver', () => {
  let resolver: ReservationsResolver;
  let service: jest.Mocked<ReservationsService>;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      updateStatus: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsResolver,
        { provide: ReservationsService, useValue: mockService },
      ],
    }).compile();

    resolver = module.get<ReservationsResolver>(ReservationsResolver);
    service = module.get(ReservationsService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createReservation', () => {
    it('delegates to service.create', async () => {
      const input = {
        guestName: 'Bob',
        phone: '+1 555',
        email: 'bob@example.com',
        expectedArrivalTime: '2026-04-01T18:00:00Z',
        tableSize: 2,
      };
      const expected = { id: 'r1', ...input, status: ReservationStatus.REQUESTED };
      service.create.mockResolvedValueOnce(expected as any);

      const result = await resolver.createReservation(input);
      expect(service.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(expected);
    });
  });

  describe('updateReservation', () => {
    it('delegates to service.update', async () => {
      const updated = { id: 'r1', tableSize: 6 };
      service.update.mockResolvedValueOnce(updated as any);

      const result = await resolver.updateReservation('r1', { tableSize: 6 });
      expect(service.update).toHaveBeenCalledWith('r1', { tableSize: 6 });
      expect(result).toEqual(updated);
    });
  });

  describe('cancelReservation', () => {
    it('delegates to service.cancel', async () => {
      const cancelled = { id: 'r1', status: ReservationStatus.CANCELLED };
      service.cancel.mockResolvedValueOnce(cancelled as any);

      const result = await resolver.cancelReservation('r1');
      expect(service.cancel).toHaveBeenCalledWith('r1');
      expect(result.status).toBe(ReservationStatus.CANCELLED);
    });
  });

  describe('updateReservationStatus', () => {
    it('delegates to service.updateStatus', async () => {
      const approved = { id: 'r1', status: ReservationStatus.APPROVED };
      service.updateStatus.mockResolvedValueOnce(approved as any);

      const result = await resolver.updateReservationStatus(
        'r1',
        ReservationStatus.APPROVED,
      );
      expect(service.updateStatus).toHaveBeenCalledWith('r1', ReservationStatus.APPROVED);
      expect(result.status).toBe(ReservationStatus.APPROVED);
    });
  });

  describe('reservations', () => {
    it('returns all reservations', async () => {
      const list = [{ id: 'r1' }, { id: 'r2' }];
      service.findAll.mockResolvedValueOnce(list as any);

      const result = await resolver.reservations();
      expect(service.findAll).toHaveBeenCalledWith({
        status: undefined,
        date: undefined,
      });
      expect(result).toHaveLength(2);
    });

    it('passes status filter', async () => {
      service.findAll.mockResolvedValueOnce([]);

      await resolver.reservations(ReservationStatus.APPROVED, '2026-04-01');
      expect(service.findAll).toHaveBeenCalledWith({
        status: ReservationStatus.APPROVED,
        date: '2026-04-01',
      });
    });
  });

  describe('reservation', () => {
    it('returns a single reservation by id', async () => {
      const reservation = { id: 'r1', guestName: 'Alice' };
      service.findOne.mockResolvedValueOnce(reservation as any);

      const result = await resolver.reservation('r1');
      expect(service.findOne).toHaveBeenCalledWith('r1');
      expect(result).toEqual(reservation);
    });
  });
});
