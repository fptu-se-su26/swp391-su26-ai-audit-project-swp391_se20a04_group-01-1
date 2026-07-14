/**
 * Decodes a Mapbox/Google polyline string into an array of [longitude, latitude] coordinates.
 * @param str The encoded polyline string
 * @param precision Coordinate precision (default 5 decimal places)
 */
export function decodePolyline(str: string, precision = 5): [number, number][] {
    let index = 0;
    let lat = 0;
    let lng = 0;
    const coordinates: [number, number][] = [];
    const factor = Math.pow(10, precision);

    while (index < str.length) {
        let byte;
        let shift = 0;
        let result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        const changeLat = (result & 1) ? ~(result >> 1) : (result >> 1);
        lat += changeLat;

        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        const changeLng = (result & 1) ? ~(result >> 1) : (result >> 1);
        lng += changeLng;

        coordinates.push([lng / factor, lat / factor]);
    }

    return coordinates;
}
