const usuario = getUsuarioLogado();
if (!usuario) window.location.href = 'index.html';

async function carregarGrupos() {
  // Pega os ids dos grupos que o usuário participa
  const { data: memberships } = await supabaseClient
    .from('group_members')
    .select('group_id')
    .eq('user_id', usuario.id);

  const groupIds = (memberships || []).map(m => m.group_id);
  if (groupIds.length === 0) {
    document.getElementById('lista-grupos').innerHTML = '<p>Você ainda não participa de nenhum grupo.</p>';
    return;
  }

  const { data: grupos } = await supabaseClient
    .from('groups')
    .select('*')
    .in('id', groupIds);

  const container = document.getElementById('lista-grupos');
  container.innerHTML = '';

  for (const grupo of grupos) {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
        <h3>${grupo.nome}</h3>
        <div id="membros-${grupo.id}"><em>Carregando membros...</em></div>
        <div class="convidar">
            <input type="text" placeholder="Nome do amigo" id="convite-${grupo.id}">
            <button onclick="convidarMembro('${grupo.id}')">Adicionar ao grupo</button>
            <p class="erro" id="convite-erro-${grupo.id}"></p>
        </div>
        <div id="sessoes-${grupo.id}">Carregando sessões...</div>
        <div class="nova-sessao">
            <input type="text" placeholder="Título da sessão (ex: Noite 02/08)" id="titulo-${grupo.id}">
            <button onclick="criarSessao('${grupo.id}')">Nova sessão</button>
        </div>
        <details>
            <summary>📜 Histórico de vencedores</summary>
            <div id="historico-${grupo.id}">Carregando...</div>
        </details>
        `;
    container.appendChild(div);
    carregarMembrosDoGrupo(grupo.id);
    carregarSessoesDoGrupo(grupo.id);
    carregarHistoricoDoGrupo(grupo.id);
  }
}

async function carregarSessoesDoGrupo(groupId) {
  const { data: sessoes } = await supabaseClient
    .from('sessions')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });

  const el = document.getElementById(`sessoes-${groupId}`);
  if (!sessoes || sessoes.length === 0) {
    el.innerHTML = '<p><em>Nenhuma sessão ainda.</em></p>';
    return;
  }

  el.innerHTML = sessoes.map(s => `
    <div class="sessao-item">
      <a href="sessao.html?id=${s.id}">${s.titulo}</a>
      <span class="status ${s.status}">${s.status}</span>
    </div>
  `).join('');
}

async function criarGrupo() {
  const nome = document.getElementById('novo-grupo-nome').value.trim();
  if (!nome) return;

  const { data: grupo, error } = await supabaseClient
    .from('groups')
    .insert([{ nome, criado_por: usuario.id }])
    .select()
    .single();

  if (error) return alert('Erro ao criar grupo.');

  // Adiciona quem criou como primeiro membro
  await supabaseClient.from('group_members').insert([
    { group_id: grupo.id, user_id: usuario.id }
  ]);

  document.getElementById('novo-grupo-nome').value = '';
  carregarGrupos();
}

async function criarSessao(groupId) {
  const input = document.getElementById(`titulo-${groupId}`);
  const titulo = input.value.trim();
  if (!titulo) return;

  await supabaseClient.from('sessions').insert([
    { group_id: groupId, titulo, status: 'aberta' }
  ]);

  input.value = '';
  carregarSessoesDoGrupo(groupId);
}

async function carregarMembrosDoGrupo(groupId) {
  const { data: memberships } = await supabaseClient
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  const userIds = (memberships || []).map(m => m.user_id);
  const { data: membros } = await supabaseClient
    .from('users')
    .select('nome')
    .in('id', userIds);

  const el = document.getElementById(`membros-${groupId}`);
  el.innerHTML = '<strong>Membros:</strong> ' +
    (membros || []).map(m => m.nome).join(', ');
}

async function convidarMembro(groupId) {
  const input = document.getElementById(`convite-${groupId}`);
  const erroEl = document.getElementById(`convite-erro-${groupId}`);
  const nomeAmigo = input.value.trim();
  erroEl.textContent = '';

  if (!nomeAmigo) return;

  // Busca o amigo pelo nome
  const { data: amigo, error: erroAmigo } = await supabaseClient
    .from('users')
    .select('id')
    .eq('nome', nomeAmigo)
    .single();

  if (erroAmigo || !amigo) {
    erroEl.textContent = 'Não existe usuário com esse nome (ele precisa ter criado conta antes).';
    return;
  }

  const { error: erroInsert } = await supabaseClient
    .from('group_members')
    .insert([{ group_id: groupId, user_id: amigo.id }]);

  if (erroInsert) {
    erroEl.textContent = erroInsert.code === '23505'
      ? 'Esse amigo já está no grupo.'
      : 'Erro ao adicionar amigo.';
    return;
  }

  input.value = '';
  carregarMembrosDoGrupo(groupId);
}

async function limparDados() {
  const confirmacao = confirm(
    'Isso vai apagar TODOS os grupos, sessões, filmes e votos (de todos os usuários). Os usuários e senhas continuam intactos. Confirma?'
  );
  if (!confirmacao) return;

  // Apaga na ordem certa por causa das foreign keys
  await supabaseClient.from('votes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseClient.from('movies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseClient.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseClient.from('group_members').delete().neq('group_id', '00000000-0000-0000-0000-000000000000');
  await supabaseClient.from('groups').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  alert('Dados de teste limpos! Usuários mantidos.');
  carregarGrupos();
}

async function carregarHistoricoDoGrupo(groupId) {
  const { data: sessoesFechadas } = await supabaseClient
    .from('sessions')
    .select('id, titulo, data_sessao')
    .eq('group_id', groupId)
    .eq('status', 'fechada')
    .order('created_at', { ascending: false });

  const el = document.getElementById(`historico-${groupId}`);
  if (!sessoesFechadas || sessoesFechadas.length === 0) {
    el.innerHTML = '<p><em>Nenhuma sessão fechada ainda.</em></p>';
    return;
  }

  const linhas = [];
  for (const sessao of sessoesFechadas) {
    const { data: filmes } = await supabaseClient
      .from('movies')
      .select('id, titulo')
      .eq('session_id', sessao.id);

    const { data: votos } = await supabaseClient
      .from('votes')
      .select('movie_id')
      .eq('session_id', sessao.id);

    const contagem = {};
    (votos || []).forEach(v => { contagem[v.movie_id] = (contagem[v.movie_id] || 0) + 1; });

    let vencedor = null;
    if (filmes && filmes.length > 0) {
      vencedor = filmes.reduce((a, b) => (contagem[a.id] || 0) >= (contagem[b.id] || 0) ? a : b);
    }

    linhas.push(`
      <div class="historico-item">
        <strong>${sessao.titulo}</strong> —
        🏆 ${vencedor ? vencedor.titulo : 'sem filmes'}
        (${contagem[vencedor?.id] || 0} votos)
      </div>
    `);
  }

  el.innerHTML = linhas.join('');
}

carregarGrupos();