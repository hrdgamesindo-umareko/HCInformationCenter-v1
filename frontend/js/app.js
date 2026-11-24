/**
 * HC Information Center — halaman karyawan (index.html)
 */
(function () {
  'use strict';

  var state = {
    q: '',
    kategori: '',
    items: [],
    currentDetail: null
  };

  var $ = function (id) { return document.getElementById(id); };

  /* ============ Init ============ */

  document.addEventListener('DOMContentLoaded', function () {
    $('appTitle').textContent = CONFIG.APP_NAME;
    $('appCompany').textContent = CONFIG.COMPANY;
    $('footerText').textContent = '© ' + new Date().getFullYear() + ' ' + CONFIG.COMPANY + ' — ' + CONFIG.APP_NAME;
    if (API.isDemoMode()) $('demoBanner').classList.remove('hidden');

    $('searchInput').addEventListener('input', debounce(function () {
      state.q = $('searchInput').value.trim();
      loadList();
    }, 400));

    var tabs = document.querySelectorAll('#categoryTabs .tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        state.kategori = tab.getAttribute('data-cat') || '';
        loadList();
      });
    });

    $('closeDetail').addEventListener('click', function () {
      $('detailModal').classList.add('hidden');
    });
    $('closeConfirm').addEventListener('click', function () {
      $('confirmModal').classList.add('hidden');
    });
    $('detailModal').addEventListener('click', function (e) {
      if (e.target === $('detailModal')) $('detailModal').classList.add('hidden');
    });
    $('confirmModal').addEventListener('click', function (e) {
      if (e.target === $('confirmModal')) $('confirmModal').classList.add('hidden');
    });
    $('btnSubmitConfirm').addEventListener('click', submitConfirm);

    // Isi nama/NRP terakhir yang pernah dipakai (kenyamanan karyawan).
    try {
      $('confirmNama').value = localStorage.getItem('hc_nama') || '';
      $('confirmNrp').value = localStorage.getItem('hc_nrp') || '';
    } catch (err) { /* localStorage mungkin dinonaktifkan */ }

    loadList();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(function () { /* abaikan di file:// */ });
    }
  });

  /* ============ Data ============ */

  function loadList() {
    $('infoList').innerHTML = '';
    $('emptyState').classList.add('hidden');
    $('loadError').classList.add('hidden');
    $('resultMeta').textContent = 'Memuat informasi...';

    API.call('getList', { q: state.q, kategori: state.kategori })
      .then(function (data) {
        state.items = data.items || [];
        $('resultMeta').textContent = state.items.length + ' informasi ditayangkan · diperbarui ' +
          fmtDateTime(data.serverTime);
        updateHeroStats(state.items);
        renderList();
      })
      .catch(function (err) {
        $('resultMeta').textContent = '';
        $('errorMsg').textContent = err.message + ' — periksa API_URL di js/config.js atau koneksi internet Anda.';
        $('loadError').classList.remove('hidden');
      });
  }

  /** Statistik pada hero (jumlah tayang & pinned) dihitung dari data tanpa filter. */
  function updateHeroStats() {
    var elT = $('statTayang'), elP = $('statPinned');
    if (!elT || !elP) return;
    // Saat filter/pencarian aktif, state.items bukan daftar penuh —
    // statistik hanya dihitung dari muatan awal (tanpa filter).
    if (state.q || state.kategori) return;
    elT.textContent = state.items.length;
    elP.textContent = state.items.filter(function (i) { return i.pinned; }).length;
  }

  function renderList() {
    var wrap = $('infoList');
    if (!state.items.length) {
      $('emptyMsg').textContent = state.q
        ? 'Tidak ditemukan hasil untuk "' + esc(state.q) + '". Coba kata kunci lain.'
        : 'Tidak ada informasi tayang pada kategori ini.';
      $('emptyState').classList.remove('hidden');
      return;
    }
    wrap.innerHTML = state.items.map(function (item) {
      var badges = (item.pinned ? '<span class="pin-badge">📌 PINNED</span>' : '') +
        '<span class="badge">' + esc(item.kategori) + '</span>';
      return '<article class="card" data-id="' + esc(item.id) + '">' +
        '<div class="card-top"><h3>' + esc(item.judul) + '</h3></div>' +
        '<div class="badges">' + badges + '</div>' +
        '<p class="card-isi">' + esc(item.isi) + '</p>' +
        '<div class="card-foot">' +
        '<span>' + esc(item.tipe || '') + '</span>' +
        '<span>' + fmtDate(item.tanggalPublikasi || item.dibuat) + '</span>' +
        '</div></article>';
    }).join('');
    wrap.querySelectorAll('.card').forEach(function (card) {
      card.addEventListener('click', function () {
        openDetail(card.getAttribute('data-id'));
      });
    });
  }

  /* ============ Detail ============ */

  function openDetail(id) {
    $('detailModal').classList.remove('hidden');
    $('detailTitle').textContent = 'Memuat...';
    $('detailBadges').innerHTML = '';
    $('detailMeta').textContent = '';
    $('detailIsi').textContent = '';
    $('detailAttachments').innerHTML = '';
    $('readConfirmBox').innerHTML = '';

    API.call('getDetail', { id: id })
      .then(function (data) {
        state.currentDetail = data.item;
        $('detailTitle').textContent = data.item.judul;
        $('detailBadges').innerHTML =
          '<span class="badge">' + esc(data.item.kategori) + '</span>' +
          '<span class="badge badge-gray">' + esc(data.item.tipe || '') + '</span>' +
          (data.item.pinned ? '<span class="pin-badge">📌 PINNED</span>' : '');
        $('detailMeta').textContent =
          'Dipublikasikan ' + fmtDate(data.item.tanggalPublikasi || data.item.dibuat) +
          (data.item.tanggalKedaluwarsa ? ' · berlaku sampai ' + fmtDate(data.item.tanggalKedaluwarsa) : '') +
          ' · oleh ' + (data.item.penulis || 'HC');

        $('detailIsi').textContent = data.item.isi;
        renderAttachments(data.item.lampiran || []);
        renderReadConfirm(data.item, data.readCount || 0);
      })
      .catch(function (err) {
        $('detailTitle').textContent = 'Gagal memuat';
        $('detailIsi').textContent = err.message;
      });
  }

  function renderAttachments(files) {
    if (!files.length) return;
    var html = '<strong style="font-size:.85rem">Lampiran:</strong>' + files.map(function (f) {
      var icon = String(f.mimeType || '').indexOf('image') === 0 ? '🖼️' :
        (String(f.mimeType || '').indexOf('pdf') >= 0 ? '📄' : '📝');
      return '<div class="attachment-item"><span>' + icon + ' ' + esc(f.filename) + '</span>' +
        '<a href="' + esc(f.url || '#') + '" target="_blank" rel="noopener">Unduh</a></div>';
    }).join('');
    $('detailAttachments').innerHTML = html;
  }

  function renderReadConfirm(item, readCount) {
    var box = $('readConfirmBox');
    box.innerHTML =
      '<span>📖 Sudah dibaca &amp; dikonfirmasi <b>' + readCount + '</b> kali</span>' +
      '<button class="btn btn-primary" id="btnOpenConfirm">Saya Sudah Membaca</button>';
    box.querySelector('#btnOpenConfirm').addEventListener('click', function () {
      $('confirmModal').classList.remove('hidden');
    });
  }

  function submitConfirm() {
    var nama = $('confirmNama').value.trim();
    var nrp = $('confirmNrp').value.trim();
    var errEl = $('confirmError');
    errEl.classList.add('hidden');
    if (!nama || !nrp) {
      errEl.textContent = 'Nama dan NRP wajib diisi.';
      errEl.classList.remove('hidden');
      return;
    }
    var btn = $('btnSubmitConfirm');
    btn.disabled = true;
    API.call('confirmRead', {
      id: state.currentDetail ? state.currentDetail.id : '',
      nama: nama, nrp: nrp
    })
      .then(function (res) {
        try {
          localStorage.setItem('hc_nama', nama);
          localStorage.setItem('hc_nrp', nrp);
        } catch (err) { /* abaikan */ }
        $('confirmModal').classList.add('hidden');
        toast(res.duplicate ? 'Anda sudah konfirmasi sebelumnya.' : 'Terima kasih, konfirmasi Anda tercatat.', 'ok');
        renderReadConfirm(state.currentDetail, res.readCount || 0);
      })
      .catch(function (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      })
      .finally(function () { btn.disabled = false; });
  }

  /* ============ Util ============ */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function fmtDateTime(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments, self = this;
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }

  function toast(msg, type) {
    var el = $('toast');
    el.textContent = msg;
    el.className = 'toast' + (type === 'ok' ? ' toast-ok' : type === 'err' ? ' toast-err' : '');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.add('hidden'); }, 3200);
  }
})();
