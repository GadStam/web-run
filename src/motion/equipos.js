// Gestión colaborativa de Equipos y Postas Mixtas (2 Mujeres + 2 Hombres)
// Con soporte para persistencia en Google Sheets (Apps Script Web App) + LocalStorage

const STORAGE_KEY = 'speed_race_equipos_v1';

// URL del Web App de Google Sheets (desplegado con Apps Script).
// Si está vacío, opera de forma 100% funcional con LocalStorage.
export const GOOGLE_SHEETS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx9kjZa-myzN_fVICW5m-LWWp5F5mvljaTD2BEDkzq9QUkyF_RX92fZ-IlNy2NX30WrSg/exec';

const INITIAL_EQUIPOS = [
  {
    id: 'eq-1',
    nombre: 'Posta CeNARD Rayos',
    miembros: [
      { nombre: 'Martín Rossi', genero: 'hombre', telefono: '+54 9 11 4567-8901', email: 'martin.rossi@gmail.com' },
      { nombre: 'Camila Valenzuela', genero: 'mujer', telefono: '+54 9 11 2345-6789', email: 'camilav@gmail.com' },
      { nombre: 'Lucas Peralta', genero: 'hombre', telefono: '+54 9 11 8765-4321', email: 'lucas.peralta@gmail.com' }
    ]
  },
  {
    id: 'eq-2',
    nombre: 'Los Atardeceres Nuala',
    miembros: [
      { nombre: 'Sofía Benítez', genero: 'mujer', telefono: '+54 9 11 3456-7890', email: 'sofi.benitez@gmail.com' },
      { nombre: 'Lucía Morales', genero: 'mujer', telefono: '+54 9 11 9876-5432', email: 'lucia.morales@gmail.com' },
      { nombre: 'Gonzalo Silva', genero: 'hombre', telefono: '+54 9 11 7654-3210', email: 'gonza.silva@gmail.com' }
    ]
  },
  {
    id: 'eq-3',
    nombre: 'Sprint 400 Tartán',
    miembros: [
      { nombre: 'Mateo Álvarez', genero: 'hombre', telefono: '+54 9 11 5678-9012', email: 'mateo.alvarez@gmail.com' },
      { nombre: 'Julieta Giménez', genero: 'mujer', telefono: '+54 9 11 6789-0123', email: 'juli.gimenez@gmail.com' },
      { nombre: 'Facundo Romero', genero: 'hombre', telefono: '+54 9 11 1234-5678', email: 'facu.romero@gmail.com' },
      { nombre: 'Valentina Díaz', genero: 'mujer', telefono: '+54 9 11 8901-2345', email: 'valen.diaz@gmail.com' }
    ]
  }
];

function getLocalEquipos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EQUIPOS));
      return INITIAL_EQUIPOS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_EQUIPOS;
  }
}

function saveLocalEquipos(equipos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(equipos));
  } catch (e) {
    console.error('Error guardando en localStorage', e);
  }
}

// Sincronización con Google Sheets si el endpoint está activo
async function syncFromGoogleSheets() {
  if (!GOOGLE_SHEETS_ENDPOINT) return getLocalEquipos();
  try {
    const res = await fetch(GOOGLE_SHEETS_ENDPOINT);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        saveLocalEquipos(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('Google Sheets no disponible, usando caché local:', err);
  }
  return getLocalEquipos();
}

async function syncToGoogleSheets(payload) {
  if (!GOOGLE_SHEETS_ENDPOINT) return;
  try {
    await fetch(GOOGLE_SHEETS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });
  } catch (err) {
    console.warn('Error sincronizando con Google Sheets:', err);
  }
}

export function initEquipos() {
  const container = document.getElementById('equipos-list');
  const modal = document.getElementById('equipos-modal');
  const form = document.getElementById('equipos-form');
  const btnNuevo = document.getElementById('btn-crear-posta');
  const modalTitle = document.getElementById('modal-title');
  const modalSub = document.getElementById('modal-sub');
  const fieldEquipo = document.getElementById('campo-nombre-equipo');
  const inputEquipo = document.getElementById('input-equipo');
  const radioMujer = document.getElementById('genero-mujer');
  const radioHombre = document.getElementById('genero-hombre');
  const labelMujer = document.getElementById('label-genero-mujer');
  const labelHombre = document.getElementById('label-genero-hombre');
  const filterBtns = document.querySelectorAll('.equipos-filtro');

  if (!container || !modal || !form) return;

  let currentTargetEquipoId = null;
  let activeFilter = 'todos';

  function render() {
    const equipos = getLocalEquipos();
    container.innerHTML = '';

    const filtrados = equipos.filter(eq => {
      const isCompleto = eq.miembros.length === 4;
      if (activeFilter === 'disponibles') return !isCompleto;
      if (activeFilter === 'completos') return isCompleto;
      return true;
    });

    if (filtrados.length === 0) {
      container.innerHTML = `
        <div class="equipos-vacio">
          <p>No hay postas en esta categoría.</p>
        </div>
      `;
      return;
    }

    filtrados.forEach(eq => {
      const mujeres = eq.miembros.filter(m => m.genero === 'mujer');
      const hombres = eq.miembros.filter(m => m.genero === 'hombre');
      const isCompleto = eq.miembros.length === 4;

      const card = document.createElement('div');
      card.className = `equipo-card ${isCompleto ? 'equipo-card--completo' : ''}`;

      // Cabecera de estado
      let statusHtml = '';
      if (isCompleto) {
        statusHtml = `<span class="equipo-badge equipo-badge--completo">✓ COMPLETO (2M + 2H)</span>`;
      } else {
        const faltanM = 2 - mujeres.length;
        const faltanH = 2 - hombres.length;
        const textoFaltan = [
          faltanM > 0 ? `${faltanM} ${faltanM === 1 ? 'Mujer' : 'Mujeres'}` : '',
          faltanH > 0 ? `${faltanH} ${faltanH === 1 ? 'Hombre' : 'Hombres'}` : ''
        ].filter(Boolean).join(' y ');

        statusHtml = `<span class="equipo-badge equipo-badge--incompleto">FALTA: ${textoFaltan}</span>`;
      }

      // 4 Casilleros de la Posta
      let slotsHtml = '';
      
      // Miembros confirmados con popover interactivo en hover
      eq.miembros.forEach((m, idx) => {
        const isM = m.genero === 'mujer';
        const numLimpio = m.telefono.replace(/\D/g, '');
        const waMsg = encodeURIComponent(`¡Hola ${m.nombre}! Vi tus datos en la posta "${eq.nombre}" de Speed Race CeNARD. ¿Cómo venís para la carrera?`);

        slotsHtml += `
          <div class="equipo-slot equipo-slot--ocupado" tabindex="0">
            <div class="equipo-slot__info">
              <span class="equipo-slot__num">${idx + 1}°</span>
              <span class="equipo-slot__icono">${isM ? '🏃‍♀️' : '🏃‍♂️'}</span>
              <span class="equipo-slot__nombre">${m.nombre}</span>
            </div>
            <div class="equipo-slot__meta">
              <span class="equipo-slot__genero ${isM ? 'genero--m' : 'genero--h'}">${isM ? 'Mujer' : 'Hombre'}</span>
            </div>

            <!-- Popover flotante con datos al pasar el mouse -->
            <div class="corredor-popover" role="tooltip">
              <div class="corredor-popover__header">
                <span class="corredor-popover__nombre">${m.nombre}</span>
                <span class="corredor-popover__badge ${isM ? 'genero--m' : 'genero--h'}">${isM ? 'Mujer' : 'Hombre'}</span>
              </div>
              <div class="corredor-popover__campo">
                <span class="corredor-popover__label">WhatsApp:</span>
                <span class="corredor-popover__valor">${m.telefono}</span>
              </div>
              <div class="corredor-popover__campo">
                <span class="corredor-popover__label">Email:</span>
                <span class="corredor-popover__valor">${m.email || '—'}</span>
              </div>
              <a href="https://wa.me/${numLimpio}?text=${waMsg}" target="_blank" rel="noopener" class="btn-wa-popover">
                <span>💬 Chatear por WhatsApp</span>
              </a>
            </div>
          </div>
        `;
      });

      // Casilleros libres según la regla 2M + 2H
      if (!isCompleto) {
        const slotsRestantes = 4 - eq.miembros.length;
        const needM = 2 - mujeres.length;
        const needH = 2 - hombres.length;

        for (let i = 0; i < slotsRestantes; i++) {
          const slotNum = eq.miembros.length + i + 1;
          
          if (needM > 0 && (i < needM)) {
            slotsHtml += `
              <div class="equipo-slot equipo-slot--vacio">
                <div class="equipo-slot__info">
                  <span class="equipo-slot__num">${slotNum}°</span>
                  <span class="equipo-slot__icono">⚡</span>
                  <span class="equipo-slot__libre">Cupo Mujer disponible</span>
                </div>
                <button type="button" class="btn-slot-sumar btn-slot-sumar--m" data-equipo="${eq.id}" data-forzar="mujer">
                  + Sumarme como Mujer
                </button>
              </div>
            `;
          } else if (needH > 0) {
            slotsHtml += `
              <div class="equipo-slot equipo-slot--vacio">
                <div class="equipo-slot__info">
                  <span class="equipo-slot__num">${slotNum}°</span>
                  <span class="equipo-slot__icono">⚡</span>
                  <span class="equipo-slot__libre">Cupo Hombre disponible</span>
                </div>
                <button type="button" class="btn-slot-sumar btn-slot-sumar--h" data-equipo="${eq.id}" data-forzar="hombre">
                  + Sumarme como Hombre
                </button>
              </div>
            `;
          }
        }
      }

      // Footer
      let actionHtml = '';
      if (isCompleto) {
        const capitanTel = eq.miembros[0].telefono.replace(/\D/g, '');
        const waMsg = encodeURIComponent(`¡Hola equipo ${eq.nombre}! Ya estamos los 4 confirmados para la Speed Race en el CeNARD (2 mujeres + 2 hombres). ¡Coordinemos la posta!`);
        actionHtml = `
          <div class="equipo-card__footer">
            <a href="https://wa.me/${capitanTel}?text=${waMsg}" target="_blank" rel="noopener" class="btn-wa-equipo">
              <span>Coordinar equipo por WhatsApp</span>
            </a>
          </div>
        `;
      } else {
        actionHtml = `
          <div class="equipo-card__footer equipo-card__footer--abierto">
            <span class="equipo-reglamento-tip">Reglamento: 2 Mujeres + 2 Hombres</span>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="equipo-card__header">
          <div>
            <span class="equipo-card__sub">Posta Mixta 4×100m</span>
            <h3 class="equipo-card__title">${eq.nombre}</h3>
          </div>
          ${statusHtml}
        </div>
        <div class="equipo-card__slots">
          ${slotsHtml}
        </div>
        ${actionHtml}
      `;

      container.appendChild(card);
    });

    // Listeners para botones de sumarse
    container.querySelectorAll('.btn-slot-sumar').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const eqId = btn.getAttribute('data-equipo');
        const forzarGen = btn.getAttribute('data-forzar');
        abrirModalSumarse(eqId, forzarGen);
      });
    });

    // Soporte táctil en móviles para abrir el popover al tocar
    container.querySelectorAll('.equipo-slot--ocupado').forEach(slot => {
      slot.addEventListener('click', (e) => {
        if (e.target.closest('.btn-wa-popover')) return;
        const pop = slot.querySelector('.corredor-popover');
        if (pop) {
          document.querySelectorAll('.corredor-popover.is-visible').forEach(p => {
            if (p !== pop) p.classList.remove('is-visible');
          });
          pop.classList.toggle('is-visible');
        }
      });
    });
  }

  function abrirModalSumarse(equipoId, forzarGenero = null) {
    const equipos = getLocalEquipos();
    const eq = equipos.find(e => e.id === equipoId);
    if (!eq) return;

    currentTargetEquipoId = equipoId;
    modalTitle.textContent = `Sumarte a "${eq.nombre}"`;
    modalSub.textContent = 'Completá tus datos para ocupar tu lugar en la posta mixta.';
    fieldEquipo.style.display = 'none';
    inputEquipo.required = false;

    // Verificar disponibilidad de género en el equipo
    const countM = eq.miembros.filter(m => m.genero === 'mujer').length;
    const countH = eq.miembros.filter(m => m.genero === 'hombre').length;

    radioMujer.disabled = countM >= 2;
    radioHombre.disabled = countH >= 2;
    labelMujer.classList.toggle('is-disabled', countM >= 2);
    labelHombre.classList.toggle('is-disabled', countH >= 2);

    if (forzarGenero === 'mujer' && countM < 2) {
      radioMujer.checked = true;
    } else if (forzarGenero === 'hombre' && countH < 2) {
      radioHombre.checked = true;
    } else if (countM < 2) {
      radioMujer.checked = true;
    } else {
      radioHombre.checked = true;
    }

    modal.classList.add('is-open');
  }

  function abrirModalNuevo() {
    currentTargetEquipoId = null;
    modalTitle.textContent = 'Crear Nueva Posta Mixta';
    modalSub.textContent = 'Iniciá tu equipo y dejá los casilleros restantes para que otros corredores se sumen.';
    fieldEquipo.style.display = 'flex';
    inputEquipo.required = true;
    inputEquipo.value = '';

    radioMujer.disabled = false;
    radioHombre.disabled = false;
    labelMujer.classList.remove('is-disabled');
    labelHombre.classList.remove('is-disabled');
    radioMujer.checked = true;

    modal.classList.add('is-open');
  }

  function cerrarModal() {
    modal.classList.remove('is-open');
    form.reset();
    currentTargetEquipoId = null;
  }

  // Eventos de botones y modal
  btnNuevo.addEventListener('click', abrirModalNuevo);

  modal.querySelectorAll('.modal-close').forEach(el => {
    el.addEventListener('click', cerrarModal);
  });

  modal.addEventListener('click', e => {
    if (e.target === modal) cerrarModal();
  });

  // Filtros
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeFilter = btn.getAttribute('data-filter');
      render();
    });
  });

  // Envío del formulario
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const nombre = document.getElementById('input-nombre').value.trim();
    const telefono = document.getElementById('input-tel').value.trim();
    const email = document.getElementById('input-email').value.trim();
    const genero = radioMujer.checked ? 'mujer' : 'hombre';

    if (!nombre || !telefono || !email) return;

    const equipos = getLocalEquipos();

    if (currentTargetEquipoId) {
      // Sumarse a equipo existente
      const eq = equipos.find(e => e.id === currentTargetEquipoId);
      if (!eq) return;

      const currentGenCount = eq.miembros.filter(m => m.genero === genero).length;
      if (currentGenCount >= 2) {
        alert(`Este equipo ya tiene cubiertos los 2 cupos de ${genero === 'mujer' ? 'Mujeres' : 'Hombres'}. Por favor seleccioná el otro género o sumate a otra posta.`);
        return;
      }
      if (eq.miembros.length >= 4) {
        alert('Este equipo ya está completo.');
        return;
      }

      const nuevoMiembro = { nombre, genero, telefono, email };
      eq.miembros.push(nuevoMiembro);
      saveLocalEquipos(equipos);

      syncToGoogleSheets({
        accion: 'sumar_miembro',
        equipoId: eq.id,
        equipoNombre: eq.nombre,
        miembro: nuevoMiembro,
        estaCompleto: eq.miembros.length === 4,
        todosLosMiembros: eq.miembros,
        fecha: new Date().toISOString()
      });
    } else {
      // Crear nuevo equipo
      const nombreEquipo = inputEquipo.value.trim() || `Posta Nuala #${equipos.length + 1}`;
      const nuevo = {
        id: 'eq-' + Date.now(),
        nombre: nombreEquipo,
        miembros: [{ nombre, genero, telefono, email }]
      };
      equipos.unshift(nuevo);
      saveLocalEquipos(equipos);

      syncToGoogleSheets({
        accion: 'crear_equipo',
        equipo: nuevo,
        fecha: new Date().toISOString()
      });
    }

    cerrarModal();
    render();
  });

  // Cargar datos (con intento de sincronización externa)
  syncFromGoogleSheets().then(() => render());
}
