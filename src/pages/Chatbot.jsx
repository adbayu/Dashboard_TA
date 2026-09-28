import { useEffect, useRef, useState } from 'react';
import { useSmart } from '../store/SmartStore';
import { askAquaponik, CHAT_GREETING } from '../services/aquaBot';
import { Badge, Button, Card, Input, SectionTitle } from '../components/ui';
import { CHAT_SUGGESTIONS } from '../data/seed';

const uid = () => `MSG-${Math.random().toString(36).slice(2, 8)}`;

export default function Chatbot() {
  const { chat, pushChat, clearChat, areasSaya, devices, points } = useSmart();
  const [text, setText] = useState('');
  const [areaId, setAreaId] = useState(areasSaya[0]?.id || '');
  const [thinking, setThinking] = useState(false);
  const scroller = useRef(null);
  const areas = areasSaya;

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
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[3fr,1.2fr]">
        <Card className="flex flex-col h-[640px]">
          <SectionTitle
            eyebrow="Chatbot Aquaponik"
            title="Tanya seputar ikan & sayur"
            subtitle="Jawaban diambil dari basis pengetahuan lokal aquaponik JagoFarm dan disertai konteks sensor area yang Anda pilih."
            action={
              <Button variant="ghost" icon="delete_sweep" onClick={clearChat}>
                Bersihkan
              </Button>
            }
          />

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Konteks area</span>
            <select
              value={areaId}
              onChange={(event) => setAreaId(event.target.value)}
              className="rounded-xl glass-input px-3 py-1.5 text-sm text-on-surface"
            >
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            <Badge tone="info" icon="sensors">
              {devices.filter((d) => d.areaId === areaId).length} sensor dipakai sebagai konteks
            </Badge>
          </div>

          <div ref={scroller} className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line ${
                    message.role === 'user'
                      ? 'bg-primary text-white rounded-br-sm'
                      : 'panel-inset text-on-surface rounded-bl-sm'
                  }`}
                >
                  {message.role === 'bot' && (
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary mb-1.5">
                      <span className="material-symbols-outlined text-[15px]">smart_toy</span>
                      Asisten Aquaponik
                      {message.confidence ? <span className="text-on-surface-variant font-semibold normal-case">· keyakinan {Math.round(message.confidence * 100)}%</span> : null}
                    </p>
                  )}
                  <p>{message.text}</p>
                  {message.sources?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {message.sources.map((source) => (
                        <Badge key={source} tone="muted">
                          #{source}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {message.suggestions?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {message.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => send(suggestion)}
                          className="inline-flex items-center h-8 rounded-full border border-primary/30 bg-primary/5 px-3 text-[12px] font-semibold text-primary hover:bg-primary/15 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm panel-inset px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    Menelusuri basis pengetahuan aquaponik…
                  </span>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
            className="mt-3 flex gap-2"
          >
            <Input
              placeholder="cth. berapa pH ideal air kolam nila?"
              value={text}
              onChange={setText}
              aria-label="Pertanyaan untuk chatbot aquaponik"
            />
            <Button type="submit" icon="send" disabled={thinking || !text.trim()}>
              Kirim
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionTitle eyebrow="Cakupan" title="Topik yang saya kuasai" />
            <div className="flex flex-wrap gap-1.5">
              {['pH air', 'Amonia & nitrat', 'Oksigen terlarut', 'Suhu air', 'Pakan ikan', 'Sayur aquaponik', 'EC & TDS', 'HPP kolam', 'Sensor IoT', 'Hama & penyakit', 'Cara kerja aquaponik', 'Virtual pet & poin'].map((topic) => (
                <Badge key={topic} tone="brand">
                  {topic}
                </Badge>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-on-surface-variant">
              Di luar topik ini, saya akan mengatakan tidak tahu daripada mengarang jawaban.
            </p>
          </Card>

          <Card>
            <SectionTitle eyebrow="Cara Pakai" title="Tips bertanya" />
            <ul className="space-y-2 text-sm text-on-surface-variant">
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">chevron_right</span>
                Sebut angkanya bila punya data, misal "pH kolam saya 8,2, apa yang harus dilakukan?"
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">chevron_right</span>
                Pilih konteks area agar jawaban menyertakan pembacaan sensor terkini.
              </li>
              <li className="flex gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">chevron_right</span>
                Pertanyaan seputar HPP bisa sekaligus: buka Kelola Area untuk memasukkan item biaya.
              </li>
            </ul>
            <p className="mt-3 rounded-xl bg-primary/5 border border-primary/15 p-3 text-[11px] text-on-surface-variant">
              Poin Anda saat ini {points.toLocaleString('id-ID')}. Membaca materi aquaponik juga menambah wawasan untuk pengelolaan kolam.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
