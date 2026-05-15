import { Property } from "../components/map/types";

// Mock data for development - Replace with actual API calls
const mockProperties: Property[] = [
    {
        id: "1",
        title: "Căn hộ cao cấp Vinhomes Central Park",
        address: "208 Nguyễn Hữu Cảnh, Bình Thạnh",
        price: 2195235000,
        priceFormatted: "₫2.195.235",
        coordinates: { lat: 10.7942, lng: 106.7214 },
        thumbnail: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=300&h=200&fit=crop",
        bedrooms: 2,
        bathrooms: 2,
        area: 75,
    },
    {
        id: "2",
        title: "Nhà phố Thảo Điền",
        address: "Thảo Điền, Quận 2, TP.HCM",
        price: 3500000000,
        priceFormatted: "₫3.500.000",
        coordinates: { lat: 10.8024, lng: 106.7394 },
        thumbnail: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300&h=200&fit=crop",
        bedrooms: 3,
        bathrooms: 3,
        area: 120,
    },
    {
        id: "3",
        title: "Chung cư The Manor",
        address: "91 Nguyễn Hữu Cảnh, Bình Thạnh",
        price: 1850000000,
        priceFormatted: "₫1.850.000",
        coordinates: { lat: 10.7891, lng: 106.7134 },
        thumbnail: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300&h=200&fit=crop",
        bedrooms: 2,
        bathrooms: 1,
        area: 65,
    },
    {
        id: "4",
        title: "Căn hộ Masteri Thảo Điền",
        address: "159 Xa Lộ Hà Nội, Quận 2",
        price: 2750000000,
        priceFormatted: "₫2.750.000",
        coordinates: { lat: 10.8067, lng: 106.7452 },
        thumbnail: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=300&h=200&fit=crop",
        bedrooms: 2,
        bathrooms: 2,
        area: 80,
    },
    {
        id: "5",
        title: "Biệt thự Phú Mỹ Hưng",
        address: "Phú Mỹ Hưng, Quận 7",
        price: 8500000000,
        priceFormatted: "₫8.500.000",
        coordinates: { lat: 10.7285, lng: 106.7018 },
        thumbnail: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&h=200&fit=crop",
        bedrooms: 5,
        bathrooms: 4,
        area: 350,
    },
    {
        id: "6",
        title: "Căn hộ Sunrise City",
        address: "Nguyễn Hữu Thọ, Quận 7",
        price: 2100000000,
        priceFormatted: "₫2.100.000",
        coordinates: { lat: 10.7365, lng: 106.7098 },
        thumbnail: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=300&h=200&fit=crop",
        bedrooms: 2,
        bathrooms: 2,
        area: 70,
    },
];

export async function fetchProperties(): Promise<Property[]> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // TODO: Replace with actual API call
    // const response = await fetch('/api/properties');
    // const data = await response.json();
    // return data;

    return mockProperties;
}

export function formatPrice(price: number): string {
    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(price);
}
