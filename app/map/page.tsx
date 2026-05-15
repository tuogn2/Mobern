"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Property } from "../components/map/types";
import { fetchProperties } from "../services/propertyService";

// Dynamic import to avoid SSR issues with Leaflet
const Map = dynamic(() => import("../components/map/Map"), {
    ssr: false,
    loading: () => (
        <div className="map-loading">
            <div className="map-loading-spinner"></div>
            <p>Đang tải bản đồ...</p>
        </div>
    ),
});

export default function MapPage() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadProperties = async () => {
            try {
                setIsLoading(true);
                const data = await fetchProperties();
                setProperties(data);
            } catch (err) {
                setError("Không thể tải danh sách bất động sản. Vui lòng thử lại sau.");
                console.error("Error fetching properties:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadProperties();
    }, []);

    const handlePropertyClick = (property: Property) => {
        console.log("Property clicked:", property);
        // Optional: Navigate to detail page
        // window.location.href = `/listings/${property.id}`;
    };

    if (error) {
        return (
            <div className="map-page">
                <div className="map-error">
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()}>Thử lại</button>
                </div>
            </div>
        );
    }

    return (
        <div className="map-page">
            <header className="map-header">
                <h1>Bản đồ Bất động sản</h1>
                <p>{properties.length} bất động sản được tìm thấy</p>
            </header>

            <div className="map-wrapper">
                {isLoading ? (
                    <div className="map-loading">
                        <div className="map-loading-spinner"></div>
                        <p>Đang tải...</p>
                    </div>
                ) : (
                    <Map
                        properties={properties}
                        onPropertyClick={handlePropertyClick}
                    />
                )}
            </div>
        </div>
    );
}
