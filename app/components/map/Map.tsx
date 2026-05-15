"use client";

import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import PriceTagMarker from "./PriceTagMarker";
import { MapProps, Property } from "./types";

// Default center: Ho Chi Minh City, Vietnam
const DEFAULT_CENTER: [number, number] = [10.8231, 106.6297];
const DEFAULT_ZOOM = 13;

export default function Map({
    properties,
    center = DEFAULT_CENTER,
    zoom = DEFAULT_ZOOM,
    onPropertyClick,
}: MapProps) {
    const handlePropertyClick = (property: Property) => {
        if (onPropertyClick) {
            onPropertyClick(property);
        }
    };

    return (
        <MapContainer
            center={center}
            zoom={zoom}
            className="map-container"
            scrollWheelZoom={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {properties.map((property) => (
                <PriceTagMarker
                    key={property.id}
                    property={property}
                    onClick={handlePropertyClick}
                />
            ))}
        </MapContainer>
    );
}
