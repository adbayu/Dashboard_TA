export default function PublicAreaLabel({ areaRef }) {
  if (typeof areaRef !== 'string' || !areaRef.trim()) return null;
  return <p className="mt-2 break-words text-sm text-on-surface-variant"><span className="font-semibold">Area:</span> {areaRef}</p>;
}
