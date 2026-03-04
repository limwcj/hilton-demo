import { render } from "solid-js/web";
import { Router, Route, A } from "@solidjs/router";
import { createSignal, onCleanup, type ParentProps } from "solid-js";

import GuestReservationPage from "./pages/GuestReservationPage";
import EmployeeDashboardPage from "./pages/EmployeeDashboardPage";
import LoginPage from "./pages/LoginPage";
import { isAuthenticated$ } from "./lib/authStore";
import "./index.css";

const Root = (props: ParentProps) => {
  const [isAuthed, setIsAuthed] = createSignal(false);

  const sub = isAuthenticated$.subscribe(setIsAuthed);
  onCleanup(() => sub.unsubscribe());

  return (
    <div class="min-h-screen bg-slate-50 text-slate-900">
      <header class="bg-indigo-700 text-white px-6 py-4 flex items-center justify-between shadow">
        <h1 class="text-xl font-semibold">Hilton Restaurant Reservations</h1>
        <nav class="space-x-4 text-sm">
          <A href="/" class="hover:underline">
            Guest
          </A>
          {isAuthed() ? (
            <A href="/employee" class="hover:underline">
              Dashboard
            </A>
          ) : (
            <A href="/login" class="hover:underline">
              Employee Login
            </A>
          )}
        </nav>
      </header>
      <main class="max-w-4xl mx-auto px-4 py-6">{props.children}</main>
    </div>
  );
};

render(
  () => (
    <Router root={Root}>
      <Route path="/" component={GuestReservationPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/employee" component={EmployeeDashboardPage} />
    </Router>
  ),
  document.getElementById("root") as HTMLElement,
);
