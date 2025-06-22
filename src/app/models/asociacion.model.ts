export interface Asociacion {
  id: number;
  name: string;
  lema: string;
  logo: string;
  isBatucada: boolean;
  position: number;
  lat: number; // convertiremos a number en runtime
  lng: number;
  zona: string;
  type?: string;
  sheet_row: number;
}
