// (auth) layout — minimal full-screen layout for login and signup pages.
// What: Wraps the login/signup pages in a centered full-screen container with the cream
//       background. No sidebar — auth pages are outside the dashboard shell.
// Why: Auth pages need a different visual treatment (full-screen, centred card) vs the
//      dashboard (sidebar + content area). Route groups let us have two separate layouts
//      in the App Router without URL path changes.
// Why not: Using a single root layout with conditional sidebar rendering would require reading
//          session state in the root layout — adds complexity and potential flickering.
// Used by: /login, /signup pages.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#F7F3EA" }}
    >
      {children}
    </div>
  );
}
