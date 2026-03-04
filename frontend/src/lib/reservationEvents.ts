import { Subject } from "rxjs";

export type ReservationStatus = "REQUESTED" | "APPROVED" | "CANCELLED" | "COMPLETED";

export interface ReservationEvent {
  id: string;
  status: ReservationStatus;
  at: string;
}

export const reservationEvents$ = new Subject<ReservationEvent>();

