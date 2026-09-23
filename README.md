# Dashboard JagoFarm

Pilot backend + PostgreSQL, simulator, dan UI terpisah dari demo lama.
Panduan menjalankan, kontrak API, batas Sprint 1, serta checklist penguji: [PILOT-SETUP.md](PILOT-SETUP.md).
Keputusan perencanaan: [PERSIAPAN-PILOT.md](PERSIAPAN-PILOT.md).

![Tampilan Dashboard JagoFarm](preview.jpg)

## Menjalankan pilot secara singkat

~~~powershell
npm ci
Copy-Item .env.example .env
docker compose up -d
npm run db:migrate
npm run api
~~~

Rincian peran, akun undangan, dan checklist pengujian ada di [PILOT-SETUP.md](PILOT-SETUP.md).

## Frontend tooling

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
