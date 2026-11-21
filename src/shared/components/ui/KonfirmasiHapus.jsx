import { Button } from './Button.jsx';
import { Modal } from './Modal.jsx';

// Dialog konfirmasi untuk aksi hapus yang tidak bisa dibatalkan. Terbuka selama
// `target` terisi (objek yang akan dihapus), jadi halaman cukup menyimpan satu
// state `hapus` lalu mengosongkannya saat Batal atau setelah menghapus.
export function KonfirmasiHapus({ target, title, confirmLabel = 'Hapus', onCancel, onConfirm, children }) {
  return (
    <Modal open={!!target} onClose={onCancel} title={title}>
      {target && (
        <div className="space-y-4">
          <p className="text-text-2">{children}</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onCancel}>Batal</Button>
            <Button variant="danger" icon="trash-2" onClick={onConfirm}>{confirmLabel}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
