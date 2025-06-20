import LocationClient from "./LocationClient"

export default function LocationPage({ params }: any) {
  const decodedLocation = decodeURIComponent(params.location);
  return <LocationClient decodedLocation={decodedLocation} />;
}
