/**
 * Encodes an array of [longitude, latitude] coordinates into a polyline string.
 * @param {Array<[number, number]>} coordinates
 * @param {number} precision (default 5)
 * @returns {string}
 */
function encodePolyline(coordinates, precision = 5) {
    const factor = Math.pow(10, precision);
    let result = [];
    let prevLat = 0;
    let prevLng = 0;

    function encodeValue(val) {
        let value = val < 0 ? ~(val << 1) : (val << 1);
        while (value >= 0x20) {
            const chunk = (value & 0x1f) | 0x20;
            result.push(String.fromCharCode(chunk + 63));
            value >>= 5;
        }
        result.push(String.fromCharCode(value + 63));
    }

    for (const [lng, lat] of coordinates) {
        const latVal = Math.round(lat * factor);
        const lngVal = Math.round(lng * factor);
        
        encodeValue(latVal - prevLat);
        encodeValue(lngVal - prevLng);
        
        prevLat = latVal;
        prevLng = lngVal;
    }

    return result.join('');
}

module.exports = {
    encodePolyline
};
