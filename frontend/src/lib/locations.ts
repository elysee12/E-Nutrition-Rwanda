import data from "@/assets/rwanda_locations.json";

type Cell = { name: string; villages: string[] };
type Sector = { name: string; cells: Cell[] };
type District = { name: string; sectors: Sector[] };
type Province = { name: string; districts: District[] };

const provinces: Province[] = (data as any).items.map((p: any) => ({
  name: p.name,
  districts: (p.districts ?? []).map((d: any) => ({
    name: d.name,
    sectors: (d.sectors ?? []).map((s: any) => ({
      name: s.name,
      cells: (s.cells ?? []).map((c: any) => ({
        name: c.name,
        villages: c.villages ?? [],
      })),
    })),
  })),
}));

export function getProvinces() {
  return provinces.map((p) => p.name);
}
export function getDistricts(province?: string) {
  return provinces.find((p) => p.name === province)?.districts.map((d) => d.name) ?? [];
}
export function getSectors(province?: string, district?: string) {
  return (
    provinces
      .find((p) => p.name === province)
      ?.districts.find((d) => d.name === district)
      ?.sectors.map((s) => s.name) ?? []
  );
}
export function getCells(province?: string, district?: string, sector?: string) {
  return (
    provinces
      .find((p) => p.name === province)
      ?.districts.find((d) => d.name === district)
      ?.sectors.find((s) => s.name === sector)
      ?.cells.map((c) => c.name) ?? []
  );
}
export function getVillages(
  province?: string,
  district?: string,
  sector?: string,
  cell?: string,
) {
  return (
    provinces
      .find((p) => p.name === province)
      ?.districts.find((d) => d.name === district)
      ?.sectors.find((s) => s.name === sector)
      ?.cells.find((c) => c.name === cell)
      ?.villages ?? []
  );
}