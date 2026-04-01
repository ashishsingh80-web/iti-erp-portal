import Link from "next/link";
import { StageBoard } from "@/components/modules/stage-board";
import { getDashboardStageBoards } from "@/lib/services/module-stage-service";

export async function DashboardOperations({ maxBoards }: { maxBoards?: number } = {}) {
  const boards = await getDashboardStageBoards();
  const visibleBoards = typeof maxBoards === "number" && maxBoards > 0 ? boards.slice(0, maxBoards) : boards;
  const isTrimmed = visibleBoards.length < boards.length;

  return (
    <div className="grid gap-6">
      {visibleBoards.map((board) => (
        <StageBoard key={board.title} board={board} />
      ))}
      {isTrimmed ? (
        <section className="surface flex items-center justify-between gap-3 px-6 py-5">
          <div>
            <p className="eyebrow-compact">More Module Boards</p>
            <p className="mt-1 text-sm text-slate-600">Open the full dashboard module to load all live operational boards.</p>
          </div>
          <Link className="chip-success" href="/modules/dashboard">
            Open Full Dashboard
          </Link>
        </section>
      ) : null}
    </div>
  );
}
