import { AgentLedgerPanel } from "@/components/fees/agent-ledger-panel";
import { AgentOutstandingPanel } from "@/components/fees/agent-outstanding-panel";
import { FeeCollectionDesk } from "@/components/fees/fee-collection-desk";
import { FeesModuleTabs, type FeesModuleTabId } from "@/components/fees/fees-module-tabs";
import { readAppLanguage } from "@/lib/i18n-server";

const VALID_TABS = new Set<FeesModuleTabId>(["collect", "ledger", "outstanding"]);

export async function FeesModuleGroup({
  tab,
  ledgerFilters
}: {
  tab: string;
  ledgerFilters: {
    agentCode: string;
    search: string;
    session: string;
    yearLabel: string;
  };
}) {
  const lang = await readAppLanguage();
  const active: FeesModuleTabId = VALID_TABS.has(tab as FeesModuleTabId) ? (tab as FeesModuleTabId) : "collect";

  return (
    <div className="grid gap-4">
      <FeesModuleTabs lang={lang} active={active} />
      {active === "collect" ? <FeeCollectionDesk /> : null}
      {active === "ledger" ? <AgentLedgerPanel initialFilters={ledgerFilters} /> : null}
      {active === "outstanding" ? <AgentOutstandingPanel /> : null}
    </div>
  );
}
