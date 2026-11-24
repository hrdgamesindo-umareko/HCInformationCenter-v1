/**
 * API client + mode demo.
 * Semua request POST dikirim dengan Content-Type text/plain
 * (trik standar agar tidak memicu preflight CORS Apps Script).
 */
var API = (function () {
  var isDemo = !CONFIG.API_URL || CONFIG.API_URL.indexOf('PASTE') === 0;
  var adminToken = sessionStorage.getItem('hc_admin_token') || '';

  function call(action, payload) {
    payload = payload || {};
    if (isDemo) return demoCall(action, payload, false);
    return fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, payload: payload })
    })
      .then(function (res) { return res.json(); })
      .then(function (out) {
        if (!out || out.status !== 'ok') {
          throw new Error((out && out.message) || 'Terjadi kesalahan di server.');
        }
        return out.data;
      });
  }

  function adminCall(action, payload) {
    payload = payload || {};
    payload.token = adminToken;
    if (isDemo) return demoCall(action, payload, true);
    return call(action, payload);
  }

  function setToken(token) {
    adminToken = token || '';
    if (token) sessionStorage.setItem('hc_admin_token', token);
    else sessionStorage.removeItem('hc_admin_token');
  }

  function hasToken() { return !!adminToken; }
  function isDemoMode() { return isDemo; }

  return {
    call: call, adminCall: adminCall, setToken: setToken,
    hasToken: hasToken, isDemoMode: isDemoMode
  };
})();

/* ==================== MODE DEMO (data contoh) ==================== */

var DEMO_CATEGORIES = [
  'Pengumuman',
  'Memo & Surat Edaran',
  'Learning & Development',
  'Kegiatan & Agenda HC',
  'HC Corner'
];

var DEMO_ITEMS = [
  {
    id: 'DEMO-001', judul: 'Hari Libur Cuti Bersama Natal & Tahun Baru', kategori: 'Pengumuman',
    tipe: 'Pengumuman Resmi', pinned: true, status: 'Published', penulis: 'HC Department',
    tanggalPublikasi: new Date(Date.now() - 3 * 86400000).toISOString(),
    tanggalKedaluwarsa: new Date(Date.now() + 60 * 86400000).toISOString(),
    isi: 'Diberitahukan kepada seluruh karyawan bahwa hari libur cuti bersama diatur sebagai berikut:\n\n1. Hari libur Natal: 25 Desember.\n2. Cuti bersama Tahun Baru: 31 Desember.\n3. Hari libur Tahun Baru: 1 Januari.\n\nAktivitas operasional kembali normal pada tanggal 2 Januari. Bagi unit yang bekerja dengan sistem shift, jadwal piket akan disampaikan oleh masing-masing atasan langsung.\n\nTerima kasih atas perhatian dan kerja samanya.',
    lampiran: [], readCount: 42,
    diperbarui: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'DEMO-002', judul: 'SE-012: Kebijakan Baru Absensi Berbasis Aplikasi', kategori: 'Memo & Surat Edaran',
    tipe: 'Surat Edaran', pinned: true, status: 'Published', penulis: 'HC Department',
    tanggalPublikasi: new Date(Date.now() - 2 * 86400000).toISOString(),
    tanggalKedaluwarsa: '',
    isi: 'Sejak tanggal 1 bulan depan, seluruh karyawan wajib menggunakan aplikasi absensi mobile. Poin penting:\n\n- Check-in paling lambat pukul 08.00, check-out paling cepat pukul 17.00.\n- Izin/cuti tetap diajukan melalui atasan langsung.\n- Keterlambatan lebih dari 3 kali per bulan akan menjadi bahan pembinaan.\n\nMemo penting ini WAJIB dikonfirmasi telah dibaca oleh seluruh karyawan.',
    lampiran: [], readCount: 87,
    diperbarui: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'DEMO-003', judul: 'Jadwal Training Leadership Batch 2', kategori: 'Learning & Development',
    tipe: 'Jadwal Training', pinned: false, status: 'Published', penulis: 'L&D Team',
    tanggalPublikasi: new Date(Date.now() - 5 * 86400000).toISOString(),
    tanggalKedaluwarsa: new Date(Date.now() + 30 * 86400000).toISOString(),
    isi: 'Program Leadership Batch 2 akan dilaksanakan selama 3 hari:\n\n- Hari 1: Self Leadership & Communication.\n- Hari 2: Team Management & Coaching.\n- Hari 3: Performance Review & Action Plan.\n\nPeserta diharapkan hadir tepat waktu dan membawa laptop. Materi pembelajaran dapat diunduh melalui tautan yang dikirim via email.',
    lampiran: [], readCount: 15,
    diperbarui: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'DEMO-004', judul: 'Family Gathering 2026: Peserta & Rundown', kategori: 'Kegiatan & Agenda HC',
    tipe: 'Agenda', pinned: false, status: 'Published', penulis: 'HC Department',
    tanggalPublikasi: new Date(Date.now() - 1 * 86400000).toISOString(),
    tanggalKedaluwarsa: new Date(Date.now() + 45 * 86400000).toISOString(),
    isi: 'Family Gathering tahun ini bertema "Together We Grow". Rundown singkat:\n\n- 08.00: Registrasi & pembukaan.\n- 09.00: Games keluarga & doorprize.\n- 12.00: Makan siang bersama.\n- 13.30: Pengumuman pemenang & penutupan.\n\nKonfirmasi kehadiran melalui formulir yang dibagikan oleh HC pada minggu ini.',
    lampiran: [], readCount: 23,
    diperbarui: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'DEMO-005', judul: 'HC Corner: Etika Komunikasi di Ruang Kerja', kategori: 'HC Corner',
    tipe: 'Artikel', pinned: false, status: 'Published', penulis: 'HC Department',
    tanggalPublikasi: new Date(Date.now() - 7 * 86400000).toISOString(),
    tanggalKedaluwarsa: '',
    isi: 'Komunikasi yang baik membuat lingkungan kerja nyaman. Tiga hal sederhana yang bisa kita mulai:\n\n1. Gunakan sapaan dan ucapkan terima kasih.\n2. Sampaikan kritik secara privat dengan data, bukan opini pribadi.\n3. Balas pesan kerja maksimal dalam 1 hari kerja.\n\nPunya pertanyaan seputar budaya kerja? Kirim melalui menu FAQ di HC Corner.',
    lampiran: [], readCount: 31,
    diperbarui: new Date(Date.now() - 7 * 86400000).toISOString()
  },
  {
    id: 'DEMO-006', judul: 'Draft: Revisi Formulir Evaluasi Kompetensi', kategori: 'Learning & Development',
    tipe: 'Draf', pinned: false, status: 'Draft', penulis: 'L&D Team',
    tanggalPublikasi: '', tanggalKedaluwarsa: '',
    isi: 'Draf revisi formulir evaluasi kompetensi semester ini. Belum dipublikasikan — menunggu persetujuan HC Manager.',
    lampiran: [], readCount: 0,
    diperbarui: new Date(Date.now() - 12 * 3600000).toISOString()
  }
];

/** Simulasi server untuk mode demo (offline / sebelum deploy backend). */
function demoCall(action, payload, adminOnly) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      try {
        if (action === 'login') {
          if (payload.username === 'admin' && payload.password === 'demo123') {
            return resolve({ token: 'demo-token', role: 'admin', username: 'admin' });
          }
          return reject(new Error('Mode demo: gunakan admin / demo123'));
        }
        if (action === 'getList') {
          var items = DEMO_ITEMS.filter(function (it) { return it.status === 'Published'; });
          if (payload.kategori) items = items.filter(function (it) { return it.kategori === payload.kategori; });
          if (payload.q) {
            var q = payload.q.toLowerCase();
            items = items.filter(function (it) {
              return (it.judul + ' ' + it.isi).toLowerCase().indexOf(q) >= 0;
            });
          }
          items.sort(function (a, b) {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return new Date(b.tanggalPublikasi) - new Date(a.tanggalPublikasi);
          });
          return resolve({ items: items, total: items.length, serverTime: new Date().toISOString() });
        }
        if (action === 'getDetail') {
          var item = DEMO_ITEMS.filter(function (it) { return it.id === payload.id; })[0];
          if (!item) return reject(new Error('Informasi tidak ditemukan.'));
          return resolve({ item: item, readCount: item.readCount });
        }
        if (action === 'confirmRead') {
          return resolve({ ok: true, duplicate: false, readCount: 999 });
        }
        if (adminOnly) {
          if (!payload.token) return reject(new Error('Sesi berakhir. Silakan login ulang.'));
        }
        if (action === 'adminList') {
          var all = DEMO_ITEMS.slice().sort(function (a, b) {
            return new Date(b.diperbarui) - new Date(a.diperbarui);
          });
          return resolve({ items: all, total: all.length });
        }
        if (action === 'adminSave') {
          var saved = {
            id: payload.id || 'DEMO-' + Date.now(),
            judul: payload.judul, kategori: payload.kategori || 'Pengumuman',
            tipe: payload.tipe || 'Pengumuman', isi: payload.isi,
            status: payload.status || 'Draft', pinned: !!payload.pinned,
            tanggalPublikasi: payload.tanggalPublikasi || '',
            tanggalKedaluwarsa: payload.tanggalKedaluwarsa || '',
            penulis: payload.penulis || 'Admin HC', lampiran: payload.lampiran || [],
            dibuat: payload.dibuat || new Date().toISOString(),
            diperbarui: new Date().toISOString(), readCount: 0
          };
          if (payload.id) {
            DEMO_ITEMS.forEach(function (it, i) { if (it.id === payload.id) DEMO_ITEMS[i] = saved; });
          } else {
            DEMO_ITEMS.push(saved);
          }
          return resolve({ item: saved });
        }
        if (action === 'adminDelete') {
          for (var i = 0; i < DEMO_ITEMS.length; i++) {
            if (DEMO_ITEMS[i].id === payload.id) DEMO_ITEMS.splice(i, 1);
          }
          return resolve({ deleted: payload.id });
        }
        if (action === 'adminSetStatus') {
          DEMO_ITEMS.forEach(function (it) {
            if (it.id === payload.id) it.status = payload.status;
          });
          return resolve({ ok: true });
        }
        if (action === 'adminTogglePin') {
          DEMO_ITEMS.forEach(function (it) {
            if (it.id === payload.id) it.pinned = !it.pinned;
          });
          return resolve({ ok: true });
        }
        if (action === 'adminConfirmations') {
          return resolve({
            logs: [
              { idInfo: 'DEMO-002', judul: 'SE-012: Kebijakan Baru Absensi', nama: 'Budi Santoso', nrp: 'NRP-0101', waktu: new Date().toISOString() },
              { idInfo: 'DEMO-002', judul: 'SE-012: Kebijakan Baru Absensi', nama: 'Siti Aminah', nrp: 'NRP-0102', waktu: new Date().toISOString() }
            ],
            total: 2
          });
        }
        if (action === 'adminUpload') {
          return resolve({
            fileId: 'demo-' + Date.now(), filename: payload.filename,
            mimeType: payload.mimeType, size: 0,
            url: '#', webViewLink: '#'
          });
        }
        return reject(new Error('Action demo tidak dikenal: ' + action));
      } catch (err) {
        reject(err);
      }
    }, 250);
  });
}
