const usuario = getUsuarioLogado();
if (!usuario) window.location.href = 'index.html';

async function carregarPerfil() {
  const { data, error } = await supabaseClient
    .from('users')
    .select('nome, bio, foto_url, capa_url, cor_destaque, avatar_emoji, filme_favorito, genero_favorito, streaming_favorito, link_externo, apelido, customizacao')
    .eq('id', usuario.id)
    .single();

  if (error || !data) return;

  const custom = data.customizacao || {};

  document.getElementById('perfil-nome').textContent = data.apelido || data.nome;
  document.getElementById('perfil-bio').value = data.bio || '';
  document.getElementById('editar-nome').value = data.nome;
  document.getElementById('editar-apelido').value = data.apelido || '';
  atualizarContadorBio();

  // Humor
  const humorEl = document.getElementById('perfil-humor');
  humorEl.textContent = custom.humor || '';

  // Moldura do avatar
  const molduraClasses = [
    'moldura-neon', 'moldura-estrelas', 'moldura-gradiente',
    'moldura-fogo', 'moldura-gelo', 'moldura-arcoiris', 'moldura-ouro',
    'moldura-pixel', 'moldura-personalizada'
  ];
  const fotoElMoldura = document.getElementById('perfil-foto');
  const emojiElMoldura = document.getElementById('avatar-emoji-grande');
  fotoElMoldura.classList.remove(...molduraClasses);
  emojiElMoldura.classList.remove(...molduraClasses);
  fotoElMoldura.style.removeProperty('--moldura-cor');
  fotoElMoldura.style.removeProperty('--moldura-estilo');
  emojiElMoldura.style.removeProperty('--moldura-cor');
  emojiElMoldura.style.removeProperty('--moldura-estilo');

  if (custom.moldura_avatar && custom.moldura_avatar !== 'nenhuma') {
    fotoElMoldura.classList.add(`moldura-${custom.moldura_avatar}`);
    emojiElMoldura.classList.add(`moldura-${custom.moldura_avatar}`);

    if (custom.moldura_avatar === 'personalizada') {
      const cor = custom.moldura_cor || '#FF00CC';
      const estilo = custom.moldura_estilo || 'solid';
      [fotoElMoldura, emojiElMoldura].forEach(el => {
        el.style.setProperty('--moldura-cor', cor);
        el.style.setProperty('--moldura-estilo', estilo);
      });
    }
  }

  // Top 5 filmes
  const topFilmes = custom.top_filmes || [];
  const cardTop = document.getElementById('card-top-filmes');
  if (topFilmes.length > 0) {
    cardTop.style.display = 'block';
    document.getElementById('top-filmes-lista').innerHTML = topFilmes.map(f => `<li>${f}</li>`).join('');
  } else {
    cardTop.style.display = 'none';
  }

  // Música de fundo (não toca sozinha, só mostra o botão)
  const playerEl = document.getElementById('player-musica');
  if (custom.musica_url) {
    playerEl.style.display = 'block';
    playerEl.dataset.url = custom.musica_url;
  } else {
    playerEl.style.display = 'none';
  }

  // Capa
  const capaEl = document.getElementById('perfil-capa');
  if (data.capa_url) {
    capaEl.src = data.capa_url;
    capaEl.style.display = 'block';
  } else {
    capaEl.style.display = 'none';
  }

  // Avatar: emoji tem prioridade sobre a foto, se estiver preenchido
  const fotoEl = document.getElementById('perfil-foto');
  const emojiEl = document.getElementById('avatar-emoji-grande');
  if (data.avatar_emoji) {
    emojiEl.textContent = data.avatar_emoji;
    emojiEl.style.display = 'flex';
    fotoEl.style.display = 'none';
  } else {
    emojiEl.style.display = 'none';
    fotoEl.style.display = 'block';
    fotoEl.src = data.foto_url || 'https://placehold.co/150x150?text=Sem+foto';
  }
  document.getElementById('avatar-emoji-input').value = data.avatar_emoji || '';

  // Cor de destaque
  document.getElementById('cor-destaque-input').value = data.cor_destaque || '#000080';
  if (data.cor_destaque) {
    document.documentElement.style.setProperty('--card-titulo-bg', data.cor_destaque);
  }

  // Informações extras
  document.getElementById('input-filme-favorito').value = data.filme_favorito || '';
  document.getElementById('input-genero-favorito').value = data.genero_favorito || '';
  document.getElementById('input-streaming-favorito').value = data.streaming_favorito || '';
  document.getElementById('input-link-externo').value = data.link_externo || '';
  renderizarTagsPerfil(data);
}

function extrairIdYoutubePerfil(url) {
  const match = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

let musicaTocando = false;

function alternarMusica() {
  const playerEl = document.getElementById('player-musica');
  const btn = document.getElementById('btn-tocar-musica');
  const embedEl = document.getElementById('musica-embed');
  const url = playerEl.dataset.url;
  const videoId = extrairIdYoutubePerfil(url || '');

  if (!videoId) return;

  if (!musicaTocando) {
    embedEl.innerHTML = `<iframe width="1" height="1" src="https://www.youtube.com/embed/${videoId}?autoplay=1" allow="autoplay" frameborder="0"></iframe>`;
    btn.textContent = '⏸️ Parar música';
    musicaTocando = true;
  } else {
    embedEl.innerHTML = '';
    btn.textContent = '▶️ Tocar música do perfil';
    musicaTocando = false;
  }
}

function renderizarTagsPerfil(data) {
  const container = document.getElementById('tags-perfil-preview');
  const tags = [];

  if (data.filme_favorito) tags.push(`🎬 ${data.filme_favorito}`);
  if (data.genero_favorito) tags.push(`🎭 ${data.genero_favorito}`);
  if (data.streaming_favorito) tags.push(`📺 ${data.streaming_favorito}`);

  container.innerHTML = tags.map(t => `<span class="tag-perfil">${t}</span>`).join('');

  if (data.link_externo) {
    container.innerHTML += `<a class="link-externo-btn" href="${data.link_externo}" target="_blank" rel="noopener noreferrer">🔗 Ver link externo</a>`;
  }
}

function atualizarContadorBio() {
  const bio = document.getElementById('perfil-bio');
  const contador = document.getElementById('contador-bio');
  const restantes = 200 - bio.value.length;
  contador.textContent = `${restantes} caractere${restantes === 1 ? '' : 's'} restante${restantes === 1 ? '' : 's'}`;
  contador.classList.toggle('contador-alerta', restantes <= 15);
}

async function salvarBio() {
  const bio = document.getElementById('perfil-bio').value.trim();
  const erroEl = document.getElementById('perfil-erro');
  erroEl.textContent = '';

  const { error } = await supabaseClient
    .from('users')
    .update({ bio })
    .eq('id', usuario.id);

  if (error) {
    erroEl.textContent = 'Erro ao salvar bio.';
    return;
  }

  erroEl.textContent = 'Bio salva!';
  erroEl.classList.add('sucesso');
}

async function comprimirImagem(arquivo, tamanhoMax = 300, qualidade = 0.7) {
  const bitmap = await createImageBitmap(arquivo);

  let { width, height } = bitmap;
  if (width > height && width > tamanhoMax) {
    height = Math.round(height * (tamanhoMax / width));
    width = tamanhoMax;
  } else if (height > tamanhoMax) {
    width = Math.round(width * (tamanhoMax / height));
    height = tamanhoMax;
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

let imagemPendente = null; // guarda o blob comprimido até o usuário confirmar

async function previsualizarFoto(inputFile) {
  const erroEl = document.getElementById('perfil-erro');
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

  imagemPendente = await comprimirImagem(arquivo, 300, 0.7);

  const url = URL.createObjectURL(imagemPendente);
  document.getElementById('preview-foto').src = url;
  document.getElementById('preview-foto-area').style.display = 'block';
}

function cancelarNovaFoto() {
  imagemPendente = null;
  document.getElementById('preview-foto-area').style.display = 'none';
  document.getElementById('input-foto').value = '';
}

async function confirmarNovaFoto() {
  const erroEl = document.getElementById('perfil-erro');
  erroEl.textContent = '';

  if (!imagemPendente) return;

  const caminho = `${usuario.id}.jpg`;

  const { error: erroUpload } = await supabaseClient
    .storage
    .from('avatars')
    .upload(caminho, imagemPendente, { upsert: true, contentType: 'image/jpeg' });

  if (erroUpload) {
    erroEl.textContent = 'Erro ao enviar a foto.';
    return;
  }

  const { data: urlData } = supabaseClient
    .storage
    .from('avatars')
    .getPublicUrl(caminho);

  const fotoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const { error: erroUpdate } = await supabaseClient
    .from('users')
    .update({ foto_url: fotoUrl })
    .eq('id', usuario.id);

  if (erroUpdate) {
    erroEl.textContent = 'Foto enviada, mas erro ao salvar no perfil.';
    return;
  }

  document.getElementById('perfil-foto').src = fotoUrl;
  cancelarNovaFoto();
  erroEl.textContent = 'Foto atualizada!';
  erroEl.classList.add('sucesso');
}

let capaPendente = null; // guarda o blob comprimido da capa até confirmar

async function previsualizarCapa(inputFile) {
  const erroEl = document.getElementById('perfil-erro');
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

  capaPendente = await comprimirImagem(arquivo, 800, 0.7);

  const url = URL.createObjectURL(capaPendente);
  document.getElementById('preview-capa').src = url;
  document.getElementById('preview-capa-area').style.display = 'block';
}

function cancelarNovaCapa() {
  capaPendente = null;
  document.getElementById('preview-capa-area').style.display = 'none';
  document.getElementById('input-capa').value = '';
}

async function confirmarNovaCapa() {
  const erroEl = document.getElementById('perfil-erro');
  erroEl.textContent = '';

  if (!capaPendente) return;

  const caminho = `${usuario.id}-capa.jpg`;

  const { error: erroUpload } = await supabaseClient
    .storage
    .from('avatars')
    .upload(caminho, capaPendente, { upsert: true, contentType: 'image/jpeg' });

  if (erroUpload) {
    erroEl.textContent = 'Erro ao enviar a capa.';
    return;
  }

  const { data: urlData } = supabaseClient
    .storage
    .from('avatars')
    .getPublicUrl(caminho);

  const capaUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const { error: erroUpdate } = await supabaseClient
    .from('users')
    .update({ capa_url: capaUrl })
    .eq('id', usuario.id);

  if (erroUpdate) {
    erroEl.textContent = 'Capa enviada, mas erro ao salvar no perfil.';
    return;
  }

  const capaEl = document.getElementById('perfil-capa');
  capaEl.src = capaUrl;
  capaEl.style.display = 'block';
  cancelarNovaCapa();
  erroEl.textContent = 'Capa atualizada!';
  erroEl.classList.add('sucesso');
}

async function salvarAvatarEmoji() {
  const emoji = document.getElementById('avatar-emoji-input').value.trim();
  const erroEl = document.getElementById('perfil-erro');
  erroEl.textContent = '';

  const { error } = await supabaseClient
    .from('users')
    .update({ avatar_emoji: emoji || null })
    .eq('id', usuario.id);

  if (error) {
    erroEl.textContent = 'Erro ao salvar avatar.';
    return;
  }

  const fotoEl = document.getElementById('perfil-foto');
  const emojiEl = document.getElementById('avatar-emoji-grande');
  if (emoji) {
    emojiEl.textContent = emoji;
    emojiEl.style.display = 'flex';
    fotoEl.style.display = 'none';
  } else {
    emojiEl.style.display = 'none';
    fotoEl.style.display = 'block';
  }

  erroEl.textContent = 'Avatar atualizado!';
  erroEl.classList.add('sucesso');
}

function limparAvatarEmoji() {
  document.getElementById('avatar-emoji-input').value = '';
  salvarAvatarEmoji();
}

async function salvarCorDestaque(cor) {
  const erroEl = document.getElementById('perfil-erro');
  erroEl.textContent = '';

  const { error } = await supabaseClient
    .from('users')
    .update({ cor_destaque: cor })
    .eq('id', usuario.id);

  if (error) {
    erroEl.textContent = 'Erro ao salvar cor de destaque.';
    return;
  }

  document.documentElement.style.setProperty('--card-titulo-bg', cor);
  erroEl.textContent = 'Cor de destaque atualizada!';
  erroEl.classList.add('sucesso');
}

function normalizarLink(link) {
  if (!link) return '';
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

async function salvarInfoExtras() {
  const erroEl = document.getElementById('info-extras-erro');
  erroEl.textContent = '';
  erroEl.classList.remove('sucesso');

  const filme_favorito = document.getElementById('input-filme-favorito').value.trim();
  const genero_favorito = document.getElementById('input-genero-favorito').value.trim();
  const streaming_favorito = document.getElementById('input-streaming-favorito').value.trim();
  const link_externo = normalizarLink(document.getElementById('input-link-externo').value.trim());

  const { error } = await supabaseClient
    .from('users')
    .update({ filme_favorito, genero_favorito, streaming_favorito, link_externo })
    .eq('id', usuario.id);

  if (error) {
    erroEl.textContent = 'Erro ao salvar informações.';
    return;
  }

  document.getElementById('input-link-externo').value = link_externo;
  renderizarTagsPerfil({ filme_favorito, genero_favorito, streaming_favorito, link_externo });
  erroEl.textContent = 'Informações salvas!';
  erroEl.classList.add('sucesso');
}

async function editarApelido() {
  const apelido = document.getElementById('editar-apelido').value.trim();
  const erroEl = document.getElementById('editar-apelido-erro');
  erroEl.textContent = '';
  erroEl.classList.remove('sucesso');

  const { error } = await supabaseClient
    .from('users')
    .update({ apelido: apelido || null })
    .eq('id', usuario.id);

  if (error) {
    erroEl.textContent = 'Erro ao salvar apelido.';
    return;
  }

  document.getElementById('perfil-nome').textContent = apelido || usuario.nome;
  erroEl.textContent = 'Apelido atualizado!';
  erroEl.classList.add('sucesso');
}

async function editarNomeUsuario() {
  const novoNome = document.getElementById('editar-nome').value.trim();
  const erroEl = document.getElementById('editar-nome-erro');
  erroEl.textContent = '';
  erroEl.classList.remove('sucesso');

  if (!novoNome) {
    erroEl.textContent = 'O nome não pode ficar vazio.';
    return;
  }

  if (novoNome === usuario.nome) return;

  const { error } = await supabaseClient
    .from('users')
    .update({ nome: novoNome })
    .eq('id', usuario.id);

  if (error) {
    erroEl.textContent = error.code === '23505'
      ? 'Esse nome já está em uso por outra pessoa.'
      : 'Erro ao atualizar nome.';
    return;
  }

  // Atualiza o nome guardado na sessão local (usado em todas as páginas)
  usuario.nome = novoNome;
  salvarSessaoUsuario(usuario);

  document.getElementById('perfil-nome').textContent = novoNome;
  erroEl.textContent = 'Nome atualizado!';
  erroEl.classList.add('sucesso');
}

async function editarSenhaUsuario() {
  const senhaAtual = document.getElementById('senha-atual').value;
  const senhaNova = document.getElementById('senha-nova').value;
  const erroEl = document.getElementById('editar-senha-erro');
  erroEl.textContent = '';
  erroEl.classList.remove('sucesso');

  if (!senhaAtual || !senhaNova) {
    erroEl.textContent = 'Preencha a senha atual e a nova senha.';
    return;
  }

  if (senhaNova.length < 4) {
    erroEl.textContent = 'A nova senha precisa ter pelo menos 4 caracteres.';
    return;
  }

  const hashAtual = await hashSenha(senhaAtual);

  // Confere se a senha atual bate antes de trocar
  const { data: conferido } = await supabaseClient
    .from('users')
    .select('id')
    .eq('id', usuario.id)
    .eq('senha_hash', hashAtual)
    .single();

  if (!conferido) {
    erroEl.textContent = 'Senha atual incorreta.';
    return;
  }

  const hashNova = await hashSenha(senhaNova);

  const { error } = await supabaseClient
    .from('users')
    .update({ senha_hash: hashNova })
    .eq('id', usuario.id);

  if (error) {
    erroEl.textContent = 'Erro ao atualizar senha.';
    return;
  }

  document.getElementById('senha-atual').value = '';
  document.getElementById('senha-nova').value = '';
  erroEl.textContent = 'Senha atualizada!';
  erroEl.classList.add('sucesso');
}

carregarPerfil();