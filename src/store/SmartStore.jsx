import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  PET_STAGES,
  ROLES,
  SEED_AREAS,
  SEED_BADGES,
  SEED_CATEGORIES,
  SEED_DEVICES,
  SEED_LEADERBOARD,
  SEED_MISSIONS,
  SEED_POINT_RULES,
  SEED_PET,
  SEED_USERS,
} from '../data/seed';

const KEY = 'aquasmart_smart_v1';
const SmartCtx = createContext(null);

export const useSmart = () => {
  const ctx = useContext(SmartCtx);
  if (!ctx) throw new Error('useSmart harus dipakai di dalam <SmartProvider>');
  return ctx;
};

// Pembeda nilai sensor: tiap device punya rentang wajar sendiri.
const METRIC_RANGE = {
  ph: [6.2, 7.6, 2],
  do: [4.8, 8.2, 2],
  temp: [23.5, 30.5, 1],
  tds: [520, 980, 0],
  turbidity: [4, 28, 1],
  airTemp: [25, 33.5, 1],
  humidity: [52, 88, 0],
  lux: [9000, 44000, 0],
  uv: [1, 8.5, 1],
  flow: [9, 26, 1],
  runtime: [0, 24, 1],
  power: [120, 980, 0],
  voltage: [205, 238, 0],
  kwh: [40, 260, 0],
  dose: [0, 420, 0],
};

const DEFAULT_STATE = {
  role: 'pengguna',
  theme: 'light',
  categories: SEED_CATEGORIES,
  areas: SEED_AREAS,
  devices: SEED_DEVICES,
  users: SEED_USERS,
  pet: SEED_PET,
  pointRules: SEED_POINT_RULES,
  badges: SEED_BADGES,
  missions: SEED_MISSIONS,
  leaderboard: SEED_LEADERBOARD,
  ledger: [
    { id: 'L-1', at: '07 Mar 2026 08:10', activity: 'Pelihara virtual pet', points: 10 },
    { id: 'L-2', at: '06 Mar 2026 17:25', activity: 'Isi data HPP area', points: 25 },
    { id: 'L-3', at: '06 Mar 2026 09:02', activity: 'Catat pemantauan kolam', points: 15 },
  ],
  monitoring: [
    { id: 'MON-1', areaId: 'AR-01', at: '2026-03-07 07:30', by: 'Budi Santoso', ph: 6.8, doVal: 6.9, temp: 25.8, note: 'Nafsu makan ikan normal, air jernih.' },
    { id: 'MON-2', areaId: 'AR-03', at: '2026-03-06 16:10', by: 'Budi Santoso', ph: 6.5, ec: 1.8, note: 'Daun pakcoy mulai lebat, cek hama sisi timur.' },
  ],
  harvests: [
    { id: 'HV-1', areaId: 'AR-01', at: '2026-03-05', qty: 42, unit: 'kg', revenue: 1470000, note: 'Panen parsial nila ukuran 250 g.' },
  ],
  chat: [],
  attendance: 'Budi Santoso',
  deviceLive: {},
  points: 1240,
};

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed, deviceLive: {} };
  } catch {
    return DEFAULT_STATE;
  }
}

const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const now = () =>
  new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
  ' ' +
  new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function SmartProvider({ children }) {
  const [state, setState] = useState(loadState);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Persist seluruh state ke localStorage
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* kuota penuh — abaikan */
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
  }, [state.theme]);

  const notify = useCallback((message, tone = 'ok') => {
    setToast({ message, tone, id: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // Simulasi telemetri: geser nilai sensor tiap 5 detik
  useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => {
        if (!prev.devices.some((d) => d.status === 'online')) return prev;
        const devices = prev.devices.map((device) => {
          if (device.status !== 'online' || !device.metric) return device;
          const [min, max, precision] = METRIC_RANGE[device.metric.key] || [0, 100, 1];
          const step = (max - min) * 0.02;
          const delta = (Math.random() * 2 - 1) * step;
          const value = Number(clamp(device.metric.value + delta, min, max).toFixed(precision));
          return { ...device, metric: { ...device.metric, value } };
        });
        return { ...prev, devices };
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // ── helper penulisan ────────────────────────────────────────────────────────
  const patch = useCallback((updater) => setState((prev) => ({ ...prev, ...updater(prev) })), []);

  const logPoints = (prev, activity, points) => ({
    ledger: [{ id: uid('L'), at: now(), activity, points }, ...prev.ledger].slice(0, 60),
    points: prev.points + points,
  });

  const award = useCallback(
    (activity, points, silent) => {
      patch((prev) => {
        if (!silent) notify(`+${points} point — ${activity}`);
        return logPoints(prev, activity, points);
      });
    },
    [notify, patch],
  );

  const actions = useMemo(
    () => ({
      setRole: (role) => setState((prev) => ({ ...prev, role })),
      toggleTheme: () => setState((prev) => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' })),
      notify,

      // ── Device ───────────────────────────────────────────────────────────────
      saveDevice: (device) =>
        patch((prev) => ({
          devices: device.id && prev.devices.some((d) => d.id === device.id)
            ? prev.devices.map((d) => (d.id === device.id ? { ...d, ...device } : d))
            : [...prev.devices, { ...device, id: device.id || uid('IOT'), metric: device.metric || { key: 'ph', value: 7 } }],
        })),
      removeDevice: (id) => patch((prev) => ({ devices: prev.devices.filter((d) => d.id !== id) })),
      calibrateDevice: (id) => {
        patch((prev) => ({
          devices: prev.devices.map((d) =>
            d.id === id ? { ...d, status: 'online', lastCalibration: new Date().toISOString().slice(0, 10) } : d,
          ),
        }));
        notify(`Kalibrasi ${id} selesai — status kembali online.`);
      },
      setDeviceStatus: (id, status) => {
        patch((prev) => ({ devices: prev.devices.map((d) => (d.id === id ? { ...d, status } : d)) }));
        notify(`${id} diubah ke status "${status}".`);
      },
      assignDeviceArea: (id, areaId) => {
        patch((prev) => ({
          devices: prev.devices.map((d) => (d.id === id ? { ...d, areaId } : d)),
        }));
        notify('Penempatan device diperbarui.');
      },

      // ── Kategori ─────────────────────────────────────────────────────────────
      saveCategory: (category) =>
        patch((prev) => ({
          categories: category.id && prev.categories.some((c) => c.id === category.id)
            ? prev.categories.map((c) => (c.id === category.id ? { ...c, ...category } : c))
            : [...prev.categories, { ...category, id: uid('CAT') }],
        })),
      removeCategory: (id) => {
        patch((prev) => ({
          categories: prev.categories.filter((c) => c.id !== id),
          devices: prev.devices.filter((d) => d.categoryId !== id),
        }));
        notify('Kategori beserta device di dalamnya dihapus.', 'warn');
      },

      // ── Area ────────────────────────────────────────────────────────────────
      saveArea: (area) =>
        patch((prev) => ({
          areas: area.id && prev.areas.some((a) => a.id === area.id)
            ? prev.areas.map((a) => (a.id === area.id ? { ...a, ...area } : a))
            : [...prev.areas, { ...area, id: area.id || uid('AR'), hpp: area.hpp || [], deviceIds: area.deviceIds || [] }],
        })),
      removeArea: (id) => {
        patch((prev) => ({
          areas: prev.areas.filter((a) => a.id !== id),
          devices: prev.devices.map((d) => (d.areaId === id ? { ...d, areaId: null } : d)),
        }));
        notify('Area dihapus; device terkait menjadi belum ditempatkan.', 'warn');
      },
      saveHpp: (areaId, item) =>
        patch((prev) => ({
          areas: prev.areas.map((area) => {
            if (area.id !== areaId) return area;
            const hpp = item.id
              ? area.hpp.map((h) => (h.id === item.id ? { ...h, ...item } : h))
              : [...area.hpp, { ...item, id: uid('H') }];
            return { ...area, hpp };
          }),
        })),
      removeHpp: (areaId, itemId) =>
        patch((prev) => ({
          areas: prev.areas.map((area) => (area.id === areaId ? { ...area, hpp: area.hpp.filter((h) => h.id !== itemId) } : area)),
        })),

      // ── Pemantauan & panen ──────────────────────────────────────────────────
      addMonitoring: (entry) => {
        patch((prev) => ({ monitoring: [{ ...entry, id: uid('MON'), at: now() }, ...prev.monitoring].slice(0, 80) }));
        award('Catat pemantauan kolam', 15, true);
        notify('Catatan pemantauan tersimpan (+15 point).');
      },
      removeMonitoring: (id) => patch((prev) => ({ monitoring: prev.monitoring.filter((m) => m.id !== id) })),
      addHarvest: (entry) => {
        patch((prev) => ({ harvests: [{ ...entry, id: uid('HV') }, ...prev.harvests] }));
        award('Panen tercatat', 100, true);
        notify('Hasil panen dicatat (+100 point).');
      },

      // ── Pengguna ────────────────────────────────────────────────────────────
      saveUser: (user) =>
        patch((prev) => ({
          users: user.id && prev.users.some((u) => u.id === user.id)
            ? prev.users.map((u) => (u.id === user.id ? { ...u, ...user } : u))
            : [...prev.users, { ...user, id: user.id || uid('U'), points: user.points || 0, areaIds: user.areaIds || [] }],
        })),
      removeUser: (id) => patch((prev) => ({ users: prev.users.filter((u) => u.id !== id) })),

      // ── Virtual Pet ─────────────────────────────────────────────────────────
      renamePet: (name) => {
        patch((prev) => ({ pet: { ...prev.pet, name } }));
        notify('Nama virtual pet diperbarui.');
      },
      setPetSpecies: (species) => {
        patch((prev) => ({ pet: { ...prev.pet, species } }));
        notify(`Virtual pet diganti ke jenis ${species}.`);
      },
      feedPet: () => {
        patch((prev) => {
          const pet = prev.pet;
          const hunger = clamp(pet.hunger + 18, 0, 100);
          const health = clamp(pet.health + (hunger > 60 ? 4 : -3), 0, 100);
          const gained = 15;
          const { level, stage, xp, xpNext } = advancePet(pet, gained);
          return {
            pet: {
              ...pet,
              hunger,
              health,
              level,
              stage,
              xp,
              xpNext,
              lastFed: now(),
              log: [{ id: uid('P'), at: now(), text: 'Pet diberi pakan pelet.', delta: '+15 xp' }, ...pet.log].slice(0, 20),
            },
            ...logPoints(prev, 'Pelihara virtual pet (pakan)', 10),
          };
        });
        notify('Virtual pet diberi pakan (+10 point).');
      },
      playPet: () => {
        patch((prev) => {
          const pet = prev.pet;
          const { level, stage, xp, xpNext } = advancePet(pet, 12);
          return {
            pet: {
              ...pet,
              happiness: clamp(pet.happiness + 16, 0, 100),
              level,
              stage,
              xp,
              xpNext,
              lastPlayed: now(),
              log: [{ id: uid('P'), at: now(), text: 'Pet diajak bermain arus kolam.', delta: '+12 xp' }, ...pet.log].slice(0, 20),
            },
            ...logPoints(prev, 'Pelihara virtual pet (main)', 10),
          };
        });
        notify('Virtual pet diajak bermain (+10 point).');
      },
      cleanPet: () => {
        patch((prev) => {
          const pet = prev.pet;
          const { level, stage, xp, xpNext } = advancePet(pet, 10);
          return {
            pet: {
              ...pet,
              hygiene: clamp(pet.hygiene + 20, 0, 100),
              health: clamp(pet.health + 6, 0, 100),
              level,
              stage,
              xp,
              xpNext,
              log: [{ id: uid('P'), at: now(), text: 'Kolam dibersihkan — kebersihan pet naik.', delta: '+10 xp' }, ...pet.log].slice(0, 20),
            },
            ...logPoints(prev, 'Pelihara virtual pet (bersih)', 10),
          };
        });
        notify('Kebersihan virtual pet dirawat (+10 point).');
      },
      healPet: () => {
        patch((prev) => ({ pet: { ...prev.pet, health: 100, log: [{ id: uid('P'), at: now(), text: 'Pet dirawat — kondisi kembali prima.', delta: 'heal' }, ...prev.pet.log].slice(0, 20) } }));
        notify('Kesehatan virtual pet dipulihkan.');
      },
      resetPet: () => {
        patch(() => ({ pet: { ...SEED_PET, name: 'Nila Baru', level: 1, stage: PET_STAGES[0], xp: 0, xpNext: 200, log: [] } }));
        notify('Virtual pet direset ke telur baru.', 'warn');
      },
      applyPetToArea: (areaId) => {
        patch((prev) => ({ pet: { ...prev.pet, appliedToAreaId: areaId } }));
        notify('Virtual pet ditautkan ke area pemantauan.');
      },
      decayPet: () => {
        patch((prev) => ({
          pet: {
            ...prev.pet,
            hunger: clamp(prev.pet.hunger - 12, 0, 100),
            hygiene: clamp(prev.pet.hygiene - 8, 0, 100),
            happiness: clamp(prev.pet.happiness - 6, 0, 100),
            health: clamp(prev.pet.health - (prev.pet.hunger < 30 ? 6 : 2), 0, 100),
          },
        }));
        notify('Waktu berjalan — kondisi pet menurun, rawat kembali.', 'warn');
      },

      // ── Gamifikasi ──────────────────────────────────────────────────────────
      toggleMission: (id) => {
        patch((prev) => {
          const target = prev.missions.find((m) => m.id === id);
          if (!target) return {};
          const missions = prev.missions.map((m) => (m.id === id ? { ...m, done: !m.done } : m));
          if (target.done) return { missions };
          notify(`Misi "${target.title}" selesai (+${target.points} point).`);
          return { missions, ...logPoints(prev, `Misi: ${target.title}`, target.points) };
        });
      },
      claimBadge: (badge) => {
        let ok = true;
        patch((prev) => {
          if (prev.points < badge.minPoints) {
            ok = false;
            return {};
          }
          return { badges: prev.badges.map((b) => (b.id === badge.id ? { ...b, claimed: true } : b)) };
        });
        notify(ok ? `Badge "${badge.name}" diklaim.` : 'Point belum cukup untuk badge ini.', ok ? 'ok' : 'warn');
      },
      savePointRule: (rule) =>
        patch((prev) => ({
          pointRules: rule.id && prev.pointRules.some((r) => r.id === rule.id)
            ? prev.pointRules.map((r) => (r.id === rule.id ? { ...r, ...rule } : r))
            : [...prev.pointRules, { ...rule, id: uid('R') }],
        })),
      removePointRule: (id) => patch((prev) => ({ pointRules: prev.pointRules.filter((r) => r.id !== id) })),
      saveBadge: (badge) =>
        patch((prev) => ({
          badges: badge.id && prev.badges.some((b) => b.id === badge.id)
            ? prev.badges.map((b) => (b.id === badge.id ? { ...b, ...badge } : b))
            : [...prev.badges, { ...badge, id: uid('B') }],
        })),
      removeBadge: (id) => patch((prev) => ({ badges: prev.badges.filter((b) => b.id !== id) })),
      adjustPoints: (userId, delta) => {
        patch((prev) => ({
          leaderboard: prev.leaderboard.map((row) =>
            row.id === userId ? { ...row, points: Math.max(0, row.points + delta) } : row,
          ),
          users: prev.users.map((u) => (u.id === userId ? { ...u, points: Math.max(0, (u.points || 0) + delta) } : u)),
        }));
        notify(`Point pengguna disesuaikan (${delta > 0 ? '+' : ''}${delta}).`);
      },

      // ── Chatbot ─────────────────────────────────────────────────────────────
      pushChat: (message) => patch((prev) => ({ chat: [...prev.chat, message].slice(-40) })),
      clearChat: () => {
        patch(() => ({ chat: [] }));
        notify('Riwayat percakapan dibersihkan.');
      },
      resetDemo: () => {
        setState({ ...DEFAULT_STATE, theme: state.theme, role: state.role });
        notify('Data demo dikembalikan ke kondisi awal.', 'warn');
      },
    }),
    [award, notify, patch, state.role, state.theme],
  );

  const derived = useMemo(() => {
    const hppTotal = (areaId) => {
      const area = state.areas.find((a) => a.id === areaId);
      if (!area) return { total: 0, perUnit: 0 };
      const total = area.hpp.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unitPrice || 0), 0);
      const divisor = Number(area.population) || 0;
      return { total, perUnit: divisor ? total / divisor : 0 };
    };
    return {
      hppTotal,
      currentUser: ROLES[state.role] || ROLES.pengguna,
      devicesByArea: (areaId) => state.devices.filter((d) => d.areaId === areaId),
      categoryOf: (id) => state.categories.find((c) => c.id === id),
      areaOf: (id) => state.areas.find((a) => a.id === id),
      activeAlerts: state.devices.filter((d) => d.status !== 'online'),
      petProgress: Math.round((state.pet.xp / Math.max(1, state.pet.xpNext)) * 100),
    };
  }, [state]);

  const value = useMemo(() => ({ ...state, ...actions, ...derived, toast }), [state, actions, derived, toast]);
  return <SmartCtx.Provider value={value}>{children}</SmartCtx.Provider>;
}

function advancePet(pet, gained) {
  let xp = pet.xp + gained;
  let xpNext = pet.xpNext;
  let level = pet.level;
  while (xp >= xpNext) {
    xp -= xpNext;
    level += 1;
    xpNext = Math.round(xpNext * 1.35);
  }
  const stage = PET_STAGES[clamp(Math.floor((level - 1) / 2), 0, PET_STAGES.length - 1)];
  return { level, stage, xp, xpNext };
}

export const metricLabel = (key, categories) => {
  for (const category of categories) {
    const found = category.metrics.find((m) => m.key === key);
    if (found) return found;
  }
  return { key, label: key, unit: '' };
};

export const formatRupiah = (value) =>
  'Rp' + Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });
