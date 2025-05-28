// Referências do Firebase
const db = firebase.firestore();
const auth = firebase.auth();

// Constantes
const STATUS_COLORS = {
  'aceso': 'green',
  'apagado': 'gray',
  'com defeito': 'red',
  'sem luz': 'orange'
};

const MAP_CONFIG = {
  center: [-6.5247, -39.5254],
  zoom: 15,
  tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
};

// Variáveis globais
let map;
let markers = new Map();
let modoEdicao = false;

// Verificação de autenticação
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    initMap();
  }
});

// Controle de busca
const SearchControl = L.Control.extend({
  options: {
    position: 'topleft'
  },

  onAdd: function(map) {
    const container = L.DomUtil.create('div', 'search-control-container');
    const searchContainer = L.DomUtil.create('div', 'search-container', container);
    
    const searchBox = L.DomUtil.create('input', 'search-box', searchContainer);
    searchBox.type = 'text';
    searchBox.placeholder = 'Buscar por ID...';
    
    const searchButton = L.DomUtil.create('button', 'search-button', searchContainer);
    searchButton.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>';
    
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);
    
    function buscarPoste() {
      const id = searchBox.value.trim();
      if (!id) return;
      
      let encontrado = false;
      markers.forEach((marker, docId) => {
        const poste = marker.getPopup().getContent();
        if (poste.includes(`Poste ID: ${id}`)) {
          map.setView(marker.getLatLng(), 18);
          marker.openPopup();
          encontrado = true;
        }
      });
      
      if (!encontrado) {
        alert('Poste não encontrado!');
      }
    }
    
    searchButton.onclick = buscarPoste;
    searchBox.onkeypress = (e) => {
      if (e.key === 'Enter') {
        buscarPoste();
      }
    };
    
    return container;
  }
});

// Botão de modo de edição
const editButton = L.control({ position: 'bottomright' });
editButton.onAdd = function() {
  const button = L.DomUtil.create('button', 'edit-button');
  button.innerHTML = '📍 Adicionar Poste';
  
  L.DomEvent.disableClickPropagation(button);
  L.DomEvent.on(button, 'click', toggleModoEdicao);
  
  return button;
};

// Botão de relatório
const reportButton = L.control({ position: 'bottomright' });
reportButton.onAdd = function() {
  const button = L.DomUtil.create('button', 'report-button');
  button.innerHTML = '📊 Gerar Relatório';
  
  L.DomEvent.disableClickPropagation(button);
  L.DomEvent.on(button, 'click', gerarRelatorio);
  
  return button;
};

// Funções principais
function initMap() {
  map = L.map('map', {
    center: MAP_CONFIG.center,
    zoom: MAP_CONFIG.zoom,
    zoomControl: false
  });

  L.control.zoom({
    position: 'bottomleft'
  }).addTo(map);

  L.tileLayer(MAP_CONFIG.tileLayer).addTo(map);
  
  map.on('click', handleMapClick);
  reportButton.addTo(map);
  editButton.addTo(map);
  new SearchControl().addTo(map);
  
  loadPosts();
}

function toggleModoEdicao() {
  modoEdicao = !modoEdicao;
  const button = document.querySelector('.edit-button');
  
  if (modoEdicao) {
    button.classList.add('active');
    button.innerHTML = '✋ Parar Adição';
    map.getContainer().style.cursor = 'crosshair';
  } else {
    button.classList.remove('active');
    button.innerHTML = '📍 Adicionar Poste';
    map.getContainer().style.cursor = '';
  }
}

async function handleMapClick(e) {
  if (!modoEdicao) return;
  
  try {
    const id = await promptAsync("Digite o ID do poste:");
    if (!id) return;

    const snapshot = await db.collection("postes").where("id", "==", id).get();
    if (!snapshot.empty) {
      throw new Error("Este ID já está em uso por outro poste.");
    }

    const status = await promptAsync("Status do poste (aceso, apagado, com defeito, sem luz):");
    if (!STATUS_COLORS[status]) {
      throw new Error("Status inválido");
    }

    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    const posteData = {
      id,
      lat: e.latlng.lat,
      lng: e.latlng.lng,
      status,
      dataCriacao: timestamp,
      ultimaAtualizacao: null
    };

    const docRef = await db.collection("postes").add(posteData);
    posteData.docId = docRef.id;
    criarMarcador(posteData);
    
    toggleModoEdicao();
  } catch (error) {
    console.error('Erro ao adicionar poste:', error);
    alert(error.message || 'Erro ao adicionar poste. Verifique os dados e tente novamente.');
  }
}

function createPopupContent(poste) {
  const statusOptions = Object.keys(STATUS_COLORS)
    .map(status => `<option value="${status}" ${status === poste.status ? 'selected' : ''}>${status}</option>`)
    .join('');

  const dataAtualizacao = poste.ultimaAtualizacao ? new Date(poste.ultimaAtualizacao.seconds * 1000).toLocaleString() : 'Não atualizado';
  const dataCriacao = poste.dataCriacao ? new Date(poste.dataCriacao.seconds * 1000).toLocaleString() : 'Não disponível';

  return `
    <div class="popup-content">
      <div class="popup-header">
        <h3>Poste ID: ${poste.id}</h3>
        <button class="edit-id-button" onclick="editarId('${poste.docId}', '${poste.id}')">✏️</button>
      </div>
      <p>Status atual: <strong>${poste.status}</strong></p>
      <p>Data de criação: ${dataCriacao}</p>
      <p>Última atualização: ${dataAtualizacao}</p>
      <div class="status-form">
        <label>Alterar status:</label>
        <select onchange="alterarStatus('${poste.docId}', this.value)">
          <option value="">Selecione...</option>
          ${statusOptions}
        </select>
      </div>
      <p class="coordinates">Lat: ${poste.lat.toFixed(6)}, Lng: ${poste.lng.toFixed(6)}</p>
      <button class="delete-button" onclick="excluirPoste('${poste.docId}')">🗑️ Excluir Poste</button>
    </div>
  `;
}

function criarMarcador(poste) {
  if (!poste.lat || !poste.lng || !poste.status) {
    console.error('Dados do poste inválidos:', poste);
    return;
  }

  const marker = L.circleMarker([poste.lat, poste.lng], {
    color: STATUS_COLORS[poste.status] || 'gray',
    radius: 5,
    fillOpacity: 0.8
  }).addTo(map);

  const popupContent = createPopupContent(poste);
  marker.bindPopup(popupContent);
  markers.set(poste.docId, marker);
}

async function alterarStatus(docId, status) {
  try {
    if (!STATUS_COLORS[status]) {
      throw new Error('Status inválido');
    }

    await db.collection("postes").doc(docId).update({ 
      status,
      ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp()
    });

    const doc = await db.collection("postes").doc(docId).get();
    const poste = { ...doc.data(), docId: doc.id };
    
    if (markers.has(docId)) {
      const marker = markers.get(docId);
      marker.setStyle({ color: STATUS_COLORS[status] });
      marker.setPopupContent(createPopupContent(poste));
    }
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    alert('Erro ao atualizar status do poste. Tente novamente.');
  }
}

async function editarId(docId, idAtual) {
  try {
    const novoId = await promptAsync(`Digite o novo ID para o poste (atual: ${idAtual}):`);
    if (!novoId || novoId === idAtual) return;

    const snapshot = await db.collection("postes").where("id", "==", novoId).get();
    if (!snapshot.empty) {
      throw new Error("Este ID já está em uso por outro poste.");
    }

    await db.collection("postes").doc(docId).update({ 
      id: novoId
    });

    const doc = await db.collection("postes").doc(docId).get();
    const poste = { ...doc.data(), docId: doc.id };
    
    if (markers.has(docId)) {
      const marker = markers.get(docId);
      marker.setPopupContent(createPopupContent(poste));
    }

    alert('ID do poste atualizado com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar ID:', error);
    alert(error.message || 'Erro ao atualizar ID do poste. Tente novamente.');
  }
}

async function excluirPoste(docId) {
  if (!confirm('Tem certeza que deseja excluir este poste?')) {
    return;
  }

  try {
    await db.collection("postes").doc(docId).delete();
    
    if (markers.has(docId)) {
      const marker = markers.get(docId);
      marker.remove();
      markers.delete(docId);
    }
    
    alert('Poste excluído com sucesso!');
  } catch (error) {
    console.error('Erro ao excluir poste:', error);
    alert('Erro ao excluir poste. Tente novamente.');
  }
}

async function loadPosts() {
  try {
    const snapshot = await db.collection("postes").get();
    console.log(`Total de documentos encontrados: ${snapshot.size}`);
    
    snapshot.forEach(doc => {
      const poste = { ...doc.data(), docId: doc.id };
      
      if (!isPosteValido(poste)) {
        console.error('Poste inválido encontrado:', {
          id: doc.id,
          dados: poste
        });
        return;
      }
      
      criarMarcador(poste);
    });
  } catch (error) {
    console.error('Erro ao carregar postes:', error);
    alert('Erro ao carregar postes. Tente recarregar a página.');
  }
}

function isPosteValido(poste) {
  return (
    poste &&
    poste.id &&
    typeof poste.lat === 'number' &&
    typeof poste.lng === 'number' &&
    typeof poste.status === 'string' &&
    STATUS_COLORS[poste.status]
  );
}

async function gerarRelatorio() {
  try {
    const snapshot = await db.collection("postes").get();
    const postes = [];
    let postesInvalidos = 0;
    
    snapshot.forEach(doc => {
      const poste = doc.data();
      
      if (!isPosteValido(poste)) {
        postesInvalidos++;
        console.error('Poste inválido encontrado ao gerar relatório:', {
          id: doc.id,
          dados: poste
        });
        return;
      }
      
      postes.push({
        id: poste.id,
        status: poste.status,
        coordenadas: `${poste.lat.toFixed(6)}, ${poste.lng.toFixed(6)}`,
        dataCriacao: poste.dataCriacao ? new Date(poste.dataCriacao.seconds * 1000).toLocaleString() : 'Não disponível',
        ultimaAtualizacao: poste.ultimaAtualizacao ? new Date(poste.ultimaAtualizacao.seconds * 1000).toLocaleString() : 'Não atualizado'
      });
    });

    postes.sort((a, b) => {
      const idA = parseInt(a.id) || a.id;
      const idB = parseInt(b.id) || b.id;
      return idA > idB ? 1 : -1;
    });

    if (postesInvalidos > 0) {
      console.warn(`Atenção: ${postesInvalidos} postes foram ignorados por terem dados inválidos.`);
    }

    const statusCount = postes.reduce((acc, poste) => {
      acc[poste.status] = (acc[poste.status] || 0) + 1;
      return acc;
    }, {});

    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Postes - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
          .status-summary { margin: 20px 0; }
          .status-summary div { margin: 5px 0; }
          .warning { color: #ff4444; margin: 10px 0; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          tr:hover { background-color: #f5f5f5; }
          @media print {
            button { display: none; }
            body { padding: 20px; }
            tr:nth-child(even) { background-color: #f9f9f9 !important; }
            th { background-color: #f4f4f4 !important; color: black !important; }
          }
        </style>
      </head>
      <body>
        <h1>Relatório de Postes</h1>
        <p>Data do relatório: ${new Date().toLocaleString()}</p>
        
        ${postesInvalidos > 0 ? `<p class="warning">⚠️ Atenção: ${postesInvalidos} postes foram ignorados por terem dados inválidos.</p>` : ''}
        
        <div class="status-summary">
          <h2>Resumo por Status</h2>
          ${Object.entries(statusCount)
            .map(([status, count]) => `<div>Status ${status}: ${count} postes</div>`)
            .join('')}
          <div><strong>Total de postes válidos: ${postes.length}</strong></div>
          ${postesInvalidos > 0 ? `<div><strong>Total de postes inválidos: ${postesInvalidos}</strong></div>` : ''}
        </div>

        <h2>Lista Detalhada de Postes</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Coordenadas</th>
              <th>Data de Criação</th>
              <th>Última Atualização</th>
            </tr>
          </thead>
          <tbody>
            ${postes.map(poste => `
              <tr>
                <td>${poste.id}</td>
                <td>${poste.status}</td>
                <td>${poste.coordenadas}</td>
                <td>${poste.dataCriacao}</td>
                <td>${poste.ultimaAtualizacao}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <button onclick="window.print()">Imprimir Relatório</button>
      </body>
      </html>
    `;

    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(reportContent);
    reportWindow.document.close();
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    alert('Erro ao gerar relatório. Tente novamente.');
  }
}

function promptAsync(message) {
  return new Promise((resolve) => {
    const result = prompt(message);
    resolve(result);
  });
}

// Evento de logout
document.getElementById("logout").addEventListener("click", () => {
  auth.signOut();
}); 