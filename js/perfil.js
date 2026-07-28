const usuario = getUsuarioLogado();
if (!usuario) window.location.href = 'index.html';

async function carregarPerfil() {
  const { data, error } = await supabaseClient
    .from('users')
    .select('nome, bio, foto_url')
    .eq('id', usuario.id)
    .single();

  if (error || !data) return;

  document.getElementById('perfil-nome').textContent = data.nome;
  document.getElementById('perfil-bio').value = data.bio || '';

  const fotoEl = document.getElementById('perfil-foto');
  fotoEl.src = data.foto_url || 'https://placehold.co/150x150?text=Sem+foto';
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

async function trocarFoto(inputFile) {
  const erroEl = document.getElementById('perfil-erro');
  erroEl.textContent = '';

  const arquivo = inputFile.files[0];
  if (!arquivo) return;

  if (!arquivo.type.startsWith('image/')) {
    erroEl.textContent = 'Selecione um arquivo de imagem.';
    return;
  }

  if (arquivo.size > 3 * 1024 * 1024) {
    erroEl.textContent = 'Imagem muito grande (máx 3MB).';
    return;
  }

  // Nome fixo por usuário, assim a foto nova sempre sobrescreve a antiga
  const extensao = arquivo.name.split('.').pop();
  const caminho = `${usuario.id}.${extensao}`;

  const { error: erroUpload } = await supabaseClient
    .storage
    .from('avatars')
    .upload(caminho, arquivo, { upsert: true });

  if (erroUpload) {
    erroEl.textContent = 'Erro ao enviar a foto.';
    return;
  }

  const { data: urlData } = supabaseClient
    .storage
    .from('avatars')
    .getPublicUrl(caminho);

  // Adiciona um timestamp na URL pra "furar" o cache do navegador
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
  erroEl.textContent = 'Foto atualizada!';
  erroEl.classList.add('sucesso');
}

carregarPerfil();