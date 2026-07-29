const usuario = getUsuarioLogado();
if (!usuario) window.location.href = 'index.html';

document.getElementById('saudacao-usuario').textContent = '👋 ' + (usuario.nome || 'Visitante');

let customizacaoAtual = {};

async function carregarCustomizacao() {
  const { data, error } = await supabaseClient
    .from('users')
    .select('customizacao')
    .eq('id', usuario.id)
    .single();

  if (error || !data) return;

  customizacaoAtual = data.customizacao || {};

  document.getElementById('input-humor').value = customizacaoAtual.humor || '';

  const top = customizacaoAtual.top_filmes || [];
  for (let i = 0; i < 5; i++) {
    document.getElementById(`top-filme-${i + 1}`).value = top[i] || '';
  }

  document.getElementById('select-moldura').value = customizacaoAtual.moldura_avatar || 'nenhuma';
  document.getElementById('moldura-cor-custom').value = customizacaoAtual.moldura_cor || '#FF00CC';
  document.getElementById('moldura-estilo-custom').value = customizacaoAtual.moldura_estilo || 'solid';
  alternarCamposMolduraPersonalizada();
  document.getElementById('input-musica').value = customizacaoAtual.musica_url || '';
  document.getElementById('select-fonte').value = customizacaoAtual.fonte || 'padrao';

  const cores = customizacaoAtual.cores || {};
  document.getElementById('cor-bg-claro').value = (cores.claro && cores.claro.bg) || '#FFFFFF';
  document.getElementById('cor-texto-claro').value = (cores.claro && cores.claro.texto) || '#000000';
  document.getElementById('cor-bg-escuro').value = (cores.escuro && cores.escuro.bg) || '#000033';
  document.getElementById('cor-texto-escuro').value = (cores.escuro && cores.escuro.texto) || '#FFFFFF';
}

// Faz merge de um pedaço novo em cima da customização já salva, e persiste.
async function salvarPatchCustomizacao(patch, erroElId) {
  const erroEl = document.getElementById(erroElId);
  erroEl.textContent = '';
  erroEl.classList.remove('sucesso');

  const nova = { ...customizacaoAtual, ...patch };

  const { error } = await supabaseClient
    .from('users')
    .update({ customizacao: nova })
    .eq('id', usuario.id);

  if (error) {
    erroEl.textContent = 'Erro ao salvar.';
    return false;
  }

  customizacaoAtual = nova;
  localStorage.setItem('customizacao_cache', JSON.stringify(nova));
  aplicarCustomizacao(nova);

  erroEl.textContent = 'Salvo!';
  erroEl.classList.add('sucesso');
  return true;
}

function salvarHumor() {
  const humor = document.getElementById('input-humor').value.trim();
  salvarPatchCustomizacao({ humor }, 'humor-erro');
}

function salvarTopFilmes() {
  const top_filmes = [1, 2, 3, 4, 5]
    .map(i => document.getElementById(`top-filme-${i}`).value.trim())
    .filter(Boolean);
  salvarPatchCustomizacao({ top_filmes }, 'top-filmes-erro');
}

function alternarCamposMolduraPersonalizada() {
  const ehPersonalizada = document.getElementById('select-moldura').value === 'personalizada';
  document.getElementById('campos-moldura-personalizada').style.display = ehPersonalizada ? 'block' : 'none';
}

function salvarMoldura() {
  const moldura_avatar = document.getElementById('select-moldura').value;
  const patch = { moldura_avatar };

  if (moldura_avatar === 'personalizada') {
    patch.moldura_cor = document.getElementById('moldura-cor-custom').value;
    patch.moldura_estilo = document.getElementById('moldura-estilo-custom').value;
  }

  salvarPatchCustomizacao(patch, 'moldura-erro');
}

function extrairIdYoutube(url) {
  const match = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function salvarMusica() {
  const url = document.getElementById('input-musica').value.trim();
  const erroEl = document.getElementById('musica-erro');

  if (url && !extrairIdYoutube(url)) {
    erroEl.textContent = 'Não consegui reconhecer esse link do YouTube.';
    erroEl.classList.remove('sucesso');
    return;
  }

  salvarPatchCustomizacao({ musica_url: url }, 'musica-erro');
}

function salvarFonte() {
  const fonte = document.getElementById('select-fonte').value;
  salvarPatchCustomizacao({ fonte }, 'fonte-erro');
}

function salvarCoresTema(tema) {
  const bg = document.getElementById(`cor-bg-${tema}`).value;
  const texto = document.getElementById(`cor-texto-${tema}`).value;

  const cores = { ...(customizacaoAtual.cores || {}) };
  cores[tema] = { bg, texto };

  salvarPatchCustomizacao({ cores }, `cores-${tema}-erro`);
}

// ---- Plano de fundo do site (reaproveita a mesma compressão usada na foto/capa) ----
async function comprimirImagemGenerica(arquivo, tamanhoMax = 1200, qualidade = 0.7) {
  const bitmap = await createImageBitmap(arquivo);

  let { width, height } = bitmap;
  if (width > tamanhoMax || height > tamanhoMax) {
    if (width > height) {
      height = Math.round(height * (tamanhoMax / width));
      width = tamanhoMax;
    } else {
      width = Math.round(width * (tamanhoMax / height));
      height = tamanhoMax;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', qualidade);
  });
}

let bgSitePendente = null;

async function previsualizarBgSite(inputFile) {
  const erroEl = document.getElementById('bg-site-erro');
  erroEl.textContent = '';

  const arquivo = inputFile.files[0];
  if (!arquivo) return;

  if (!arquivo.type.startsWith('image/')) {
    erroEl.textContent = 'Selecione um arquivo de imagem.';
    return;
  }

  if (arquivo.size > 10 * 1024 * 1024) {
    erroEl.textContent = 'Imagem muito grande (máx 10MB antes de comprimir).';
    return;
  }

  bgSitePendente = await comprimirImagemGenerica(arquivo, 1200, 0.7);

  document.getElementById('preview-bg-site').src = URL.createObjectURL(bgSitePendente);
  document.getElementById('preview-bg-area').style.display = 'block';
}

function cancelarBgSite() {
  bgSitePendente = null;
  document.getElementById('preview-bg-area').style.display = 'none';
  document.getElementById('input-bg-site').value = '';
}

async function confirmarBgSite() {
  const erroEl = document.getElementById('bg-site-erro');
  erroEl.textContent = '';

  if (!bgSitePendente) return;

  const caminho = `${usuario.id}-fundo.jpg`;

  const { error: erroUpload } = await supabaseClient
    .storage
    .from('avatars')
    .upload(caminho, bgSitePendente, { upsert: true, contentType: 'image/jpeg' });

  if (erroUpload) {
    erroEl.textContent = 'Erro ao enviar a imagem.';
    return;
  }

  const { data: urlData } = supabaseClient
    .storage
    .from('avatars')
    .getPublicUrl(caminho);

  const bg_imagem_url = `${urlData.publicUrl}?t=${Date.now()}`;

  const ok = await salvarPatchCustomizacao({ bg_imagem_url }, 'bg-site-erro');
  if (ok) cancelarBgSite();
}

function removerBgSite() {
  salvarPatchCustomizacao({ bg_imagem_url: '' }, 'bg-site-erro');
}

carregarCustomizacao();
