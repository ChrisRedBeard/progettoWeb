import { IntegrationError } from "@/lib/integrations/errors";
import type { IntegrationBundle } from "@/lib/integrations/types";

export function createRealIntegrations(): IntegrationBundle {
  throw new IntegrationError(
    "NOT_IMPLEMENTED",
    "Le integrazioni reali non sono collegate. Usa NEXT_PUBLIC_INTEGRATIONS=mock.",
  );
}
