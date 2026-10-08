# Untuk Dini 💌

Website ucapan ulang tahun ke-21 yang interaktif dari Eiffel untuk Dini, sahabat sejak TK. Dibuka dengan permintaan maaf karena ucapannya telat sehari, lalu mengajak Dini melewati beberapa momen kecil: meniup lilin, membuka kartu kenangan dari TK sampai sekarang, menggosok kartu untuk melihat foto, membaca surat, dan mengambil bintang harapan dari toples.

## Teknologi
- HTML, CSS, dan JavaScript murni (tanpa framework, tanpa build step)
- Web Audio API untuk musik kotak musik "Happy Birthday" yang dibuat langsung di browser
- Canvas untuk konfeti, hati melayang, dan kartu gosok
- Netlify Image CDN untuk menyajikan foto dalam ukuran dan format yang ringan

## Menjalankan secara lokal
```bash
netlify dev
```
atau buka `public/index.html` lewat server statis apa pun (foto memakai `/.netlify/images`, jadi `netlify dev` paling akurat).
