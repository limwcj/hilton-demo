import { createResource, createSignal, Show, onCleanup } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { gql } from "../lib/graphqlClient";
import { isAuthenticated$, getAuthState, logout } from "../lib/authStore";

type ReservationStatus = "REQUESTED" | "APPROVED" | "CANCELLED" | "COMPLETED";

interface Reservation {
  id: string;
  guestName: string;
  phone: string;
  email: string;
  expectedArrivalTime: string;
  tableSize: number;
  status: ReservationStatus;
}

const StatusBadge = ({ status }: { status: ReservationStatus }) => {
  const config: Record<
    ReservationStatus,
    { bg: string; text: string; label: string; icon: string }
  > = {
    REQUESTED: {
      bg: "bg-amber-100",
      text: "text-amber-800",
      label: "Requested",
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    APPROVED: {
      bg: "bg-emerald-100",
      text: "text-emerald-800",
      label: "Approved",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    CANCELLED: {
      bg: "bg-red-100",
      text: "text-red-800",
      label: "Cancelled",
      icon: "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    COMPLETED: {
      bg: "bg-slate-100",
      text: "text-slate-800",
      label: "Completed",
      icon: "M5 13l4 4L19 7",
    },
  };

  const c = config[status];
  return (
    <span
      class={`inline-flex items-center gap-1.5 rounded-full ${c.bg} ${c.text} px-2.5 py-1 text-xs font-medium`}
    >
      <svg
        class="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d={c.icon} />
      </svg>
      {c.label}
    </span>
  );
};

const RESERVATIONS_QUERY = `
  query Reservations($status: ReservationStatus, $date: String) {
    reservations(status: $status, date: $date) {
      id guestName phone email expectedArrivalTime tableSize status
    }
  }
`;

const UPDATE_STATUS_MUTATION = `
  mutation UpdateReservationStatus($id: ID!, $status: ReservationStatus!) {
    updateReservationStatus(id: $id, status: $status) { id status }
  }
`;

const fetchReservations = async (params: {
  status?: ReservationStatus | "ALL";
  date?: string;
}) => {
  const data = await gql<{ reservations: Reservation[] }>(RESERVATIONS_QUERY, {
    status: params.status && params.status !== "ALL" ? params.status : null,
    date: params.date || null,
  });
  return data.reservations;
};

const EmployeeDashboardPage = () => {
  const navigate = useNavigate();

  const sub = isAuthenticated$.subscribe((authed) => {
    if (!authed) navigate("/login", { replace: true });
  });
  onCleanup(() => sub.unsubscribe());

  const authState = getAuthState();
  if (!authState.token) {
    navigate("/login", { replace: true });
    return null;
  }

  const [statusFilter, setStatusFilter] = createSignal<
    ReservationStatus | "ALL"
  >("ALL");
  const [dateFilter, setDateFilter] = createSignal("");
  const [updatingId, setUpdatingId] = createSignal<string | null>(null);

  const [reservations, { refetch }] = createResource(
    () => ({ status: statusFilter(), date: dateFilter() }),
    fetchReservations,
  );

  const updateStatus = async (id: string, status: ReservationStatus) => {
    setUpdatingId(id);
    await gql(UPDATE_STATUS_MUTATION, { id, status });
    await refetch();
    setUpdatingId(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Employee Dashboard</h2>
        <div class="flex items-center gap-3">
          <span class="text-xs text-slate-500">{authState.email}</span>
          <button
            type="button"
            onClick={handleLogout}
            class="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Logout
          </button>
        </div>
      </div>

      <div class="flex items-end gap-3">
        <div class="shrink-0">
          <label class="block text-sm font-medium">Status</label>
          <select
            class="mt-1 w-auto rounded border px-3 py-1.5 text-sm"
            value={statusFilter()}
            onChange={(e) =>
              setStatusFilter(
                e.currentTarget.value as ReservationStatus | "ALL",
              )
            }
          >
            <option value="ALL">All</option>
            <option value="REQUESTED">Requested</option>
            <option value="APPROVED">Approved</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
        <div class="shrink-0">
          <label class="block text-sm font-medium">Date</label>
          <input
            type="date"
            class="mt-1 w-auto rounded border px-3 py-1.5 text-sm"
            value={dateFilter()}
            onInput={(e) => setDateFilter(e.currentTarget.value)}
          />
        </div>
        <button
          type="button"
          disabled={reservations.loading}
          class="btn-refresh"
          onClick={() => refetch()}
        >
          <Show when={reservations.loading}>
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
          </Show>
          Refresh
        </button>
      </div>

      <div class="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table class="min-w-full text-sm">
          <thead class="bg-slate-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Guest
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Contact
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Arrival
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Table
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <Show when={reservations.loading}>
              <tr>
                <td class="px-4 py-8 text-center" colSpan={6}>
                  <div class="flex items-center justify-center gap-2 text-slate-500">
                    <svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24">
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
                    Loading reservations...
                  </div>
                </td>
              </tr>
            </Show>

            <Show when={reservations.error}>
              <tr>
                <td class="px-4 py-8 text-center" colSpan={6}>
                  <div class="flex flex-col items-center gap-2 text-red-500">
                    <svg
                      class="h-8 w-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span class="text-sm">
                      Failed to load reservations. Please try again.
                    </span>
                  </div>
                </td>
              </tr>
            </Show>

            <Show
              when={reservations.state === "ready" && reservations()!.length === 0}
            >
              <tr>
                <td class="px-4 py-8 text-center" colSpan={6}>
                  <div class="flex flex-col items-center gap-2 text-slate-400">
                    <svg
                      class="h-10 w-10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    <span class="text-sm">No reservations found</span>
                  </div>
                </td>
              </tr>
            </Show>

            <Show when={reservations.state === "ready"}>
              {reservations()!.map((r) => (
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="px-4 py-3">
                    <div class="font-medium text-slate-900">{r.guestName}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="text-slate-900">{r.phone}</div>
                    <div class="text-xs text-slate-500">{r.email}</div>
                  </td>
                  <td class="whitespace-nowrap px-4 py-3">
                    <div class="text-slate-700">
                      {new Date(r.expectedArrivalTime).toLocaleString(undefined, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}
                    </div>
                  </td>
                  <td class="whitespace-nowrap px-4 py-3">
                    <span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {r.tableSize} people
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td class="whitespace-nowrap px-4 py-3">
                    <div class="flex gap-2">
                      <button
                        disabled={
                          updatingId() === r.id || r.status === "APPROVED"
                        }
                        class="btn-action approve"
                        onClick={() => updateStatus(r.id, "APPROVED")}
                        title={
                          r.status === "APPROVED"
                            ? "Already approved"
                            : "Approve reservation"
                        }
                      >
                        {updatingId() === r.id ? "Saving..." : "Approve"}
                      </button>
                      <button
                        disabled={
                          updatingId() === r.id || r.status === "CANCELLED"
                        }
                        class="btn-action cancel"
                        onClick={() => updateStatus(r.id, "CANCELLED")}
                        title={
                          r.status === "CANCELLED"
                            ? "Already cancelled"
                            : "Cancel reservation"
                        }
                      >
                        Cancel
                      </button>
                      <button
                        disabled={
                          updatingId() === r.id || r.status === "COMPLETED"
                        }
                        class="btn-action complete"
                        onClick={() => updateStatus(r.id, "COMPLETED")}
                        title={
                          r.status === "COMPLETED"
                            ? "Already completed"
                            : "Mark as completed"
                        }
                      >
                        Complete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </Show>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
