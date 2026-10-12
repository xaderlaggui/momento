import { useNavigate } from "react-router-dom";
import HostSignIn from "@/components/HostSignIn";

/**
 * Standalone host door (`/auth`). The landing page embeds the same component
 * inline; this route exists for direct links and the sign-in-failed fallback.
 */
export default function Auth() {
  const navigate = useNavigate();
  return (
    <main className="screen landing-screen">
      <HostSignIn onExit={() => navigate("/")} />
    </main>
  );
}
