import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Carroza } from '../models/carroza.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CarrozasService {
  private apiUrl = 'https://apiorgullo.sheylamartinez.es/carroza';

  constructor(private http: HttpClient) {}

  getCarrozas(): Observable<Carroza[]> {
    return this.http.get<Carroza[]>(this.apiUrl);
  }

  getCarrozasFromSheet(): Observable<Carroza[]> {
    return this.http.get<Carroza[]>(`${this.apiUrl}/from-sheet`);
  }

  updatePosition(carrozas: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/posicion`, carrozas);
  }

  updateState(id:number, carroza: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}/estado`, carroza);
  }
}
