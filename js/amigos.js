const usuario = getUsuarioLogado();
if (!usuario) window.location.href = 'index.html';

async function adicionarAmigo(nomeAmigo) {
  const erroEl = document.getElementById('amigo-erro');
  erroEl.textContent = '';

  if (!nomeAmigo || nomeAmigo.trim() === '') {
    erroEl.textContent = 'Digite um nome de usuário.';
    return;
  }

  const nome = nomeAmigo.trim();

  if (nome.toLowerCase() === usuario.nome.toLowerCase()) {
    erroEl.textContent = 'Você não pode adicionar a si mesmo.';
    return;
  }

  // Acha o usuário pelo nome
  const { data: alvo, error: erroAlvo } = await supabaseClient
    .from('users')
    .select('id, nome')
    .ilike('nome', nome)
    .single();

  if (erroAlvo || !alvo) {
    erroEl.textContent = 'Usuário não encontrado.';
    return;
  }

  // Já é amigo? (checa os dois sentidos)
  const { data: existente } = await supabaseClient
    .from('friendships')
    .select('id')
    .or(`and(user_id.eq.${usuario.id},amigo_id.eq.${alvo.id}),and(user_id.eq.${alvo.id},amigo_id.eq.${usuario.id})`);

  if (existente && existente.length > 0) {
    erroEl.textContent = 'Vocês já são amigos.';
    return;
  }

  const { error } = await supabaseClient
    .from('friendships')
    .insert([{ user_id: usuario.id, amigo_id: alvo.id }]);

  if (error) {
    erroEl.textContent = 'Erro ao adicionar amigo.';
    return;
  }

  carregarAmigos();
}

async function removerAmizade(amigoId, nomeAmigo) {
  if (!confirm(`Desfazer amizade com ${nomeAmigo}?`)) return;

  // Apaga a linha, seja qual for o sentido em que ela foi criada
  await supabaseClient
    .from('friendships')
    .delete()
    .or(`and(user_id.eq.${usuario.id},amigo_id.eq.${amigoId}),and(user_id.eq.${amigoId},amigo_id.eq.${usuario.id})`);

  carregarAmigos();
}

async function carregarAmigos() {
  const lista = document.getElementById('lista-amigos');
  lista.innerHTML = 'Carregando...';

  const { data: comoUser } = await supabaseClient
    .from('friendships')
    .select('amigo_id, users:amigo_id(id, nome)')
    .eq('user_id', usuario.id);

  const { data: comoAmigo } = await supabaseClient
    .from('friendships')
    .select('user_id, users:user_id(id, nome)')
    .eq('amigo_id', usuario.id);

  const todos = [
    ...(comoUser || []).map(f => f.users),
    ...(comoAmigo || []).map(f => f.users)
  ];

  // Remove duplicatas (caso exista amizade nos dois sentidos)
  const unicos = Array.from(new Map(todos.map(u => [u.id, u])).values());

  if (unicos.length === 0) {
    lista.innerHTML = '<p><em>Você ainda não tem amigos adicionados.</em></p>';
    return;
  }

  lista.innerHTML = unicos.map(u => `
    <div class="amigo-item">
      <span><a href="perfil.html?id=${u.id}">${u.nome}</a></span>
      <button class="btn-perigo" onclick="removerAmizade('${u.id}', '${u.nome.replace(/'/g, "\\'")}')">Desfazer amizade</button>
    </div>
  `).join('');
}

carregarAmigos();