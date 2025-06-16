import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Telefono } from "../models/telefono.model";

@Injectable({ providedIn: 'root' })
export class TelefonosService {
  private apiUrl = 'https://apiorgullo.sheylamartinez.es/telefono';

  constructor(private http: HttpClient) {}

  getTelefonos(): Observable<Telefono[]> {
    return this.http.get<Telefono[]>(this.apiUrl);
  }
}
