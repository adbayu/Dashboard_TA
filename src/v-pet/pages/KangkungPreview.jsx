import '@vitejs/plugin-react/preamble';
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import PetKarakter from '../components/PetKarakter.jsx';
import '../styles/pet.css';

function Preview() {
  const [species, setSpecies] = useState('Kangkung');
  const [level, setLevel] = useState(1);
  const [expression, setExpression] = useState('normal');
  return (
    <main style={{ maxWidth: 700, margin: '0 auto', padding: 24 }}>
      <h1>Uji renderer V-Pet Kangkung</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <label>Spesies <select value={species} onChange={(event) => setSpecies(event.target.value)}>
          <option>Kangkung</option><option>Lele</option>
        </select></label>
        <label>Level <select value={level} onChange={(event) => setLevel(Number(event.target.value))}>
          {[1, 2, 3, 4, 5].map((value) => <option key={value}>{value}</option>)}
        </select></label>
        <label>Kondisi <select value={expression} onChange={(event) => setExpression(event.target.value)}>
          {['normal', 'senang', 'sedih', 'kepanasan', 'kedinginan'].map((value) => <option key={value}>{value}</option>)}
        </select></label>
      </div>
      <section style={{ maxWidth: 620, marginTop: 18, background: '#fff', border: '1px solid #bfd0d0', borderRadius: 14, padding: 16 }}>
        <PetKarakter species={species} level={level} ekspresi={expression} tinggi={300} pesan="Pratinjau aset pengguna" />
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<Preview />);
