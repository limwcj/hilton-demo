import { createSignal, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { login } from "../lib/authStore";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = createSignal("admin@example.com");
  const [password, setPassword] = createSignal("password");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email(), password());

    setLoading(false);
    if (result.success) {
      navigate("/employee", { replace: true });
    } else {
      setError(result.error ?? "Login failed");
    }
  };

  return (
    <div class="flex items-center justify-center min-h-[60vh]">
      <div class="w-full max-w-sm">
        <h2 class="text-lg font-semibold mb-1">Employee Login</h2>
        <p class="text-xs text-slate-500 mb-4">
          Sign in with your employee credentials to access the dashboard.
        </p>

        <form
          class="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={handleSubmit}
        >
          <Show when={error()}>
            <div class="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error()}
            </div>
          </Show>

          <div>
            <label class="block text-sm font-medium">Email</label>
            <input
              type="email"
              class="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium">Password</label>
            <input
              type="password"
              class="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading()}
            class="w-full rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading() ? "Signing in..." : "Sign in"}
          </button>

          <p class="text-[11px] text-center text-slate-400 pt-1">
            Demo account: admin@example.com / password
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
