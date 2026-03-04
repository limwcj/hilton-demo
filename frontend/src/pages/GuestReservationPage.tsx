import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import {
  reservationEvents$,
  type ReservationEvent,
} from "../lib/reservationEvents";
import { gql } from "../lib/graphqlClient";

type ReservationStatus = "REQUESTED" | "APPROVED" | "CANCELLED" | "COMPLETED";
type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface FormErrors {
  guestName?: string;
  phone?: string;
  email?: string;
  arrivalTime?: string;
  tableSize?: string;
}

const GuestReservationPage = () => {
  const [guestName, setGuestName] = createSignal("Test Guest");
  const [phone, setPhone] = createSignal("+1 555 123 4567");
  const [email, setEmail] = createSignal("guest@example.com");
  const [arrivalTime, setArrivalTime] = createSignal(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  );
  const [tableSize, setTableSize] = createSignal(2);
  const [reservationId, setReservationId] = createSignal<string | null>(null);
  const [status, setStatus] = createSignal<ReservationStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [isCancelling, setIsCancelling] = createSignal(false);
  const [toasts, setToasts] = createSignal<Toast[]>([]);
  const [formErrors, setFormErrors] = createSignal<FormErrors>({});
  const [isSuccess, setIsSuccess] = createSignal(false);
  const [recentEvents, setRecentEvents] = createSignal<ReservationEvent[]>([]);

  let toastIdCounter = 0;

  createEffect(() => {
    const subscription = reservationEvents$.subscribe((event) => {
      setRecentEvents((prev) => [event, ...prev].slice(0, 5));
    });
    onCleanup(() => subscription.unsubscribe());
  });

  const showToast = (message: string, type: ToastType = "info") => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!guestName().trim()) {
      errors.guestName = "Please enter your name";
    }

    if (!phone().trim()) {
      errors.phone = "Please enter your phone number";
    } else if (!/^\+?[\d\s\-()]{8,}$/.test(phone().trim())) {
      errors.phone = "Please enter a valid phone number";
    }

    if (!email().trim()) {
      errors.email = "Please enter your email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email().trim())) {
      errors.email = "Please enter a valid email address";
    }

    if (!arrivalTime()) {
      errors.arrivalTime = "Please select an arrival time";
    } else {
      const selectedDate = new Date(arrivalTime());
      const now = new Date();
      if (selectedDate <= now) {
        errors.arrivalTime = "Arrival time must be in the future";
      }
    }

    if (tableSize() < 1 || tableSize() > 20) {
      errors.tableSize = "Table size must be between 1 and 20";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setGuestName("Test Guest");
    setPhone("+1 555 123 4567");
    setEmail("guest@example.com");
    setArrivalTime(
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    );
    setTableSize(2);
    setFormErrors({});
  };

  const submitReservation = async (event: Event) => {
    event.preventDefault();

    if (!validateForm()) {
      showToast("Please fix the highlighted fields before submitting.", "error");
      return;
    }

    setIsSubmitting(true);

    const isUpdating = Boolean(reservationId());

    try {
      if (isUpdating) {
        const data = await gql<{
          updateReservation: { id: string; status: ReservationStatus };
        }>(
          `mutation UpdateReservation($id: ID!, $input: UpdateReservationInput!) {
            updateReservation(id: $id, input: $input) { id status }
          }`,
          {
            id: reservationId(),
            input: {
              expectedArrivalTime: arrivalTime(),
              tableSize: tableSize(),
            },
          },
        );
        setReservationId(data.updateReservation.id);
        setStatus(data.updateReservation.status);
        reservationEvents$.next({
          id: data.updateReservation.id,
          status: data.updateReservation.status,
          at: new Date().toISOString(),
        });
        setIsSuccess(true);
        showToast("Reservation updated successfully.", "success");
      } else {
        const data = await gql<{
          createReservation: { id: string; status: ReservationStatus };
        }>(
          `mutation CreateReservation($input: CreateReservationInput!) {
            createReservation(input: $input) { id status }
          }`,
          {
            input: {
              guestName: guestName(),
              phone: phone(),
              email: email(),
              expectedArrivalTime: arrivalTime(),
              tableSize: tableSize(),
            },
          },
        );
        setReservationId(data.createReservation.id);
        setStatus(data.createReservation.status);
        reservationEvents$.next({
          id: data.createReservation.id,
          status: data.createReservation.status,
          at: new Date().toISOString(),
        });
        setIsSuccess(true);
        showToast("Reservation submitted successfully!", "success");
      }
    } catch {
      showToast(
        isUpdating
          ? "Failed to update reservation. Please try again."
          : "Failed to create reservation. Please try again.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelReservation = async () => {
    if (!reservationId()) return;
    setIsCancelling(true);

    try {
      const data = await gql<{
        cancelReservation: { id: string; status: ReservationStatus };
      }>(
        `mutation CancelReservation($id: ID!) {
          cancelReservation(id: $id) { id status }
        }`,
        { id: reservationId() },
      );
      setStatus(data.cancelReservation.status);
      reservationEvents$.next({
        id: data.cancelReservation.id,
        status: data.cancelReservation.status,
        at: new Date().toISOString(),
      });
      showToast("Reservation cancelled successfully.", "success");
    } catch {
      showToast("Network error. Please try again.", "error");
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (s: ReservationStatus | null) => {
    const styles: Record<ReservationStatus, string> = {
      REQUESTED: "bg-amber-100 text-amber-800 border-amber-200",
      APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
      CANCELLED: "bg-red-100 text-red-800 border-red-200",
      COMPLETED: "bg-slate-100 text-slate-800 border-slate-200",
    };
    return styles[s as ReservationStatus] || "bg-slate-100 text-slate-600";
  };

  return (
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold">Guest Reservation</h2>
        <p class="mt-1 text-xs text-slate-500">
          Share your contact and preferred arrival time, we will keep your table
          ready.
        </p>
      </div>
      <form
        class="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        onSubmit={submitReservation}
      >
        <div>
          <label class="block text-sm font-medium">Guest Name</label>
          <input
            class={`mt-1 w-full rounded border px-3 py-2 text-sm transition-colors ${
              formErrors().guestName
                ? "border-red-400 bg-red-50"
                : "border-slate-300 focus:border-indigo-500"
            }`}
            value={guestName()}
            onInput={(e) => {
              setGuestName(e.currentTarget.value);
              setFormErrors({ ...formErrors(), guestName: undefined });
            }}
            required
          />
          <Show when={formErrors().guestName}>
            <p class="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-red-600">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
              {formErrors().guestName}
            </p>
          </Show>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium">Phone</label>
            <input
              class={`mt-1 w-full rounded border px-3 py-2 text-sm transition-colors ${
                formErrors().phone
                  ? "border-red-400 bg-red-50"
                  : "border-slate-300 focus:border-indigo-500"
              }`}
              value={phone()}
              onInput={(e) => {
                setPhone(e.currentTarget.value);
                setFormErrors({ ...formErrors(), phone: undefined });
              }}
              required
            />
            <Show when={formErrors().phone}>
              <p class="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-red-600">
                <span class="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                {formErrors().phone}
              </p>
            </Show>
          </div>
          <div>
            <label class="block text-sm font-medium">Email</label>
            <input
              type="email"
              class={`mt-1 w-full rounded border px-3 py-2 text-sm transition-colors ${
                formErrors().email
                  ? "border-red-400 bg-red-50"
                  : "border-slate-300 focus:border-indigo-500"
              }`}
              value={email()}
              onInput={(e) => {
                setEmail(e.currentTarget.value);
                setFormErrors({ ...formErrors(), email: undefined });
              }}
              required
            />
            <Show when={formErrors().email}>
              <p class="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-red-600">
                <span class="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                {formErrors().email}
              </p>
            </Show>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium">
              Expected Arrival Time
            </label>
            <input
              type="datetime-local"
              class={`mt-1 w-full rounded border px-3 py-2 text-sm transition-colors ${
                formErrors().arrivalTime
                  ? "border-red-400 bg-red-50"
                  : "border-slate-300 focus:border-indigo-500"
              }`}
              value={arrivalTime()}
              onInput={(e) => {
                setArrivalTime(e.currentTarget.value);
                setFormErrors({ ...formErrors(), arrivalTime: undefined });
              }}
              required
            />
            <Show when={formErrors().arrivalTime}>
              <p class="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-red-600">
                <span class="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                {formErrors().arrivalTime}
              </p>
            </Show>
          </div>
          <div>
            <label class="block text-sm font-medium">Table Size</label>
            <input
              type="number"
              min="1"
              class={`mt-1 w-full rounded border px-3 py-2 text-sm transition-colors ${
                formErrors().tableSize
                  ? "border-red-400 bg-red-50"
                  : "border-slate-300 focus:border-indigo-500"
              }`}
              value={tableSize()}
              onInput={(e) => {
                const value = parseInt(e.currentTarget.value, 10);
                setTableSize(Number.isNaN(value) ? 1 : value);
                setFormErrors({ ...formErrors(), tableSize: undefined });
              }}
              required
            />
            <Show when={formErrors().tableSize}>
              <p class="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-red-600">
                <span class="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                {formErrors().tableSize}
              </p>
            </Show>
          </div>
        </div>
        <div class="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs text-slate-400">
            You will receive your reservation ID immediately after submitting.
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isSubmitting()}
              class="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-indigo-600 disabled:hover:shadow-none"
            >
              <Show when={isSubmitting()}>
                <svg class="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                    fill="none"
                  />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Submitting...
              </Show>
              <Show when={!isSubmitting()}>
                {reservationId()
                  ? "Update reservation"
                  : "Confirm reservation"}
              </Show>
            </button>
          </div>
        </div>
      </form>

      <Show when={reservationId()}>
        <div class="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div class="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-slate-800">
                  Reservation Result
                </p>
                <Show when={isSuccess()}>
                  <p class="mt-0.5 text-xs text-emerald-700">
                    Your reservation has been created successfully.
                  </p>
                </Show>
              </div>
              <Show when={isSuccess()}>
                <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Confirmed
                </span>
              </Show>
            </div>
          </div>
          <div class="px-4 py-3">
            <div class="overflow-x-auto">
              <table class="min-w-full border-collapse text-xs sm:text-sm">
                <thead>
                  <tr class="bg-slate-50 text-slate-500">
                    <th class="border-b border-slate-200 px-3 py-2 text-left font-medium">
                      Reservation ID
                    </th>
                    <th class="border-b border-slate-200 px-3 py-2 text-left font-medium">
                      Guest
                    </th>
                    <th class="border-b border-slate-200 px-3 py-2 text-left font-medium">
                      Arrival Time
                    </th>
                    <th class="border-b border-slate-200 px-3 py-2 text-left font-medium">
                      Table Size
                    </th>
                    <th class="border-b border-slate-200 px-3 py-2 text-left font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="hover:bg-slate-50">
                    <td class="border-b border-slate-100 px-3 py-2 align-middle">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="rounded-md bg-slate-900 px-2 py-1 font-mono text-[11px] text-slate-50">
                          {reservationId()}
                        </span>
                        <button
                          type="button"
                          class="inline-flex items-center rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-[10px] font-medium text-indigo-700 transition-colors hover:bg-indigo-50"
                          onClick={async () => {
                            if (!reservationId()) return;
                            try {
                              await navigator.clipboard.writeText(
                                reservationId()!,
                              );
                              showToast("Reservation ID copied", "success");
                            } catch {
                              showToast(
                                "Failed to copy. Please copy manually.",
                                "error",
                              );
                            }
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    </td>
                    <td class="border-b border-slate-100 px-3 py-2 align-middle text-slate-800">
                      {guestName()}
                    </td>
                    <td class="border-b border-slate-100 px-3 py-2 align-middle text-slate-700">
                      {arrivalTime()
                        ? new Date(arrivalTime()).toLocaleString()
                        : "-"}
                    </td>
                    <td class="border-b border-slate-100 px-3 py-2 align-middle text-slate-700">
                      {tableSize()} people
                    </td>
                    <td class="border-b border-slate-100 px-3 py-2 align-middle">
                      <span
                        class={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getStatusBadge(status())}`}
                      >
                        {status()}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Show when={status() !== "CANCELLED"}>
              <div class="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p class="text-[11px] text-slate-400">
                  If your plan changes, you can cancel this reservation below.
                </p>
                <button
                  type="button"
                  disabled={isCancelling()}
                  onClick={cancelReservation}
                  class="inline-flex w-full items-center justify-center rounded-full border border-red-200 bg-white px-4 py-1.5 text-xs font-semibold text-red-600 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  <Show when={isCancelling()}>
                    <svg
                      class="mr-2 h-3.5 w-3.5 animate-spin"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                        fill="none"
                      />
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Cancelling...
                  </Show>
                  <Show when={!isCancelling()}>Cancel Reservation</Show>
                </button>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      {/* RxJS Event Stream - Recent Activity */}
      <Show when={recentEvents().length > 0}>
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 class="text-sm font-semibold text-slate-700 mb-2">
            Recent Activity (via RxJS stream)
          </h3>
          <ul class="space-y-1">
            {recentEvents().map((evt) => (
              <li class="flex items-center gap-2 text-xs text-slate-500">
                <span class="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span class="font-mono">{evt.id.slice(-6)}</span>
                <span
                  class={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    evt.status === "CANCELLED"
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {evt.status}
                </span>
                <span class="text-slate-400">
                  {new Date(evt.at).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Show>

      {/* Toast Notifications */}
      <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts().map((toast) => (
          <div
            class={`transform rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
              toast.type === "success"
                ? "bg-emerald-500 text-white"
                : toast.type === "error"
                  ? "bg-red-500 text-white"
                  : "bg-slate-800 text-white"
            }`}
            style={{ animation: "slideIn 0.3s ease-out" }}
          >
            <div class="flex items-center gap-2">
              {toast.type === "success" && (
                <svg
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {toast.type === "error" && (
                <svg
                  class="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
              {toast.message}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GuestReservationPage;
