import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type ShopLocation = {
  latitude: number;
  longitude: number;
};

const GHANA_CENTER: ShopLocation = { latitude: 7.9465, longitude: -1.0232 };

function LocationClickHandler({
  onSelect,
}: {
  onSelect: (location: ShopLocation) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: Number(event.latlng.lat.toFixed(7)),
        longitude: Number(event.latlng.lng.toFixed(7)),
      });
    },
  });
  return null;
}

export default function ShopLocationPicker({
  location,
  onSelect,
}: {
  location: ShopLocation | null;
  onSelect: (location: ShopLocation) => void;
}) {
  const center = location ?? GHANA_CENTER;

  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={location ? 15 : 6}
      scrollWheelZoom
      className="shop-location-map"
      aria-label="Select shop location"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationClickHandler onSelect={onSelect} />
      {location ? (
        <CircleMarker
          center={[location.latitude, location.longitude]}
          radius={10}
          pathOptions={{
            color: "#fff",
            fillColor: "#287a54",
            fillOpacity: 1,
            weight: 3,
          }}
        />
      ) : null}
    </MapContainer>
  );
}
