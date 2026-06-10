import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getCells, getDistricts, getProvinces, getSectors, getVillages } from "@/lib/locations";

export type LocationValue = {
  province?: string;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
};

export type LocationLevel = "province" | "district" | "sector" | "cell" | "village";

export function LocationPicker({
  value,
  onChange,
  maxLevel = "village",
}: {
  value?: LocationValue;
  onChange?: (v: LocationValue) => void;
  maxLevel?: LocationLevel;
}) {
  // Fully controlled — use value prop directly, no internal state copy.
  // `key` on the parent element should change when resetting to force remount.
  const local: LocationValue = value ?? {};

  const provinces = useMemo(() => getProvinces(), []);
  const districts = useMemo(() => getDistricts(local.province), [local.province]);
  const sectors = useMemo(() => getSectors(local.province, local.district), [local.province, local.district]);
  const cells = useMemo(() => getCells(local.province, local.district, local.sector), [local.province, local.district, local.sector]);
  const villages = useMemo(() => getVillages(local.province, local.district, local.sector, local.cell), [local.province, local.district, local.sector, local.cell]);

  const update = (patch: LocationValue) => {
    const next = { ...local, ...patch };
    onChange?.(next);
  };

  const field = (
    label: string,
    placeholder: string,
    options: string[],
    val: string | undefined,
    onPick: (v: string) => void,
    disabled: boolean,
  ) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Select value={val ?? ""} onValueChange={onPick} disabled={disabled || options.length === 0}>
        <SelectTrigger className="bg-card"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  const order: LocationLevel[] = ["province", "district", "sector", "cell", "village"];
  const maxIdx = order.indexOf(maxLevel);
  const show = (lvl: LocationLevel) => order.indexOf(lvl) <= maxIdx;
  const colsClass = ["md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3", "md:grid-cols-4", "md:grid-cols-5"][maxIdx];

  return (
    <div className={`grid gap-3 ${colsClass}`}>
      {show("province") && field("Province", "Select province", provinces, local.province, (v) => update({ province: v, district: undefined, sector: undefined, cell: undefined, village: undefined }), false)}
      {show("district") && field("District", "Select district", districts, local.district, (v) => update({ district: v, sector: undefined, cell: undefined, village: undefined }), !local.province)}
      {show("sector") && field("Sector", "Select sector", sectors, local.sector, (v) => update({ sector: v, cell: undefined, village: undefined }), !local.district)}
      {show("cell") && field("Cell", "Select cell", cells, local.cell, (v) => update({ cell: v, village: undefined }), !local.sector)}
      {show("village") && field("Village", "Select village", villages, local.village, (v) => update({ village: v }), !local.cell)}
    </div>
  );
}