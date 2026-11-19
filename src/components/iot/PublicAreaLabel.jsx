export default function PublicAreaLabel({ areaRef }) {
  if (typeof areaRef !== 'string' || !areaRef.trim()) return null;
  return <p className="mt-2 break-words text-sm text-text-2"><span className="font-semibold">Area:</span> {areaRef}</p>;
}
