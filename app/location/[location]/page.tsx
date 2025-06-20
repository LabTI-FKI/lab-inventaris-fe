import LocationClient from "./LocationClient"

export default function LocationPage({ params }: { params: { location: string } }) {
  const decodedLocation = decodeURIComponent(params.location);
  return <LocationClient decodedLocation={decodedLocation} />;
}
