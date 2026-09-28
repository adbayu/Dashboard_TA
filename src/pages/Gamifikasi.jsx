import { useMemo, useState } from 'react';
import { useSmart } from '../store/SmartStore';
import { Badge, Bar, Button, Card, Empty, Modal, SectionTitle, StatCard, Table } from '../components/ui';

export default function Gamifikasi() {
  const { points, badges, missions, leaderboard, ledger, toggleMission, claimBadge, pet, currentUser } = useSmart();
  const [openBadge, setOpenBadge] = useState(null);

  const nextBadge = useMemo(
    () => badges.filter((b) => !b.claimed).sort((a, b) => a.minPoints - b.minPoints).find((b) => b.minPoints > points),
    [badges, points],
  );
  const myRank = leaderboard.findIndex((row) => row.id === currentUser?.id) + 1;
  const doneMissions = missions.filter((m) => m.done).length;
  const missionPoints = missions.filter((m) => m.done).reduce((sum, m) => sum + m.points, 0);

  const progressToNext = nextBadge ? Math.min(100, Math.round((points / nextBadge.minPoints) * 100)) : 100;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
        <StatCard label="Poin Anda" value={points.toLocaleString('id-ID')} icon="stars" hint="Dari seluruh aktivitas farm" />
        <StatCard label="Peringkat" value={myRank || '—'} unit={`/ ${leaderboard.length}`} icon="leaderboard" hint="Papan peringkat pengguna" />
        <StatCard label="Misi Selesai" value={`${doneMissions}/${missions.length}`} icon="task_alt" hint={`${missionPoints} point dari misi`} />
        <StatCard label="Badge Terkumpul" value={badges.filter((b) => b.claimed).length} unit={`/ ${badges.length}`} icon="military_tech" hint="Klaim di bawah" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr,1.4fr]">
        <Card>
          <SectionTitle
            eyebrow="Misi Harian"
            title="Tuntaskan misi untuk poin"
            subtitle="Misi selesai otomatis saat Anda melakukan aktivitasnya; tanda centang di bawah untuk menandai manual pada demo."
          />
          <ul className="space-y-2">
            {missions.map((mission) => (
              <li
                key={mission.id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  mission.done ? 'border-emerald-300/60 bg-emerald-50/60 dark:bg-emerald-900/20' : 'border-outline-variant/40'
                }`}
              >
                <button
                  onClick={() => toggleMission(mission.id)}
                  className={`w-8 h-8 shrink-0 rounded-lg border-2 flex items-center justify-center transition-colors ${
                    mission.done ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-outline-variant'
                  }`}
                  aria-label={mission.done ? 'Batalkan misi' : 'Tandai misi selesai'}
                >
                  {mission.done && <span className="material-symbols-outlined text-[16px]">check</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${mission.done ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{mission.title}</p>
                  <p className="text-[11px] text-on-surface-variant">Sasaran: {mission.target.replaceAll('-', ' ')}</p>
                </div>
                <Badge tone={mission.done ? 'ok' : 'brand'}>+{mission.points}</Badge>
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-primary flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">trending_up</span>
                Menuju badge berikutnya
              </span>
              <span className="text-on-surface">{nextBadge ? nextBadge.name : 'Semua badge terbuka'}</span>
            </div>
            <div className="mt-2">
              <Bar value={progressToNext} />
            </div>
            <p className="text-[11px] text-on-surface-variant mt-2">
              {nextBadge ? `${points.toLocaleString('id-ID')} / ${nextBadge.minPoints.toLocaleString('id-ID')} point` : 'Anda sudah mengumpulkan seluruh badge demo.'}
            </p>
          </div>
        </Card>

        <Card>
          <SectionTitle eyebrow="Badge" title="Koleksi pencapaian" subtitle="Badge terbuka saat poin Anda mencapai ambangnya." />
          <div className="space-y-3">
            {badges.map((badge) => {
              const unlocked = points >= badge.minPoints;
              return (
                <button
                  key={badge.id}
                  onClick={() => setOpenBadge(badge)}
                  className={`w-full text-left rounded-2xl border p-3 transition-all ${
                    unlocked ? 'border-primary/30 bg-primary/5 hover:shadow-glass' : 'border-outline-variant/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        unlocked ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">{badge.icon}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-on-surface">{badge.name}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {badge.minPoints.toLocaleString('id-ID')} point · {badge.desc}
                      </p>
                    </div>
                    {badge.claimed ? <Badge tone="ok">Diklaim</Badge> : unlocked ? <Badge tone="brand">Siap</Badge> : <Badge>Belum</Badge>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle eyebrow="Papan Peringkat" title="Pengguna paling aktif" subtitle="Peringkat dihitung dari total poin yang dikumpulkan." />
          {leaderboard.length === 0 ? (
            <Empty title="Belum ada data peringkat" icon="leaderboard" />
          ) : (
            <Table head={['#', 'Pengguna', 'Area', 'Poin']}>
              {[...leaderboard]
                .sort((a, b) => b.points - a.points)
                .map((row, index) => (
                  <tr key={row.id} className={row.id === currentUser?.id ? 'bg-primary/5' : 'hover:bg-primary/5'}>
                    <td className="px-3 py-2 font-extrabold text-on-surface">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </td>
                    <td className="px-3 py-2 font-semibold text-on-surface">{row.name}</td>
                    <td className="px-3 py-2 text-on-surface-variant">{row.area}</td>
                    <td className="px-3 py-2 font-bold text-primary">{row.points.toLocaleString('id-ID')}</td>
                  </tr>
                ))}
            </Table>
          )}
        </Card>

        <Card>
          <SectionTitle eyebrow="Riwayat Poin" title="Aktivitas terakhir" subtitle="Setiap aktivitas farm otomatis memberi poin ke akun Anda." />
          {ledger.length === 0 ? (
            <Empty title="Belum ada riwayat poin" icon="history" />
          ) : (
            <ul className="space-y-2">
              {ledger.slice(0, 8).map((row) => (
                <li key={row.id} className="flex items-center justify-between rounded-xl border border-outline-variant/40 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{row.activity}</p>
                    <p className="text-[11px] text-on-surface-variant">{row.at}</p>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">+{row.points}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-center gap-3 rounded-xl panel-inset p-3">
            <span className="material-symbols-outlined text-primary">pets</span>
            <p className="text-[11px] text-on-surface-variant">
              Pet <strong className="text-on-surface">{pet.name}</strong> ikut berkembang setiap Anda mengumpulkan poin perawatan.
            </p>
          </div>
        </Card>
      </div>

      <Modal open={!!openBadge} onClose={() => setOpenBadge(null)} title={openBadge?.name || 'Detail badge'}>
        {openBadge && (
          <div className="space-y-4 text-center">
            <span
              className={`w-20 h-20 rounded-2xl inline-flex items-center justify-center ${
                points >= openBadge.minPoints ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[40px]">{openBadge.icon}</span>
            </span>
            <p className="text-sm text-on-surface-variant">{openBadge.desc}</p>
            <p className="text-sm">
              Butuh <strong className="text-on-surface">{openBadge.minPoints.toLocaleString('id-ID')}</strong> point · poin Anda saat ini{' '}
              <strong className="text-on-surface">{points.toLocaleString('id-ID')}</strong>
            </p>
            {openBadge.claimed ? (
              <Badge tone="ok">Sudah diklaim</Badge>
            ) : (
              <Button
                icon="military_tech"
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
