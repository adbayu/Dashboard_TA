import { useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSmart } from '../../shared/store/SmartStore';
import { iotApi, IOT_SOURCE } from '../../services/iotApi.js';
import { Alert, Badge, Button, Card, Empty, Field, Input } from '../../shared/components/ui';
import { Icon } from '../../shared/components/Icon.jsx';
import { PublicHeader } from '../../shared/components/PublicFrame.jsx';
import PublicAreaLabel from '../../components/iot/PublicAreaLabel.jsx';
import { claimedDeviceState } from '../../utils/frontendReview.js';
import { activationCodeMemory, claimAndForgetActivationCode } from '../../utils/activationCodeMemory.js';

export default function DeviceClaim() {
  const { code = '' } = useParams();
  const location = useLocation();
  const { currentUser, isLoggedIn, sessionStatus, sessionError, role } = useSmart();
  const navigate = useNavigate();
  const urlActivationCode = new URLSearchParams(location.search).get('c') || '';
  const subscribeActivationCodes = useCallback(listener => activationCodeMemory.subscribe(listener), []);
  const getActivationCodeSnapshot = useCallback(() => activationCodeMemory.peek(code), [code]);
  const memoryActivationCode = useSyncExternalStore(subscribeActivationCodes, getActivationCodeSnapshot, () => '');
  const activationCode = urlActivationCode || memoryActivationCode;
  const [manualActivationCode, setManualActivationCode] = useState('');
  const [preview, setPreview] = useState(null);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const requestKey = [code, activationCode, sessionStatus, sessionError, currentUser?.id, role, isLoggedIn, attempt].join('|');
  const [resolvedKey, setResolvedKey] = useState('');

  useLayoutEffect(() => {
    if (urlActivationCode) {
      activationCodeMemory.set(code, urlActivationCode);
      const safeSearch = new URLSearchParams(location.search);
      safeSearch.delete('c');
      const search = safeSearch.toString();
      navigate({
        pathname: location.pathname,
        search: search ? `?${search}` : '',
        hash: location.hash,
      }, { replace: true });
    }
  }, [code, location.hash, location.pathname, location.search, navigate, urlActivationCode]);

  useEffect(() => activationCodeMemory.subscribe(() => {
    const currentCode = activationCodeMemory.peek(code);
    if (!currentCode) {
      setManualActivationCode('');
      setPreview(null);
      setError('');
      setState('activation-required');
      setResolvedKey('');
    }
  }), [code]);

  useEffect(() => {
    let current = true;

    if (!activationCode) return () => { current = false; };

    iotApi.getQrPreview(code, activationCode).then(async result => {
      if (!current) return;
      setPreview(result);
      setResolvedKey(requestKey);

      if (IOT_SOURCE === 'api' && sessionStatus === 'loading') return;
      if (IOT_SOURCE === 'api' && sessionStatus === 'error') {
        setError(sessionError || 'Backend tidak tersedia. Data contoh tidak digunakan sebagai pengganti.');
        setState('backend-error');
        return;
      }
      if (!isLoggedIn || !currentUser) {
        setState('login-required');
        return;
      }

      if (result.device.claimed) {
        if (role === 'pengelola') {
          setState('claimed');
          return;
        }
        try {
          const list = await iotApi.getDevices({ userId: currentUser.id });
          if (!current) return;
          const disposition = claimedDeviceState(role, list.devices || [], result.device.code);
          if (disposition.deviceId) setDeviceId(disposition.deviceId);
          setState(disposition.state);
        } catch (failure) {
          if (!current) return;
          setError(failure.message);
          setState('backend-error');
        }
        return;
      }

      setState(result.device.activationValid ? 'claimable' : 'expired');
    }).catch(failure => {
      if (!current) return;
      setResolvedKey(requestKey);
      if (failure.status === 404) {
        setError(failure.message);
        setState('unknown');
      } else {
        setError(failure.message || 'Backend tidak tersedia. Data contoh tidak digunakan sebagai pengganti.');
        setState('backend-error');
      }
    });

    return () => { current = false; };
  }, [code, activationCode, sessionStatus, sessionError, currentUser, role, isLoggedIn, attempt, requestKey]);

  function submitActivationCode(event) {
    event.preventDefault();
    const value = manualActivationCode.trim();
    if (!/^[a-f0-9]{64}$/.test(value)) {
      setError('Kode aktivasi harus terdiri dari 64 karakter heksadesimal.');
      setState('activation-required');
      setResolvedKey(requestKey);
      return;
    }
    setError('');
    setManualActivationCode('');
    activationCodeMemory.set(code, value);
    setAttempt(current => current + 1);
  }

  async function claim() {
    if (!preview?.device.activationValid || !currentUser) return;
    setClaiming(true);
    setError('');
    try {
      const result = await claimAndForgetActivationCode(activationCodeMemory, () => iotApi.claimDevice(code, activationCode, currentUser.id));
      setDeviceId(result.deviceId);
      setPreview(current => current ? {
        ...current,
        device: { ...current.device, claimed: true, activationValid: false },
      } : current);
      setState('success');
    } catch (failure) {
      setError(failure.message);
      if (failure.status === 400) setState('expired');
      else if (failure.status === 401) setState('login-required');
      else if (failure.status === 409) setAttempt(value => value + 1);
      else setState('backend-error');
    } finally {
      setClaiming(false);
    }
  }

  const viewReady = !activationCode || resolvedKey === requestKey;
  const viewState = state === 'success' ? 'success' : !activationCode ? 'activation-required' : viewReady ? state : 'loading';
  const viewPreview = activationCode && viewReady ? preview : null;
  const viewError = viewReady ? error : '';
  const returnToQr = location.pathname;
  // Satu h1 per halaman: kartu pratinjau memuat nama alat sebagai h1; tanpa pratinjau,
  // judul langkah aktif (masuk, kode aktivasi, hasil klaim) yang menjadi h1.
  const judulStep = viewPreview ? 'p' : 'h1';
  const previewCard = viewPreview && (
    <Card>
      {viewPreview.label && <p className="mb-3 text-xs font-semibold text-text-2">{viewPreview.label}</p>}
      <p className="text-sm leading-5 text-text-2">
        {viewPreview.device.type?.kind === 'paket' ? 'Paket' : 'Satuan'} · {viewPreview.device.type?.code || 'Tipe tidak tersedia'}
      </p>
      <h1 className="mt-2 break-words font-head text-2xl font-bold text-text">{viewPreview.device.name}</h1>
      <p className="mt-1 break-all font-num text-sm text-text-2">{viewPreview.device.code}</p>
      <PublicAreaLabel areaRef={viewPreview.device.areaRef} />
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
        <Badge tone={viewPreview.device.claimed ? 'muted' : 'info'} icon={viewPreview.device.claimed ? 'lock' : 'clock'}>
          {viewPreview.device.claimed ? 'Sudah diklaim' : 'Belum diklaim'}
        </Badge>
        <Badge tone={viewPreview.device.activationValid ? 'ok' : 'warn'} icon={viewPreview.device.activationValid ? 'circle-check' : 'triangle-alert'}>
          {viewPreview.device.activationValid ? 'Kode berlaku' : 'Kode tidak berlaku'}
        </Badge>
      </div>
      <div className="mt-5 border-t border-border pt-3">
        <h2 className="font-head text-base font-bold leading-[22px] text-text">Sensor</h2>
        {viewPreview.device.sensors.length ? (
          <ul className="mt-2 space-y-2">
            {viewPreview.device.sensors.map(sensor => (
              <li key={sensor.code} className="flex min-w-0 items-start gap-2 text-[15px] leading-[22px] text-text-2">
                <Icon name="radio" size={17} className="mt-[3px] shrink-0 text-primary" />
                <span className="break-words">{sensor.name || sensor.label || sensor.code}{sensor.unit ? ` (${sensor.unit})` : ''}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-[15px] leading-[22px] text-text-2">Informasi sensor belum tersedia.</p>}
      </div>
    </Card>
  );

  return (
    <main className="iot-touch-targets min-h-screen w-full px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg space-y-4">
        <PublicHeader />

        {viewState === 'loading' && <DeviceClaimLoadingState adaPratinjau={Boolean(viewPreview)} />}
        {previewCard}

        {viewState === 'login-required' && (
          <Card>
            <SectionTitle as={viewPreview ? 'h2' : 'h1'} title="Masuk untuk melanjutkan" />
            <p className="text-[15px] leading-[22px] text-text-2">Masuk diperlukan untuk memeriksa kepemilikan dan mengklaim alat.</p>
            <Link to="/masuk" state={{ from: returnToQr }} className="mt-4 w-full">
              <Button size="lg" icon="log-in" className="!h-[52px] w-full">Masuk untuk klaim</Button>
            </Link>
          </Card>
        )}

        {viewState === 'activation-required' && (
          <ActivationRequiredState
            manualActivationCode={manualActivationCode}
            viewError={viewError}
            onManualActivationCodeChange={setManualActivationCode}
            onSubmit={submitActivationCode}
          />
        )}

        {viewState === 'claimable' && (
          <Card>
            <p className="text-[15px] leading-[22px] text-text">Kode aktivasi pada QR masih berlaku. Klaim perangkat ini untuk menambahkannya ke akun Anda.</p>
            <Button size="lg" icon="plus" onClick={claim} disabled={claiming} className="mt-4 !h-[52px] w-full">
              {claiming ? 'Mengklaim perangkat...' : 'Klaim alat ini'}
            </Button>
          </Card>
        )}

        {viewState === 'success' && (
          <Card>
            <Empty titleAs={judulStep} title={`${viewPreview?.device.code || code} sudah masuk ke akun Anda.`} hint="Perangkat berhasil diklaim." icon="circle-check" />
            {deviceId && <Link to={`/iot/${encodeURIComponent(deviceId)}`} className="mt-4 w-full">
              <Button size="lg" className="!h-[52px] w-full">Buka detail perangkat</Button>
            </Link>}
          </Card>
        )}

        {viewState === 'own' && (
          <Card>
            <Empty titleAs={judulStep} title="Perangkat ini milik akun Anda" hint="Buka halaman detail untuk melihat status, sensor, dan informasi kesehatan yang tersedia." icon="circle-check" />
            <Link to={deviceId ? `/iot/${encodeURIComponent(deviceId)}` : '/iot'} className="mt-4 w-full">
              <Button size="lg" className="!h-[52px] w-full">Buka detail perangkat</Button>
            </Link>
          </Card>
        )}

        {viewState === 'claimed' && (
          <Card>
            <Empty titleAs={judulStep} title="Sudah diklaim" hint="Identitas pemilik tidak ditampilkan." icon="lock" />
          </Card>
        )}

        {viewState === 'other' && (
          <Card>
            <Empty titleAs={judulStep} title="Alat ini sudah dipakai akun lain." hint="Hubungi pengelola kalau ini keliru." icon="lock" />
          </Card>
        )}

        {viewState === 'expired' && (
          <Card>
            <Empty titleAs={judulStep} title="Kode aktivasi QR tidak berlaku." hint="Kode di QR ini sudah kedaluwarsa. Minta pengelola mencetak ulang QR." icon="clock" />
            {viewError && <Alert tone="bad" className="mt-3">{viewError}</Alert>}
            <Button size="lg" variant="secondary" icon="refresh-cw" onClick={() => setAttempt(value => value + 1)} className="mt-4 !h-[52px] w-full">Muat ulang status</Button>
          </Card>
        )}

        {viewState === 'unknown' && (
          <Card>
            <Empty titleAs={judulStep} title="Kode alat tidak dikenal" hint={viewError || 'Periksa kode QR atau hubungi pengelola.'} icon="search-x" />
            <Button size="lg" variant="secondary" icon="refresh-cw" onClick={() => setAttempt(value => value + 1)} className="mt-4 !h-[52px] w-full">Coba lagi</Button>
          </Card>
        )}

        {viewState === 'backend-error' && (
          <Card>
            <div role="alert" className="space-y-4">
              <Empty titleAs={judulStep} title="Backend tidak tersedia" hint={viewError || 'Backend tidak tersedia. Data contoh tidak digunakan sebagai pengganti.'} icon="cloud-off" />
              <Button size="lg" variant="secondary" icon="refresh-cw" onClick={() => setAttempt(value => value + 1)} className="!h-[52px] w-full">Coba lagi</Button>
            </div>
          </Card>
        )}

        {IOT_SOURCE === 'local' && viewPreview && <p className="text-center text-sm leading-5 text-text-2">Data contoh. Perubahan demo hanya berlaku selama sesi ini.</p>}
      </div>
    </main>
  );
}

export function ActivationRequiredState({ manualActivationCode, viewError, onManualActivationCodeChange, onSubmit }) {
  return (
    <Card>
      <SectionTitle as="h1" title="Masukkan kode aktivasi" />
      <p className="text-[15px] leading-[22px] text-text-2">Kode tidak tersimpan di alamat halaman. Minta kode yang masih berlaku dari pengelola untuk melanjutkan.</p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <Field label="Kode aktivasi">
          <Input
            id="manual-activation-code"
            type="password"
            value={manualActivationCode}
            onChange={onManualActivationCodeChange}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck="false"
            inputMode="text"
            maxLength={64}
            pattern="[a-f0-9]{64}"
            required
            className="!h-12"
          />
        </Field>
        {viewError && <Alert tone="bad">{viewError}</Alert>}
        <Button type="submit" size="lg" icon="key-round" className="!h-[52px] w-full">Periksa kode</Button>
      </form>
    </Card>
  );
}

// Di mode API, pratinjau sudah tampil saat sesi masih dimuat; kartu pratinjau
// membawa h1-nya sendiri, jadi h1 tersembunyi hanya untuk keadaan tanpa pratinjau.
export function DeviceClaimLoadingState({ adaPratinjau = false }) {
  return (
    <Card>
      {!adaPratinjau && <h1 className="sr-only">Klaim perangkat</h1>}
      <p role="status" className="text-[15px] leading-[22px] text-text-2">Memuat informasi QR...</p>
    </Card>
  );
}

function SectionTitle({ title, as: Judul = 'h2' }) {
  return <Judul className="mb-2 font-head text-[19px] font-bold leading-[26px] text-text">{title}</Judul>;
}
