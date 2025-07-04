export interface Carroza {
    id: number;
  name: string;
  logo: string;
  position: number;
  lat: number; // o convertir a number si lo prefieres
  lng: number;
  zona: string;
  type?: string;
  sheet_row: number;
  status?: string;
  size?: string;
}
  