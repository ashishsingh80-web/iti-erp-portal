import { mergeAddressHierarchies, type StateMap } from "@/lib/address-masters";

type CsvRow = Record<string, string>;

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]).map((item) => item.replace(/^"|"$/g, "").trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line).map((item) => item.replace(/^"|"$/g, "").trim());
    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = values[index] || "";
      return row;
    }, {});
  });
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getValue(row: CsvRow, candidates: string[]) {
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    const matched = entries.find(([key]) => normalizeKey(key) === normalizeKey(candidate));
    if (matched && matched[1]?.trim()) {
      return matched[1].trim();
    }
  }
  return "";
}

function ensureDistrictNode(hierarchy: StateMap, stateName: string, districtName: string) {
  if (!hierarchy[stateName]) hierarchy[stateName] = { districts: {} };
  if (!hierarchy[stateName].districts) hierarchy[stateName].districts = {};
  if (!hierarchy[stateName].districts?.[districtName]) {
    hierarchy[stateName].districts![districtName] = { tehsils: {} };
  }
}

export function buildHierarchyFromLgdFiles(districtFileText: string, subDistrictFileText: string) {
  const districtRows = parseCsv(districtFileText);
  const subDistrictRows = parseCsv(subDistrictFileText);
  const imported: StateMap = {};

  for (const row of districtRows) {
    const stateName = getValue(row, [
      "stateNameEnglish",
      "stateName",
      "stateNameLocal",
      "state_name_english",
      "state"
    ]);
    const districtName = getValue(row, [
      "districtNameEnglish",
      "districtName",
      "districtNameLocal",
      "district_name_english",
      "district"
    ]);

    if (!stateName || !districtName) continue;
    ensureDistrictNode(imported, stateName, districtName);
  }

  for (const row of subDistrictRows) {
    const stateName = getValue(row, [
      "stateNameEnglish",
      "stateName",
      "stateNameLocal",
      "state_name_english",
      "state"
    ]);
    const districtName = getValue(row, [
      "districtNameEnglish",
      "districtName",
      "districtNameLocal",
      "district_name_english",
      "district"
    ]);
    const tehsilName = getValue(row, [
      "subDistrictNameEnglish",
      "subdistrictNameEnglish",
      "subDistrictName",
      "subdistrictName",
      "sub_district_name_english",
      "tehsilName",
      "tehsil"
    ]);

    if (!stateName || !districtName || !tehsilName) continue;
    ensureDistrictNode(imported, stateName, districtName);
    const tehsils = imported[stateName].districts![districtName].tehsils || {};
    if (!tehsils[tehsilName]) {
      tehsils[tehsilName] = { blocks: {} };
    }
    imported[stateName].districts![districtName].tehsils = tehsils;
  }

  return imported;
}

export function mergeImportedHierarchy(existing: StateMap, imported: StateMap) {
  return mergeAddressHierarchies(existing, imported);
}
