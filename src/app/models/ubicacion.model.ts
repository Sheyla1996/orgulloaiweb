export interface Ubicacion {
  id: number;
  clientId: string;
  uuid: string;
  displayName?: string | null;
  zona: string;
  userType: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  source?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
