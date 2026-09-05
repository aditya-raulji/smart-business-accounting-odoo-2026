// Root page for Urban Furniture Accounting System.
// What: Redirects incoming root traffic directly to /dashboard.
// Why: The application root is a business management tool; there is no separate marketing landing page.
//      The middleware intercepts unauthenticated users and forwards them to /login with callbackUrl.
// Why not: Rendering a static splash page introduces unnecessary navigation friction for daily accounting users.
// Used by: Any direct navigation to "/".

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard");
}
