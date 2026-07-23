#!/usr/bin/env node
// Descarga masiva de audio de YouTube -> AIFF
// Uso:
//   node descargar.js <link1> <link2> ...      (links por argumento)
//   node descargar.js                          (lee los links de links.txt)
//   node descargar.js --playlist <link>        (baja la playlist completa)
//
// Requisitos: ya vienen con npm install (yt-dlp + ffmpeg incluidos).

import { create as createYoutubeDl } from 'youtube-dl-exec';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carpeta de salida
const OUT_DIR = path.join(__dirname, 'descargas');
// Archivo con la lista de links (uno por línea)
const LINKS_FILE = path.join(__dirname, 'links.txt');

// yt-dlp: usamos el binario que instala youtube-dl-exec
const ytdlp = createYoutubeDl(
  path.join(
    __dirname,
    'node_modules',
    'youtube-dl-exec',
    'bin',
    process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  )
);

// ---------- utilidades ----------

function log(msg) {
  process.stdout.write(msg + '\n');
}

// Limpia caracteres no válidos para nombres de archivo en Windows
function nombreSeguro(nombre) {
  return nombre.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim().slice(0, 180);
}

// Lee los links: primero de los argumentos, si no de links.txt
function obtenerLinks(args) {
  const links = args.filter((a) => !a.startsWith('--'));
  if (links.length > 0) return links;

  if (fs.existsSync(LINKS_FILE)) {
    return fs
      .readFileSync(LINKS_FILE, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
  }
  return [];
}

// Convierte un archivo de audio a AIFF con ffmpeg
function convertirAaiff(entrada, salida) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', entrada,
      '-vn',                 // sin video
      '-map', 'a:0',         // solo la primera pista de audio
      '-c:a', 'pcm_s16be',   // PCM 16-bit big-endian (AIFF estándar, ideal para consolas)
      '-ar', '44100',        // 44.1 kHz, calidad CD
      '-ac', '2',            // estéreo (compatibilidad con consolas/DJ)
      salida,
    ];
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    proc.stderr.on('data', (d) => (err += d.toString()));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error('ffmpeg falló:\n' + err.slice(-800)));
    });
    proc.on('error', reject);
  });
}

// Descarga el audio de un link y lo convierte a AIFF
async function procesarLink(url, index, total, playlist) {
  log(`\n[${index}/${total}] ${url}`);

  // Carpeta temporal única para no mezclar archivos
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'yt2aiff-'));

  try {
    log('  → Descargando mejor audio...');
    await ytdlp(url, {
      format: 'bestaudio/best',
      output: path.join(tmp, '%(title)s.%(ext)s'),
      noPlaylist: !playlist,
      ffmpegLocation: ffmpegPath,
      noWarnings: true,
      noProgress: true,
    });

    // Puede haber varios archivos si era playlist
    const archivos = fs.readdirSync(tmp).filter((f) => !f.endsWith('.part'));
    if (archivos.length === 0) throw new Error('No se descargó ningún archivo.');

    for (const archivo of archivos) {
      const entrada = path.join(tmp, archivo);
      const base = nombreSeguro(path.parse(archivo).name);
      const salida = path.join(OUT_DIR, `${base}.aiff`);

      log(`  → Convirtiendo a AIFF: ${base}.aiff`);
      await convertirAaiff(entrada, salida);
    }

    log('  ✓ Listo');
    return archivos.length;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ---------- main ----------

async function main() {
  const args = process.argv.slice(2);
  const playlist = args.includes('--playlist');
  const links = obtenerLinks(args);

  if (links.length === 0) {
    log('No hay links.');
    log('Pasá links como argumento:');
    log('   node descargar.js "https://youtu.be/..." "https://youtu.be/..."');
    log('O escribí uno por línea en el archivo links.txt');
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  log(`Se procesarán ${links.length} link(s). Salida: ${OUT_DIR}`);

  let ok = 0;
  let fallos = 0;
  let totalPistas = 0;

  for (let i = 0; i < links.length; i++) {
    try {
      totalPistas += await procesarLink(links[i], i + 1, links.length, playlist);
      ok++;
    } catch (e) {
      fallos++;
      log(`  ✗ Error: ${e.message}`);
    }
  }

  log('\n──────────────────────────────');
  log(`Terminado. Links OK: ${ok} | Con error: ${fallos} | Pistas AIFF: ${totalPistas}`);
  log(`Carpeta: ${OUT_DIR}`);
}

main().catch((e) => {
  log('Error fatal: ' + e.message);
  process.exit(1);
});
