import LocationClient from "./LocationClient";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function LocationPage({ params }: any) {
  const decodedLocation = decodeURIComponent(params.location);
  return <LocationClient decodedLocation={decodedLocation} />;
}
