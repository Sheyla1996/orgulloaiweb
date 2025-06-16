import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Asociacion } from "../models/asociacion.model";

@Injectable({ providedIn: 'root' })
export class AsociacionesService {
  private apiUrl = 'https://apiorgullo.sheylamartinez.es/asociacion';

  constructor(private http: HttpClient) {}

  getAsociaciones(): Observable<Asociacion[]> {
    return this.http.get<Asociacion[]>(this.apiUrl);
  }
}
