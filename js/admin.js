/**
 * HC Information Center — panel Admin HRD (admin.html)
 * CRUD informasi, upload lampiran, pin, publish/unpublish, konfirmasi baca.
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var items = [];
  var editingId = null;
  var attachments = []; // lampiran pada form yang sedang dibuka

  /* ============ Init ============ */

  document.addEventListener('DOMContentLoaded', function () {
    $('companySub').textContent = CONFIG.COMPANY;
    if (API.isDemoMode()) $('demoBanner').classList.remove('hidden');

    if (API.hasToken()) {
      showPanel();
    } else {
      showLogin();
    }

    $('btnLogin').addEventListener('click', doLogin);
    $('loginPass').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doLogin();
    });
    $('btnLogout').addEventListener('click', function () {
      API.setToken('');
      showLogin();
    });
    $('btnNew').addEventListener('click', function () { openForm(null); });
    $('closeForm').addEventListener('click', closeForm);
    $('btnCancelForm').addEventListener('click', closeForm);
    $('btnSaveForm').addEventListener('click', saveForm);
    $('closeReads').addEventListener('click', function () { $('readsModal').classList.add('hidden'); });
    $('adminSearch').addEventListener('input', debounce(renderTable, 300));
    $('adminFilterStatus').addEventListener('change', renderTable);
    $('adminFilterCat').addEventListener('change', renderTable);
    $('fFile').addEventListener('change', uploadFile);
  });

  /* ============ Login ============ */

  function doLogin() {
    var errEl = $('loginError');
    errEl.classList.add('hidden');
    $('btnLogin').disabled = true;
    API.call('login', {
      username: $('loginUser').value.trim(),
      password: $('loginPass').value
    })
      .then(function (data) {
        API.setToken(data.token);
        showPanel();
      })
      .catch(function (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      })
      .finally(function () { $('btnLogin').disabled = false; });
  }

  function showLogin() {
    $('loginSection').classList.remove('hidden');
    $('adminPanel').classList.add('hidden');
    $('btnLogout').classList.add('hidden');
    $('loginPass').value = '';
  }

  function showPanel() {
    $('loginSection').classList.add('hidden');
    $('adminPanel').classList.remove('hidden');
    $('btnLogout').classList.remove('hidden');
    loadItems();
  }

  /* ============ Data ============ */

  function loadItems() {
    $('adminMeta').textContent = 'Memuat...';
    API.adminCall('adminList', {})
      .then(function (data) {
        items = data.items || [];
        $('adminMeta').textContent = items.length + ' informasi total (draft + tayang).';
        renderTable();
      })
      .catch(function (err) {
        $('adminMeta').textContent = '';
        toast(err.message, 'err');
        if (/login ulang/i.test(err.message)) {
          API.setToken('');
          showLogin();
        }
      });
  }

  function filteredItems() {
    var q = $('adminSearch').value.trim().toLowerCase();
    var st = $('adminFilterStatus').value;
    var cat = $('adminFilterCat').value;
    return items.filter(function (it) {
      if (st && it.status !== st) return false;
      if (cat && it.kategori !== cat) return false;
      if (q && (it.judul + ' ' + it.isi).toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function renderTable() {
    var rows = filteredItems();
    var body = $('adminTableBody');
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted)">Tidak ada data.</td></tr>';
      return;
    }
    body.innerHTML = rows.map(function (it) {
      var statusBadge = it.status === 'Published'
        ? '<span class="badge badge-ok">Published</span>'
        : '<span class="badge badge-warn">Draft</span>';
      var expired = it.tanggalKedaluwarsa && new Date(it.tanggalKedaluwarsa) < new Date();
      var actions =
        '<button class="btn btn-sm btn-ghost" data-act="edit" data-id="' + esc(it.id) + '">Edit</button>' +
        '<button class="btn btn-sm btn-ghost" data-act="status" data-id="' + esc(it.id) + '">' +
        (it.status === 'Published' ? 'Jadikan Draft' : 'Terbitkan') + '</button>' +
        '<button class="btn btn-sm btn-ghost" data-act="pin" data-id="' + esc(it.id) + '">' +
        (it.pinned ? 'Lepas Pin' : 'Pin') + '</button>' +
        '<button class="btn btn-sm btn-ghost" data-act="reads" data-id="' + esc(it.id) + '">Konfirmasi (' + (it.readCount || 0) + ')</button>' +
        '<button class="btn btn-sm btn-danger" data-act="del" data-id="' + esc(it.id) + '">Hapus</button>';
      return '<tr>' +
        '<td class="title-cell"><strong>' + (it.pinned ? '📌 ' : '') + esc(it.judul) + '</strong>' +
        '<span class="sub">' + esc(it.id) + (expired ? ' · KEDALUWARSA' : '') + '</span></td>' +
        '<td>' + esc(it.kategori) + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td>' + fmtDate(it.tanggalPublikasi) + (it.tanggalKedaluwarsa ? '<br><span style="font-size:.72rem;color:var(--text-muted)">s.d. ' + fmtDate(it.tanggalKedaluwarsa) + '</span>' : '') + '</td>' +
        '<td>' + (it.readCount || 0) + '</td>' +
        '<td><div class="actions">' + actions + '</div></td>' +
        '</tr>';
    }).join('');

    body.querySelectorAll('button[data-act]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var act = btn.getAttribute('data-act');
        if (act === 'edit') {
          var item = items.filter(function (i) { return i.id === id; })[0];
          if (item) openForm(item);
        } else if (act === 'status') {
          var target = items.filter(function (i) { return i.id === id; })[0];
          setStatus(id, target && target.status === 'Published' ? 'Draft' : 'Published');
        } else if (act === 'pin') {
          togglePin(id);
        } else if (act === 'del') {
          removeItem(id);
        } else if (act === 'reads') {
          showReads(id);
        }
      });
    });
  }

  function setStatus(id, status) {
    API.adminCall('adminSetStatus', { id: id, status: status })
      .then(function () { toast(status === 'Published' ? 'Informasi diterbitkan.' : 'Informasi dijadikan draft.', 'ok'); loadItems(); })
      .catch(handleErr);
  }

  function togglePin(id) {
    API.adminCall('adminTogglePin', { id: id })
      .then(function () { toast('Status pin diperbarui.', 'ok'); loadItems(); })
      .catch(handleErr);
  }

  function removeItem(id) {
    if (!confirm('Hapus informasi ini secara permanen?')) return;
    API.adminCall('adminDelete', { id: id })
      .then(function () { toast('Informasi dihapus.', 'ok'); loadItems(); })
      .catch(handleErr);
  }

  function showReads(id) {
    $('readsModal').classList.remove('hidden');
    $('readsBody').innerHTML = '<tr><td colspan="3">Memuat...</td></tr>';
    API.adminCall('adminConfirmations', { id: id })
      .then(function (data) {
        $('readsTitle').textContent = 'Konfirmasi Baca (' + data.total + ' karyawan)';
        if (!data.logs.length) {
          $('readsBody').innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-muted)">Belum ada konfirmasi.</td></tr>';
          return;
        }
        $('readsBody').innerHTML = data.logs.map(function (log) {
          return '<tr><td>' + esc(log.nama) + '</td><td>' + esc(log.nrp) + '</td><td>' + fmtDateTime(log.waktu) + '</td></tr>';
        }).join('');
      })
      .catch(function (err) {
        $('readsBody').innerHTML = '<tr><td colspan="3">' + esc(err.message) + '</td></tr>';
      });
  }

  /* ============ Form editor ============ */

  function openForm(item) {
    editingId = item ? item.id : null;
    attachments = item ? (item.lampiran || []).slice() : [];
    $('formTitle').textContent = item ? 'Edit Informasi — ' + item.id : 'Informasi Baru';
    $('fJudul').value = item ? item.judul : '';
    $('fKategori').value = item ? item.kategori : 'Pengumuman';
    $('fTipe').value = item ? (item.tipe || 'Pengumuman Resmi') : 'Pengumuman Resmi';
    $('fIsi').value = item ? item.isi : '';
    $('fTglPub').value = item && item.tanggalPublikasi ? toInputDate(item.tanggalPublikasi) : todayInput();
    $('fTglExp').value = item && item.tanggalKedaluwarsa ? toInputDate(item.tanggalKedaluwarsa) : '';
    $('fPin').checked = item ? !!item.pinned : false;
    $('fTarget').value = 'Seluruh Karyawan';
    $('fPublishNow').checked = item ? item.status === 'Published' : true;
    $('fFile').value = '';
    renderAttachmentList();
    $('formModal').classList.remove('hidden');
  }

  function closeForm() {
    $('formModal').classList.add('hidden');
    editingId = null;
  }

  function saveForm() {
    var judul = $('fJudul').value.trim();
    var isi = $('fIsi').value.trim();
    if (judul.length < 3) { toast('Judul minimal 3 karakter.', 'err'); return; }
    if (!isi) { toast('Isi informasi wajib diisi.', 'err'); return; }

    var btn = $('btnSaveForm');
    btn.disabled = true;

    var payload = {
      id: editingId || '',
      judul: judul,
      kategori: $('fKategori').value,
      tipe: $('fTipe').value,
      isi: isi,
      status: $('fPublishNow').checked ? 'Published' : 'Draft',
      pinned: $('fPin').checked,
      tanggalPublikasi: $('fTglPub').value,
      tanggalKedaluwarsa: $('fTglExp').value,
      penulis: 'Admin HC',
      lampiran: attachments
    };
    if (editingId) {
      var old = items.filter(function (i) { return i.id === editingId; })[0];
      if (old) {
        payload.dibuat = old.dibuat;
        payload.penulis = old.penulis || 'Admin HC';
      }
    }

    API.adminCall('adminSave', payload)
      .then(function () {
        toast(editingId ? 'Perubahan tersimpan.' : 'Informasi baru tersimpan.', 'ok');
        closeForm();
        loadItems();
      })
      .catch(handleErr)
      .finally(function () { btn.disabled = false; });
  }

  /* ============ Upload lampiran ============ */

  function uploadFile(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      toast('Ukuran file maksimal ±6 MB.', 'err');
      e.target.value = '';
      return;
    }
    toast('Mengunggah ' + file.name + '...');
    var reader = new FileReader();
    reader.onload = function () {
      var base64 = String(reader.result).split(',')[1] || '';
      API.adminCall('adminUpload', {
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64: base64
      })
        .then(function (meta) {
          attachments.push(meta);
          renderAttachmentList();
          toast('Lampiran terunggah.', 'ok');
        })
        .catch(handleErr)
        .finally(function () { e.target.value = ''; });
    };
    reader.onerror = function () {
      toast('Gagal membaca file.', 'err');
      e.target.value = '';
    };
    reader.readAsDataURL(file);
  }

  function renderAttachmentList() {
    var wrap = $('attachmentList');
    if (!attachments.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = attachments.map(function (f, idx) {
      return '<div class="attachment-row"><span>📎 ' + esc(f.filename) + '</span>' +
        '<button class="btn btn-sm btn-danger" data-idx="' + idx + '">Hapus</button></div>';
    }).join('');
    wrap.querySelectorAll('button[data-idx]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        attachments.splice(Number(btn.getAttribute('data-idx')), 1);
        renderAttachmentList();
      });
    });
  }

  /* ============ Util ============ */

  function handleErr(err) {
    toast(err.message, 'err');
    if (/login ulang/i.test(err.message)) {
      API.setToken('');
      showLogin();
    }
  }

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
    return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function toInputDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function todayInput() {
    return toInputDate(new Date().toISOString());
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
