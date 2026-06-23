import { useState, useEffect } from 'react';

export function useFloodZones() {
    const [floodZones, setFloodZones] = useState<any[]>([]);
    const [confirmedFloodZoneIds, setConfirmedFloodZoneIds] = useState<string[]>([]);

    const fetchFloodZones = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/flood-zones`);
            const result = await response.json();

            if (result.success && Array.isArray(result.data)) {
                setFloodZones(result.data);
            }
        } catch (error) {
            console.error("Lỗi tải vùng ngập lụt từ database:", error);
        }
    };

    useEffect(() => {
        fetchFloodZones();
    }, []);

    return {
        floodZones,
        setFloodZones,
        confirmedFloodZoneIds,
        setConfirmedFloodZoneIds,
        fetchFloodZones
    };
}
