export interface Property {
  id: string;
  title: string;
  address: string;
  price: number;
  priceFormatted: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  thumbnail?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
}

export interface MapProps {
  properties: Property[];
  center?: [number, number];
  zoom?: number;
  onPropertyClick?: (property: Property) => void;
}

export interface PriceTagMarkerProps {
  property: Property;
  onClick?: (property: Property) => void;
}
