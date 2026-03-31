import { StageBoard } from "@/components/modules/stage-board";
import { getDashboardStageBoards } from "@/lib/services/module-stage-service";

export async function DashboardOperations() {
  const boards = await getDashboardStageBoards();

  return (
    <div className="grid gap-6">
      {boards.map((board) => (
        <StageBoard key={board.title} board={board} />
      ))}
    </div>
  );
}
