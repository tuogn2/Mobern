"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Property, PriceTagMarkerProps } from "./types";

const createPriceTagIcon = (price: string) => {
    return L.divIcon({
        className: "price-tag-marker",
        html: `<div class="price-tag">${price}</div>`,
        iconSize: [0, 0],
        iconAnchor: [50, 40],
    });
};

export default function PriceTagMarker({
    property,
    onClick,
}: PriceTagMarkerProps) {
    const icon = createPriceTagIcon(property.priceFormatted);

    return (
        <Marker
            position={[property.coordinates.lat, property.coordinates.lng]}
            icon={icon}
            eventHandlers={{
                click: () => onClick?.(property),
            }}
        >
            <Popup className="property-popup">
                <div className="popup-content">
                    {property.thumbnail && (
                        <img
                            src={property.thumbnail}
                            alt={property.title}
                            className="popup-thumbnail"
                        />
                    )}
                    <div className="popup-info">
                        <h3 className="popup-title">{property.title}</h3>
                        <p className="popup-address">{property.address}</p>
                        <div className="popup-details">
                            {property.bedrooms && <span>{property.bedrooms} PN</span>}
                            {property.bathrooms && <span>{property.bathrooms} WC</span>}
                            {property.area && <span>{property.area}m²</span>}
                        </div>
                        <p className="popup-price">{property.priceFormatted}</p>
                    </div>
                </div>
            </Popup>
        </Marker>
    );
}
