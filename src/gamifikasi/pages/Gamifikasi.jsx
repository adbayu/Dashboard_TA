import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmart } from '../../shared/store/SmartStore';
import { missionActivityDestination } from '../model/missionNavigation.js';
import { Bar, Button, Card, EmptyState, Modal, PageHeader, StatusPill, Table } from '../../shared/components/ui';
import { IkonSlot } from '../../shared/components/ui/IkonSlot.jsx';
import { FOKUS } from '../../shared/components/ui/tones.js';

const angka = (value) => Number(value || 0).toLocaleString('id-ID');
// Dua kartu sejajar yang turun menjadi satu kolom di layar sempit (artboard misi-poin).
const KISI_DUA = 'grid items-start gap-6 grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))]';

// Status badge selalu teks + ikon.
function statusBadge(badge, points) {
  if (badge.claimed) return { tone: 'ok', icon: 'circle-check', text: 'Diklaim' };
  if (points >= badge.minPoints) return { tone: 'info', icon: 'sparkles', text: 'Siap diklaim' };
  return { tone: 'muted', icon: 'lock', text: 'Terkunci' };
}

function KotakIkonBadge({ badge, unlocked, besar = false }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'grid shrink-0 place-items-center rounded-control',
        besar ? 'h-20 w-20' : 'h-10 w-10',
        unlocked ? 'bg-primary text-on-primary' : 'bg-surface-2 text-text-2',
      )}
    >
      <IkonSlot icon={badge.icon} size={besar ? 36 : 20} />
    </span>
  );
}

export default function Gamifikasi() {
  const { points, badges, missions, leaderboard, ledger, claimBadge, currentUser, areasSaya } = useSmart();
  const navigate = useNavigate();
  const [openBadge, setOpenBadge] = useState(null);

  const nextBadge = useMemo(
    () => badges.filter((b) => !b.claimed).sort((a, b) => a.minPoints - b.minPoints).find((b) => b.minPoints > points),
    [badges, points],
  );
  const myRank = leaderboard.findIndex((row) => row.id === currentUser?.id) + 1;
  const doneMissions = missions.filter((m) => m.done).length;
  const claimedBadges = badges.filter((b) => b.claimed).length;

  const bukaAktivitasMisi = (mission) => {
    const destination = missionActivityDestination(mission, areasSaya);
    navigate(destination.path, destination.state ? { state: destination.state } : undefined);
  };

  const subjudul = myRank
    ? `Poin Anda ${angka(points)}. Peringkat ${myRank} dari ${leaderboard.length} pengguna.`
    : `Poin Anda ${angka(points)}. Belum masuk papan peringkat.`;

  return (
    <div>
      <PageHeader title="Misi & poin" subtitle={subjudul} />

      <div className="flex flex-col gap-8">
        <div className={KISI_DUA}>
          <Card
            title="Misi harian"
            subtitle={`${doneMissions} dari ${missions.length} selesai. Klik misi untuk membuka aktivitas terkait. Status selesai setelah aktivitas disimpan; misi tidak memberi bonus poin tambahan.`}
          >
            <ul className="m-0 list-none p-0">
              {missions.map((mission) => (
                <li key={mission.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border py-3 first:border-t-0 first:pt-0">
                  <div className="min-w-0 flex-[1_1_220px]">
                    <p className={clsx('font-semibold', mission.done ? 'text-text-2 line-through' : 'text-text')}>{mission.title}</p>
                    <p className="text-sm text-text-2">Sasaran: {mission.target.replaceAll('-', ' ')}</p>
                  </div>
                  {mission.done
                    ? <StatusPill tone="ok" icon="circle-check">Selesai</StatusPill>
                    : <StatusPill tone="muted" icon="circle-minus">Belum</StatusPill>}
                  <Button
                    size="sm"
                    variant={mission.done ? 'ghost' : 'secondary'}
                    onClick={() => bukaAktivitasMisi(mission)}
                    aria-label={`Buka aktivitas ${mission.title}. Status: ${mission.done ? 'selesai' : 'belum selesai'}.`}
                    title="Buka aktivitas terkait"
                  >
                    {mission.done ? 'Lihat aktivitas' : 'Buka aktivitas'}
                  </Button>
                </li>
              ))}
            </ul>

            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
              <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm font-semibold text-text">
                <span>{nextBadge ? `Menuju badge ${nextBadge.name}` : 'Semua badge terbuka'}</span>
                {nextBadge && <span className="font-num">{angka(points)} / {angka(nextBadge.minPoints)} poin</span>}
              </div>
              <Bar value={nextBadge ? points : 1} max={nextBadge ? nextBadge.minPoints : 1} label="Menuju badge berikutnya" />
              <p className="text-sm text-text-2">
                {nextBadge
                  ? `Kurang ${angka(nextBadge.minPoints - points)} poin lagi.`
                  : 'Anda sudah mengumpulkan seluruh badge demo.'}
              </p>
            </div>
          </Card>

          <Card title="Badge" subtitle={`${claimedBadges} dari ${badges.length} diklaim. Badge terbuka saat poin Anda mencapai ambangnya.`}>
            <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))]">
              {badges.map((badge) => {
                const unlocked = points >= badge.minPoints;
                const status = statusBadge(badge, points);
                return (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => setOpenBadge(badge)}
                    aria-label={`Detail badge ${badge.name}. Status: ${status.text}.`}
                    className={clsx(
                      'flex flex-col gap-2.5 rounded-card border bg-surface p-3.5 text-left text-text hover:bg-surface-2',
                      unlocked ? 'border-border' : 'border-dashed border-text-2',
                      FOKUS,
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <KotakIkonBadge badge={badge} unlocked={unlocked} />
                      <span className="min-w-0">
                        <span className="block font-semibold">{badge.name}</span>
                        <span className="block font-num text-sm text-text-2">{angka(badge.minPoints)} poin</span>
                      </span>
                    </span>
                    <span className="text-sm text-text-2">{badge.desc}.</span>
                    <StatusPill tone={status.tone} icon={status.icon}>{status.text}</StatusPill>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        <div className={KISI_DUA}>
          <Card title="Papan peringkat" subtitle="Peringkat dihitung dari total poin yang dikumpulkan.">
            {leaderboard.length === 0 ? (
              <EmptyState title="Belum ada data peringkat" icon="trophy" />
            ) : (
              <Table head={['Peringkat', 'Pengguna', 'Area', 'Poin']}>
                {[...leaderboard]
                  .sort((a, b) => b.points - a.points)
                  .map((row, index) => {
                    const saya = row.id === currentUser?.id;
                    return (
                      <tr key={row.id} className={saya ? 'bg-surface-2' : 'hover:bg-surface-2'}>
                        <td className="px-3 py-2 font-num font-semibold tabular-nums">{index + 1}</td>
                        <td className="px-3 py-2">
                          <span className="font-semibold">{row.name}</span>
                          {saya && <StatusPill tone="info" icon="user" className="ml-2">Anda</StatusPill>}
                        </td>
                        <td className="px-3 py-2 text-text-2">{row.area}</td>
                        <td className="px-3 py-2 font-num font-semibold tabular-nums">{angka(row.points)}</td>
                      </tr>
                    );
                  })}
              </Table>
            )}
          </Card>

          <Card title="Riwayat poin" subtitle="Setiap aktivitas farm otomatis memberi poin ke akun Anda.">
            {ledger.length === 0 ? (
              <EmptyState title="Belum ada riwayat poin" icon="history" />
            ) : (
              <ul className="m-0 list-none p-0">
                {ledger.slice(0, 8).map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3 border-t border-border py-2.5 first:border-t-0">
                    <div className="min-w-0">
                      <p className="font-semibold text-text">{row.activity}</p>
                      <p className="text-sm text-text-2">{row.at}</p>
                    </div>
                    <span className="shrink-0 font-num font-bold text-ok-fg">+{row.points}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 border-t border-border pt-3 text-sm text-text-2">
              Quest kolam memberi EXP kepada pet; poin farm tetap terpisah di saldo akun.
            </p>
          </Card>
        </div>
      </div>

      <Modal open={!!openBadge} onClose={() => setOpenBadge(null)} title={openBadge?.name || 'Detail badge'}>
        {openBadge && (
          <div className="flex flex-col items-center gap-4 text-center">
            <KotakIkonBadge badge={openBadge} unlocked={points >= openBadge.minPoints} besar />
            <p className="text-sm text-text-2">{openBadge.desc}</p>
            <p className="text-sm text-text">
              Butuh <span className="font-num font-semibold">{angka(openBadge.minPoints)}</span> poin · poin Anda saat ini{' '}
              <span className="font-num font-semibold">{angka(points)}</span>
            </p>
            {openBadge.claimed ? (
              <StatusPill tone="ok" icon="circle-check">Sudah diklaim</StatusPill>
            ) : (
              <Button
                icon="medal"
                onClick={() => {
                  claimBadge(openBadge);
                  setOpenBadge(null);
                }}
                disabled={points < openBadge.minPoints}
              >
                Klaim badge
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
