import { isPlatformBrowser } from "@angular/common";
import { Inject, Injectable, PLATFORM_ID } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class MapService {

    map!: any;

    private polyline!: any;
    private linePoints!: any[];
    private markers: any[] = [];
    private leaflet: any;

    constructor(@Inject(PLATFORM_ID) private platformId: Object) {}


    async initializeMap(mapId: string, options: any): Promise<void> {
        if (isPlatformBrowser(this.platformId)) {
            if (!this.leaflet) {
                this.leaflet = await import('leaflet');
            }
            this.map = this.leaflet.map(mapId, options);
        }
    }


    async createMap(element: HTMLElement, position?: any): Promise<any> {
        if (isPlatformBrowser(this.platformId)) {
            if (!this.leaflet) {
                this.leaflet = await import('leaflet');
            }
            if (!position) {
                position = this.leaflet.latLng(40.4094783, -3.69111);
            }
            const map = this.leaflet.map(element, {
                center: position,
                zoom: 16
            });
            this.leaflet.tileLayer('/assets/map/{z}/{x}/{y}.jpg', {
                    attribution: '© OpenStreetMap',
                    maxZoom: 18,
                    minZoom: 15,
                }).addTo(map);
            return map;
        }
        return null;
    }

    async getAsocMarkers(map: any, linePoints: any[], count: number, setMap: boolean): Promise<any[]> {
        if (isPlatformBrowser(this.platformId)) {
            if (!this.leaflet) {
                this.leaflet = await import('leaflet');
            }
            const totalLength = this._calculatePolylineLength(map, linePoints);
            const interval = totalLength / (count + 1);
            const markers = [];
            for (let i = 1; i <= count; i++) {
                const position = await this._getPointAlongPolyline(map, linePoints, interval * i);
                const marker = this.leaflet.marker(position);
                if (setMap) marker.addTo(map);
                markers.push(marker);
            }
            if (setMap) this.markers = markers;
            return markers;
        }
        return [];
    }

    async getCarrMarkers(map: any, polylines: any[][], totalMarkers: number, setMap: boolean): Promise<any[]> {
        if (isPlatformBrowser(this.platformId)) {
            if (!this.leaflet) {
                this.leaflet = await import('leaflet');
            }
            
            let totalDistance = 0;
            for (const latlngs of polylines) {
                totalDistance += await this.calculateTotalDistance(latlngs);
            }
            const interval = totalDistance / (totalMarkers + 1);
            const markers = [];
            let covered = 0, markerIndex = 1;

            for (const latlngs of polylines) {
                const polyline = this.leaflet.polyline(latlngs);
                const polylineDistance = await this.calculateTotalDistance(latlngs);
                let localCovered = 0;

                while (markerIndex <= totalMarkers) {
                    const target = interval * markerIndex;
                    if (covered + polylineDistance < target) break;
                    const point = await this.getPointAtDistance(polyline, target - covered);
                    if (point) {
                        const marker = this.leaflet.marker(point);
                        if (setMap) marker.addTo(map);
                        markers.push(marker);
                    }
                    markerIndex++;
                }
                covered += polylineDistance;
            }
            return markers;
        }
        return [];
    }

    private _calculatePolylineLength(map: any, linePoints: any[]): number {
        let length = 0;
        for (let i = 0; i < linePoints.length - 1; i++) {
            length += map.distance(linePoints[i], linePoints[i + 1]);
        }
        return length;
    }

    private async _getPointAlongPolyline(map: any, linePoints: any[], distance: number): Promise<any> {
        let accumulatedDistance = 0;

        for (let i = 0; i < linePoints.length - 1; i++) {
            const start = linePoints[i];
            const end = linePoints[i + 1];
            const segmentLength = map.distance(start, end);

            if (accumulatedDistance + segmentLength >= distance) {
                const remainingDistance = distance - accumulatedDistance;
                return await this._interpolatePoint(start, end, remainingDistance / segmentLength);
            }

            accumulatedDistance += segmentLength;
        }

        return linePoints[linePoints.length - 1];
    }

    private async _interpolatePoint(start: any, end: any, t: number): Promise<any> {
        if (isPlatformBrowser(this.platformId)) {
            if (!this.leaflet) {
                this.leaflet = await import('leaflet');
            }
            const lat = start.lat + t * (end.lat - start.lat);
            const lng = start.lng + t * (end.lng - start.lng);
            return this.leaflet.latLng(lat, lng);
        }
        throw new Error('_interpolatePoint can only be called in the browser environment.');
    }


    

    private async calculateTotalDistance(latlngs: any[]): Promise<number> {
        if (isPlatformBrowser(this.platformId)) {
            if (!this.leaflet) {
                this.leaflet = await import('leaflet');
            }
            let distance = 0;
            for (let i = 0; i < latlngs.length - 1; i++) {
                distance += (latlngs[i]).distanceTo(latlngs[i + 1]);
            }
            return distance;
        }
        return 0;
    }

    private async getPointAtDistance(polyline: any, distance: number): Promise<any | null> {
        if (isPlatformBrowser(this.platformId)) {
            this.leaflet = await import('leaflet');

            let accumulatedDistance = 0;
            const latlngs = polyline.getLatLngs();

            for (let i = 0; i < latlngs.length - 1; i++) {
                const segment = latlngs[i].distanceTo(latlngs[i + 1]);
                if (accumulatedDistance + segment >= distance) {
                    const ratio = (distance - accumulatedDistance) / segment;
                    return await this.interpolate(latlngs[i], latlngs[i + 1], ratio);
                }
                accumulatedDistance += segment;
            }
            return null;
        }
    }

    private async interpolate(start: any, end: any, ratio: number): Promise<any> {
        if (isPlatformBrowser(this.platformId)) {
            if (!this.leaflet) {
                this.leaflet = await import('leaflet');
            }
            const lat = start.lat + (end.lat - start.lat) * ratio;
            const lng = start.lng + (end.lng - start.lng) * ratio;
            return this.leaflet.latLng(lat, lng);
        }
        throw new Error('interpolate can only be called in the browser environment.');
    }

    clearMapLayers(): void {
        this.map.eachLayer((layer: any) => {
            if (layer instanceof this.leaflet.Marker || layer instanceof this.leaflet.Polyline) {
                this.map.removeLayer(layer);
            }
        });
    }
}