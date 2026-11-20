import { isValidElement } from 'react';
import { Icon } from '../Icon.jsx';

// Prop `icon` di komponen bersama boleh berupa nama lucide (lihat ICON_MAP)
// atau elemen React yang sudah jadi. Nama yang diminta
// dicatat di `data-icon` supaya ikon yang tampil bisa diperiksa (tes, devtools).
export function IkonSlot({ icon, size = 18, className }) {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  return <Icon name={icon} size={size} className={className} data-icon={icon} />;
}
