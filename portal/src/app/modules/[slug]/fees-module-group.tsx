import { AgentLedgerPanel } from "@/components/fees/agent-ledger-panel";
import { AgentOutstandingPanel } from "@/components/fees/agent-outstanding-panel";
import { FeeCollectionDesk } from "@/components/fees/fee-collection-desk";

export function FeesModuleGroup({
  ledgerFilters
}: {
  ledgerFilters: {
    agentCode: string;
    search: string;
    session: string;
    yearLabel: string;
  };
}) {
  return (
    <>
      <FeeCollectionDesk />
      <AgentLedgerPanel initialFilters={ledgerFilters} />
      <AgentOutstandingPanel />
    </>
  );
}
