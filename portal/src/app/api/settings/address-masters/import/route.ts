import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { buildHierarchyFromLgdFiles, mergeImportedHierarchy } from "@/lib/address-import";
import { getMergedAddressMasterData, readAddressMasterConfig, saveAddressMasterConfig } from "@/lib/address-master-store";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ ok: false, message: "Access denied for address master import" }, { status: 403 });
    }

    const formData = await request.formData();
    const districtsFile = formData.get("districtsFile");
    const subDistrictsFile = formData.get("subDistrictsFile");

    if (!(districtsFile instanceof File) || !(subDistrictsFile instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "Both LGD district and sub-district files are required" },
        { status: 400 }
      );
    }

    const [districtText, subDistrictText] = await Promise.all([districtsFile.text(), subDistrictsFile.text()]);
    const imported = buildHierarchyFromLgdFiles(districtText, subDistrictText);
    const current = await readAddressMasterConfig();
    const hierarchy = mergeImportedHierarchy(current.hierarchy, imported);
    const config = await saveAddressMasterConfig(hierarchy);
    const merged = await getMergedAddressMasterData();

    return NextResponse.json({
      ok: true,
      config,
      merged
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to import LGD files"
      },
      { status: 400 }
    );
  }
}
