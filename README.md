# YouTube → AIFF

Descarga masiva de audio de YouTube y lo convierte a **AIFF** (PCM 16-bit, 44.1 kHz),
ideal para consolas/reproductores de DJ.

## Instalación (una sola vez)

```powershell
npm install
```

Esto descarga automáticamente `yt-dlp` y `ffmpeg`. No hace falta instalar nada más.

## Uso

**Opción A — links por línea de comando:**

```powershell
node descargar.js "https://youtu.be/ID1" "https://youtu.be/ID2"
```

**Opción B — lista en archivo (recomendado para descarga masiva):**

1. Pegá un link por línea en `links.txt`.
2. Ejecutá:

```powershell
node descargar.js
```

**Bajar una playlist completa:**

```powershell
node descargar.js --playlist "https://youtube.com/playlist?list=..."
```

## Resultado

Todos los archivos `.aiff` quedan en la carpeta **`descargas/`**, nombrados con el
título del video.

## Notas

- Usalo solo con contenido propio o material que tengas permiso de descargar.
- Si YouTube cambia algo y falla la descarga, actualizá yt-dlp: `npm update youtube-dl-exec`.
