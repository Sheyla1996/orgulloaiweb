import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Telefono } from "../models/telefono.model";

@Injectable({ providedIn: 'root' })
export class TelefonosService {
  userType = localStorage.getItem('userType') || 'normal';
  private apiUrl = 'https://apiorgullo.sheylamartinez.es/' + (['test', 'test_coor'].includes(this.userType) ? 'test/' : '') + 'telefono';

  constructor(private http: HttpClient) {}

  getTelefonos(): Observable<Telefono[]> {
    return this.http.get<Telefono[]>(this.apiUrl);
  }

  getTelefonosFromSheet(): Observable<Telefono[]> {
    return this.http.get<Telefono[]>(`${this.apiUrl}/from-sheet`);
  }
}
