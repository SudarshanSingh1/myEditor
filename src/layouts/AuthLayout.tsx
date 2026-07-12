import { Link, Outlet } from "react-router-dom";
import { Logo } from "../components/ui/Logo";

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="absolute top-4 left-4 md:top-8 md:left-8">
        <Link to="/">
          <Logo />
        </Link>
      </div>
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
