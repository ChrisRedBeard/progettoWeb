import type { AppRole } from "@/lib/auth/roles";

declare module "@auth/core/types" {
  interface User {
    role: AppRole;
  }

  interface Session {
    user: {
      id: string;
      role: AppRole;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: AppRole;
  }
}
