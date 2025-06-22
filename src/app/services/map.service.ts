import { Injectable } from "@angular/core";
import * as L from 'leaflet';

@Injectable({
    providedIn: 'root'
})
export class MapService {

    map!: L.Map;

    private polyline!: L.Polyline;
    private linePoints!: L.LatLng[];
    private markers: L.Marker[] = [];

    initializeMap(mapId: string, options: L.MapOptions): void {
        this.map = L.map(mapId, options);
    }


    createMap(element: HTMLElement, position = new L.LatLng(40.4094783, -3.69111)): L.Map {
        const map = L.map(element, {
            center: position,
            zoom: 16
        });
        L.tileLayer('/assets/map/{z}/{x}/{y}.jpg', {
                attribution: '© OpenStreetMap',
                maxZoom: 18,
                minZoom: 15,
            }).addTo(map);
        return map;
    }

    getAsocMarkers(map: L.Map, linePoints: L.LatLng[], count: number, setMap: boolean = true): L.Marker[] {
        const totalLength = this._calculatePolylineLength(map, linePoints);
        const interval = totalLength / (count + 1);
        const markers: L.Marker[] = [];
        for (let i = 1; i <= count; i++) {
            const position = this._getPointAlongPolyline(map, linePoints, interval * i);
            const marker = L.marker(position);
            if (setMap) marker.addTo(map);
            markers.push(marker);
        }
        if (setMap) this.markers = markers;
        return markers;
    }

    getCarrMarkers(map: L.Map, polylines: L.LatLngExpression[][], totalMarkers: number, setMap: boolean = true): L.Marker[] {
        const totalDistance = polylines.reduce((sum, latlngs) => sum + this.calculateTotalDistance(latlngs), 0);
        const interval = totalDistance / (totalMarkers + 1);
        const markers: L.Marker[] = [];
        let covered = 0, markerIndex = 1;

        for (const latlngs of polylines) {
            const polyline = L.polyline(latlngs);
            const polylineDistance = this.calculateTotalDistance(latlngs);
            let localCovered = 0;

            while (markerIndex <= totalMarkers) {
                const target = interval * markerIndex;
                if (covered + polylineDistance < target) break;
                const point = this.getPointAtDistance(polyline, target - covered);
                if (point) {
                    const marker = L.marker(point);
                    if (setMap) marker.addTo(map);
                    markers.push(marker);
                }
                markerIndex++;
            }
            covered += polylineDistance;
        }
        return markers;
    }

    private _calculatePolylineLength(map: L.Map, linePoints: L.LatLng[]): number {
        let length = 0;
        for (let i = 0; i < linePoints.length - 1; i++) {
            length += map.distance(linePoints[i], linePoints[i + 1]);
        }
        return length;
    }

    private _getPointAlongPolyline(map: L.Map, linePoints: L.LatLng[], distance: number): L.LatLng {
        let accumulatedDistance = 0;

        for (let i = 0; i < linePoints.length - 1; i++) {
            const start = linePoints[i];
            const end = linePoints[i + 1];
            const segmentLength = map.distance(start, end);

            if (accumulatedDistance + segmentLength >= distance) {
                const remainingDistance = distance - accumulatedDistance;
                return this._interpolatePoint(start, end, remainingDistance / segmentLength);
            }

            accumulatedDistance += segmentLength;
        }

        return linePoints[linePoints.length - 1];
    }

    private _interpolatePoint(start: L.LatLng, end: L.LatLng, t: number): L.LatLng {
        const lat = start.lat + t * (end.lat - start.lat);
        const lng = start.lng + t * (end.lng - start.lng);
        return L.latLng(lat, lng);
    }


    

    private calculateTotalDistance(latlngs: L.LatLngExpression[]): number {
        let distance = 0;
        for (let i = 0; i < latlngs.length - 1; i++) {
            distance += (latlngs[i] as L.LatLng).distanceTo(latlngs[i + 1] as L.LatLng);
        }
        return distance;
    }

    private getPointAtDistance(polyline: L.Polyline, distance: number): L.LatLng | null {
        let accumulatedDistance = 0;
        const latlngs = polyline.getLatLngs() as L.LatLng[];

        for (let i = 0; i < latlngs.length - 1; i++) {
            const segment = latlngs[i].distanceTo(latlngs[i + 1]);
            if (accumulatedDistance + segment >= distance) {
                const ratio = (distance - accumulatedDistance) / segment;
                return this.interpolate(latlngs[i], latlngs[i + 1], ratio);
            }
            accumulatedDistance += segment;
        }
        return null;
    }

    private interpolate(start: L.LatLng, end: L.LatLng, ratio: number): L.LatLng {
        const lat = start.lat + (end.lat - start.lat) * ratio;
        const lng = start.lng + (end.lng - start.lng) * ratio;
        return L.latLng(lat, lng);
    }

    clearMapLayers(): void {
        this.map.eachLayer((layer: any) => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
                this.map.removeLayer(layer);
            }
        });
    }
}