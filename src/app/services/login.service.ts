import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Asociacion } from "../models/asociacion.model";

@Injectable({ providedIn: 'root' })
export class LoginService {
  private apiUrl = 'https://apiorgullo.sheylamartinez.es';

  constructor(private http: HttpClient) {}

  login(pass: string, type: string): Observable<Asociacion[]> {
    return this.http.get<Asociacion[]>(this.apiUrl + `/login?pass=${encodeURIComponent(pass)}&type=${type}`);
  }
}
