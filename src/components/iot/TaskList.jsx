import clsx from 'clsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../shared/components/Icon.jsx';
import { StatusPill } from '../../shared/components/ui/StatusPill.jsx';
import { FOKUS } from '../../shared/components/ui/tones.js';

function KotakTugas({ done }) {
  return (
    <span
      data-ui="task-box"
      aria-hidden="true"
      className={clsx(
        'mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded border-[1.5px]',
        done ? 'border-primary bg-primary text-on-primary' : 'border-text-2',
      )}
    >
      {done ? <Icon name="check" size={12} strokeWidth={2.5} /> : null}
    </span>
  );
}

function IsiTugas({ task }) {
  return (
    <span className="min-w-0 flex-1">
      <span className={clsx(task.done && 'text-text-2 line-through')}>{task.label}</span>
      {task.note && <small className="block text-sm leading-5 text-text-2">{task.note}</small>}
    </span>
  );
}

/**
 * Daftar tugas harian.
 *
 * Bentuk centang: tiap baris `role="checkbox"` sehingga keyboard dan pembaca
 * layar memperlakukannya sebagai kotak centang. Dengan `onToggle(index)` daftar
 * dikendalikan induk (`items` sumber kebenaran); tanpanya komponen menyimpan
 * centang sendiri, diawali dari `items`.
 *
 * Bentuk tautan: bila sebuah item punya `to` (dan opsional `state`), barisnya
 * menjadi tautan router ke aktivitas tugas itu. Kotak hanya hiasan
 * (aria-hidden) dan status ditulis sebagai keping "Selesai"/"Belum" (teks +
 * ikon), karena tugas itu tidak bisa dicentang di tempat. Dipakai bila status
 * berasal dari aktivitas yang disimpan di halaman lain (mis. misi harian).
 */
export default function TaskList({ items = [], onToggle, label }) {
  const [own, setOwn] = useState(items);
  const list = onToggle ? items : own;
  const toggle = index => {
    if (onToggle) onToggle(index);
    else setOwn(current => current.map((task, i) => (i === index ? { ...task, done: !task.done } : task)));
  };

  return (
    <ul data-ui="task-list" aria-label={label} className="m-0 list-none p-0">
      {list.map((task, index) => (
        <li
          key={task.id ?? index}
          data-ui="task"
          data-done={task.done ? 'true' : 'false'}
          className="border-t border-border first:border-t-0"
        >
          {task.to ? (
            <Link
              to={task.to}
              state={task.state}
              className={clsx('flex w-full items-start gap-2.5 rounded-sm py-2 text-left text-sm leading-5 text-text hover:bg-surface-2', FOKUS)}
            >
              <KotakTugas done={task.done} />
              <IsiTugas task={task} />
              {task.done
                ? <StatusPill tone="ok" icon="circle-check">Selesai</StatusPill>
                : <StatusPill tone="muted" icon="circle-minus">Belum</StatusPill>}
            </Link>
          ) : (
            <button
              type="button"
              role="checkbox"
              aria-checked={Boolean(task.done)}
              onClick={() => toggle(index)}
              className={clsx('flex w-full items-start gap-2.5 rounded-sm bg-transparent py-2 text-left text-sm leading-5 text-text', FOKUS)}
            >
              <KotakTugas done={task.done} />
              <IsiTugas task={task} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
