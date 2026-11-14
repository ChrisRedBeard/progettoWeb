"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RevokeInviteButton({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      className="min-h-11 rounded-xl border border-line px-3 text-sm font-bold"
      onClick={() => {
        setPending(true);
        void fetch(`/api/invites/${inviteId}/revoke`, { method: "POST" }).then(() => {
          setPending(false);
          router.refresh();
        });
      }}
    >
      Revoca
    </button>
  );
}
