import clsx from 'clsx';
import { useState } from 'react';
import { Icon } from '../../shared/components/Icon.jsx';
import { FOKUS } from '../../shared/components/ui/tones.js';

/**
 * Daftar tugas harian dengan centang selesai/belum.
 * Dengan `onToggle(index)` daftar dikendalikan induk (`items` adalah sumber
 * kebenaran); tanpanya komponen menyimpan centang sendiri, diawali dari `items`.
 * Tiap baris adalah `role="checkbox"` sehingga keyboard dan pembaca layar
 * memperlakukannya sebagai kotak centang.
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
          <button
            type="button"
            role="checkbox"
            aria-checked={Boolean(task.done)}
            onClick={() => toggle(index)}
            className={clsx('flex w-full items-start gap-2.5 rounded-sm bg-transparent py-2 text-left text-sm leading-5 text-text', FOKUS)}
          >
            <span
              data-ui="task-box"
              className={clsx(
                'mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded border-[1.5px]',
                task.done ? 'border-primary bg-primary text-on-primary' : 'border-text-2',
              )}
            >
              {task.done ? <Icon name="check" size={12} strokeWidth={2.5} /> : null}
            </span>
            <span className="min-w-0">
              <span className={clsx(task.done && 'text-text-2 line-through')}>{task.label}</span>
              {task.note && <small className="block text-sm leading-5 text-text-2">{task.note}</small>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
