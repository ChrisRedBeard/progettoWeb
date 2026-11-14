import { notFound } from "next/navigation";
import { IntegrationDebugPanel } from "@/components/integration-debug-panel";

export default function IntegrationDebugPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <IntegrationDebugPanel />;
}
