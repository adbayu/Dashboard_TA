import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useSmart } from '../../shared/store/SmartStore';
import { askAquaponik, CHAT_GREETING } from '../services/aquaBot';
import { Button, Card, Field, Input, PageHeader, Select, StatusPill } from '../../shared/components/ui';
import { Icon } from '../../shared/components/Icon.jsx';
import { CHAT_SUGGESTIONS } from '../data/knowledge.js';

const uid = () => `MSG-${Math.random().toString(36).slice(2, 8)}`;

const TOPIK = ['pH air', 'Amonia & nitrat', 'Oksigen terlarut', 'Suhu air', 'Pakan ikan', 'Sayur aquaponik', 'EC & TDS', 'HPP kolam', 'Sensor IoT', 'Hama & penyakit', 'Cara kerja aquaponik', 'Virtual pet & poin'];

export default function Chatbot() {
  const { chat, pushChat, clearChat, areasSaya, devices, points } = useSmart();
  const [text, setText] = useState('');
  const [areaId, setAreaId] = useState(areasSaya[0]?.id || '');
  const [thinking, setThinking] = useState(false);
  const scroller = useRef(null);
  const areas = areasSaya;
  const sensorKonteks = devices.filter((d) => d.areaId === areaId).length;

  const messages = chat.length ? chat : [{ id: 'greet', role: 'bot', text: CHAT_GREETING.text, sources: [], suggestions: CHAT_SUGGESTIONS }];

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [chat.length, thinking]);

  const send = (raw) => {
    const question = (raw ?? text).trim();
    if (!question || thinking) return;
    const area = areas.find((a) => a.id === areaId) || null;
    pushChat({ id: uid(), role: 'user', text: question });
    setText('');
    setThinking(true);
    // Beri jeda singkat agar terasa seperti proses pencarian, bukan jawaban instan.
    setTimeout(() => {
      const result = askAquaponik(question, { area, devices: devices.filter((d) => d.areaId === areaId) });
      pushChat({ id: uid(), role: 'bot', text: result.answer, sources: result.sources, confidence: result.confidence, question });
      setThinking(false);
    }, 420);
  };

  return (
    <div>
      <PageHeader
        title="Tanya seputar ikan dan sayur"
        subtitle="Jawaban diambil dari basis pengetahuan lokal aquaponik JagoFarm dan disertai konteks sensor area yang Anda pilih."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card
          title="Percakapan"
          subtitle="Pertanyaan dicocokkan dengan topik di basis pengetahuan, lalu dilengkapi pembacaan sensor area yang Anda pilih."
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <Field label="Konteks area" className="w-full max-w-[280px]">
                <Select
                  value={areaId}
                  onChange={setAreaId}
                  options={areas.map((area) => ({ value: area.id, label: area.name }))}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <StatusPill tone="info" icon="radio">{sensorKonteks} sensor dipakai sebagai konteks</StatusPill>
                <Button variant="ghost" size="sm" icon="trash-2" onClick={clearChat}>
                  Bersihkan percakapan
                </Button>
              </div>
            </div>

            <div
              ref={scroller}
              role="log"
              aria-label="Percakapan dengan asisten aquaponik"
              className="custom-scrollbar flex max-h-[480px] min-h-[240px] flex-col gap-3 overflow-y-auto border-y border-border py-4 pr-1"
            >
              {messages.map((message) => (
                <div key={message.id} className={clsx('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={clsx(
                      'flex max-w-[85%] flex-col gap-2 whitespace-pre-line rounded-card px-4 py-3 text-[15px] leading-[22px]',
                      message.role === 'user' ? 'bg-primary text-on-primary' : 'border border-border bg-surface-2 text-text',
                    )}
                  >
                    {message.role === 'bot' && (
                      <p className="flex flex-wrap items-center gap-x-1.5 text-sm font-semibold text-primary">
                        <Icon name="bot" size={16} />
                        Asisten Aquaponik
                        {message.confidence ? (
                          <span className="font-normal text-text-2">· keyakinan {Math.round(message.confidence * 100)}%</span>
                        ) : null}
                      </p>
                    )}
                    <p>{message.text}</p>
                    {message.sources?.length > 0 && (
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-text-2">
                        <span>Sumber di basis pengetahuan:</span>
                        {message.sources.map((source) => (
                          <code key={source} className="rounded-control border border-border bg-surface px-1.5 font-mono text-[13px] text-text">
                            #{source}
                          </code>
                        ))}
                      </div>
                    )}
                    {message.suggestions?.length > 0 && (
                      <div className="flex flex-col gap-2 pt-1">
                        <p className="text-sm font-semibold text-text-2">Coba tanyakan</p>
                        <div className="flex flex-wrap gap-2">
                          {message.suggestions.map((suggestion) => (
                            <Button key={suggestion} size="sm" variant="secondary" onClick={() => send(suggestion)} className="!h-auto min-h-8 !whitespace-normal py-1 text-left">
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex justify-start">
                  <p role="status" className="flex items-center gap-2 rounded-card border border-border bg-surface-2 px-4 py-3 text-sm text-text-2">
                    <Icon name="loader-circle" className="animate-spin motion-reduce:animate-none" />
                    Menelusuri basis pengetahuan aquaponik…
                  </p>
                </div>
              )}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
              className="flex flex-wrap items-end gap-2"
            >
              <Field label="Pertanyaan Anda" className="min-w-0 flex-[1_1_280px]">
                <Input placeholder="cth. berapa pH ideal air kolam nila?" value={text} onChange={setText} />
              </Field>
              <Button type="submit" icon="send" disabled={thinking || !text.trim()}>
                Kirim
              </Button>
            </form>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card title="Topik yang saya kuasai" subtitle="Di luar topik ini, saya akan mengatakan tidak tahu daripada mengarang jawaban.">
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {TOPIK.map((topic) => (
                <li key={topic} className="inline-flex min-h-7 items-center rounded-pill border border-border bg-surface px-2.5 text-sm text-text">
                  {topic}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Tips bertanya">
            <ul className="m-0 flex list-disc flex-col gap-2 pl-[18px] text-sm text-text-2">
              <li>Sebut angkanya bila punya data, misal &quot;pH kolam saya 8,2, apa yang harus dilakukan?&quot;</li>
              <li>Pilih konteks area agar jawaban menyertakan pembacaan sensor terkini.</li>
              <li>Pertanyaan seputar HPP bisa sekaligus: buka Kelola Area untuk memasukkan item biaya.</li>
            </ul>
            <p className="mt-3 border-t border-border pt-3 text-sm text-text-2">
              Poin Anda saat ini <span className="font-num font-semibold text-text">{points.toLocaleString('id-ID')}</span>. Membaca materi
              aquaponik juga menambah wawasan untuk pengelolaan kolam.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
