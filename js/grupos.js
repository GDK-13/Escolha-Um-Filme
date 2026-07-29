const usuario = getUsuarioLogado();
if (!usuario) window.location.href = 'index.html';

document.getElementById('saudacao-usuario').textContent = '👋 ' + (usuario.nome || 'Visitante');

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

  carregarAvisoVotacoes(groupIds);

  const { data: grupos } = await supabaseClient
    .from('groups')
    .select('*')
    .in('id', groupIds);

  const container = document.getElementById('lista-grupos');
  container.innerHTML = '';

  for (const grupo of grupos) {
    const souCriador = grupo.criado_por === usuario.id;
    const colapsado = localStorage.getItem(`grupo-colapsado-${grupo.id}`) === '1';
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
        <div class="cabecalho-grupo">
          <div class="cabecalho-grupo-titulo">
            <button class="btn-colapsar" onclick="alternarGrupo('${grupo.id}')" id="toggle-${grupo.id}">${colapsado ? '▶' : '▼'}</button>
            <h3 id="nome-grupo-${grupo.id}">${grupo.nome}</h3>
          </div>
          <div class="acoes-grupo">
            ${souCriador
              ? `<button onclick="editarNomeGrupo('${grupo.id}', '${grupo.nome.replace(/'/g, "\\\\'")}')">Renomear</button>
                 <button class="btn-perigo" onclick="excluirGrupo('${grupo.id}')">Excluir grupo</button>`
              : `<button class="btn-perigo" onclick="sairDoGrupo('${grupo.id}')">Sair do grupo</button>`
            }
          </div>
        </div>
        <div class="corpo-grupo ${colapsado ? 'colapsado' : ''}" id="corpo-${grupo.id}">
          <div id="membros-${grupo.id}"><em>Carregando membros...</em></div>
          <div class="convidar">
              <div class="autocomplete-wrapper">
                <input type="text" placeholder="Nome do amigo" id="convite-${grupo.id}" oninput="autocompletarAmigo('${grupo.id}', this.value)" onfocus="autocompletarAmigo('${grupo.id}', this.value)" autocomplete="off">
                <div class="autocomplete-dropdown" id="autocomplete-${grupo.id}"></div>
              </div>
              <button onclick="convidarMembro('${grupo.id}')">Adicionar ao grupo</button>
              <p class="erro" id="convite-erro-${grupo.id}"></p>
          </div>
          <div id="sessoes-${grupo.id}">Carregando sessões...</div>
          <div class="nova-sessao">
              <input type="text" placeholder="Título da sessão (ex: Noite 02/08)" id="titulo-${grupo.id}">
              <input type="date" id="data-${grupo.id}">
              <input type="time" id="horario-${grupo.id}">
              <input type="text" placeholder="Local (ex: casa do João, streaming)" id="local-${grupo.id}">
              <button onclick="criarSessao('${grupo.id}')">Nova sessão</button>
          </div>
          <details>
              <summary>Histórico de vencedores</summary>
              <div id="historico-${grupo.id}">Carregando...</div>
          </details>
        </div>
        `;
    container.appendChild(div);
    carregarMembrosDoGrupo(grupo.id);
    carregarSessoesDoGrupo(grupo.id);
    carregarHistoricoDoGrupo(grupo.id);
  }
}

// ---- Autocomplete de amigos ----
async function autocompletarAmigo(groupId, termo) {
  const dropdown = document.getElementById(`autocomplete-${groupId}`);
  if (!termo || termo.trim().length === 0) {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    return;
  }

  const amigos = await buscarAmigosComFoto();
  const termoLower = termo.toLowerCase();
  const filtrados = amigos.filter(a => a.nome.toLowerCase().includes(termoLower));

  if (filtrados.length === 0) {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
    return;
  }

  dropdown.innerHTML = filtrados.map(a => `
    <div class="autocomplete-item" onclick="selecionarAmigo('${groupId}', '${a.nome.replace(/'/g, "\\\\'")}')">
      ${renderAvatarMini(a.foto_url)}
      <span>${destacarMatch(a.nome, termo)}</span>
    </div>
  `).join('');
  dropdown.style.display = 'block';
}

function destacarMatch(nome, termo) {
  const idx = nome.toLowerCase().indexOf(termo.toLowerCase());
  if (idx === -1) return nome;
  return nome.substring(0, idx) +
    '<strong>' + nome.substring(idx, idx + termo.length) + '</strong>' +
    nome.substring(idx + termo.length);
}

function selecionarAmigo(groupId, nomeAmigo) {
  const input = document.getElementById(`convite-${groupId}`);
  input.value = nomeAmigo;
  const dropdown = document.getElementById(`autocomplete-${groupId}`);
  dropdown.style.display = 'none';
  dropdown.innerHTML = '';
}

// Fecha o dropdown ao clicar fora
function fecharAutocompleteGroupId(groupId) {
  const dropdown = document.getElementById(`autocomplete-${groupId}`);
  if (dropdown) dropdown.style.display = 'none';
}

function fecharTodosAutocomplete(e) {
  document.querySelectorAll('.autocomplete-dropdown').forEach(d => {
    if (!d.parentElement.contains(e.target)) {
      d.style.display = 'none';
    }
  });
}

async function carregarAvisoVotacoes(groupIds) {
  const { data: sessoesAbertas } = await supabaseClient
    .from('sessions')
    .select('id')
    .in('group_id', groupIds)
    .eq('status', 'aberta');

  const el = document.getElementById('aviso-votacoes');
  if (!sessoesAbertas || sessoesAbertas.length === 0) {
    el.style.display = 'none';
    return;
  }

  const sessionIds = sessoesAbertas.map(s => s.id);
  const { data: meusVotos } = await supabaseClient
    .from('votes')
    .select('session_id')
    .eq('user_id', usuario.id)
    .in('session_id', sessionIds);

  const jaVotei = new Set((meusVotos || []).map(v => v.session_id));
  const pendentes = sessionIds.filter(id => !jaVotei.has(id)).length;

  if (pendentes === 0) {
    el.style.display = 'none';
    return;
  }

  el.textContent = pendentes === 1
    ? 'Você tem 1 sessão aberta aguardando seu voto!'
    : `Você tem ${pendentes} sessões abertas aguardando seu voto!`;
  el.style.display = 'block';
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

  el.innerHTML = sessoes.map(s => {
    const souCriador = s.criado_por === usuario.id;
    const detalhes = [
      s.data_sessao ? new Date(s.data_sessao + 'T00:00:00').toLocaleDateString('pt-BR') : null,
      s.horario || null,
      s.local || null
    ].filter(Boolean).join(' · ');

    return `
    <div class="sessao-item">
      <div>
        <a href="sessao.html?id=${s.id}">${s.titulo}</a>
        <span class="status ${s.status}">${s.status}</span>
        ${detalhes ? `<div class="detalhes-sessao">${detalhes}</div>` : ''}
      </div>
      ${souCriador ? `
        <button onclick="editarTituloSessao('${s.id}', '${groupId}', '${s.titulo.replace(/'/g, "\\\\'")}')">Editar</button>
        <button class="btn-perigo" onclick="excluirSessao('${s.id}', '${groupId}')">Excluir</button>
      ` : ''}
    </div>
  `;
  }).join('');
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

  const data_sessao = document.getElementById(`data-${groupId}`).value || null;
  const horario = document.getElementById(`horario-${groupId}`).value || null;
  const local = document.getElementById(`local-${groupId}`).value.trim() || null;

  await supabaseClient.from('sessions').insert([
    { group_id: groupId, titulo, status: 'aberta', criado_por: usuario.id, data_sessao, horario, local }
  ]);

  input.value = '';
  document.getElementById(`data-${groupId}`).value = '';
  document.getElementById(`horario-${groupId}`).value = '';
  document.getElementById(`local-${groupId}`).value = '';
  carregarSessoesDoGrupo(groupId);
}

async function carregarMembrosDoGrupo(groupId) {
  const { data: grupo } = await supabaseClient
    .from('groups')
    .select('criado_por')
    .eq('id', groupId)
    .single();

  const souCriadorDoGrupo = grupo && grupo.criado_por === usuario.id;

  const { data: memberships } = await supabaseClient
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  const userIds = (memberships || []).map(m => m.user_id);
  const { data: membros } = await supabaseClient
    .from('users')
    .select('id, nome, foto_url')
    .in('id', userIds);

  const el = document.getElementById(`membros-${groupId}`);
  el.innerHTML = '<strong>Membros:</strong> ' +
    (membros || []).map(m => {
      const ehCriador = m.id === (grupo && grupo.criado_por);
      const podeRemover = souCriadorDoGrupo && !ehCriador;
      const avatarHtml = renderAvatarMini(m.foto_url);
      const nomeEsc = m.nome.replace(/'/g, "\\'");
      return '<span class="membro-item">' + avatarHtml + ' ' + m.nome + (ehCriador ? ' (dono)' : '') + (podeRemover
          ? ' <button class="btn-perigo btn-mini" onclick="removerMembro(\'' + groupId + '\', \'' + m.id + '\', \'' + nomeEsc + '\')">remover</button>'
          : '') + '</span>';
    }).join(', ');
}

async function removerMembro(groupId, userId, nomeMembro) {
  if (!confirm(`Remover ${nomeMembro} do grupo?`)) return;

  const { data: grupo } = await supabaseClient
    .from('groups')
    .select('criado_por')
    .eq('id', groupId)
    .single();

  if (!grupo || grupo.criado_por !== usuario.id) {
    alert('Só quem criou o grupo pode remover membros.');
    return;
  }

  if (userId === grupo.criado_por) {
    alert('O criador do grupo não pode ser removido. Exclua o grupo se quiser encerrá-lo.');
    return;
  }

  const { error } = await supabaseClient
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);

  if (error) {
    alert('Erro ao remover membro.');
    return;
  }

  carregarMembrosDoGrupo(groupId);
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
        Vencedor: ${vencedor ? vencedor.titulo : 'sem filmes'}
        (${contagem[vencedor?.id] || 0} votos)
      </div>
    `);
  }

  el.innerHTML = linhas.join('');
}

async function sairDoGrupo(groupId) {
  const { data: grupo } = await supabaseClient
    .from('groups')
    .select('criado_por')
    .eq('id', groupId)
    .single();

  if (grupo && grupo.criado_por === usuario.id) {
    alert('Você é o criador desse grupo e não pode sair dele. Exclua o grupo se quiser encerrá-lo.');
    return;
  }

  if (!confirm('Tem certeza que quer sair desse grupo? Você vai perder acesso às sessões dele.')) return;

  const { error } = await supabaseClient
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', usuario.id);

  if (error) {
    alert('Erro ao sair do grupo.');
    return;
  }

  carregarGrupos();
}

async function excluirGrupo(groupId) {
  if (!confirm('Isso vai excluir o grupo, todas as sessões, filmes e votos dele PARA SEMPRE. Confirma?')) return;

  const { data: grupo } = await supabaseClient
    .from('groups')
    .select('criado_por')
    .eq('id', groupId)
    .single();

  if (!grupo || grupo.criado_por !== usuario.id) {
    alert('Só quem criou o grupo pode excluí-lo.');
    return;
  }

  const { error } = await supabaseClient
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) {
    alert('Erro ao excluir grupo.');
    return;
  }

  carregarGrupos();
}

async function editarNomeGrupo(groupId, nomeAtual) {
  const novoNome = prompt('Novo nome do grupo:', nomeAtual);
  if (!novoNome || !novoNome.trim() || novoNome.trim() === nomeAtual) return;

  const { error } = await supabaseClient
    .from('groups')
    .update({ nome: novoNome.trim() })
    .eq('id', groupId)
    .eq('criado_por', usuario.id);

  if (error) {
    alert('Erro ao renomear grupo.');
    return;
  }

  carregarGrupos();
}

async function excluirSessao(sessionId, groupId) {
  if (!confirm('Isso vai excluir a sessão, os filmes sugeridos e os votos dela PARA SEMPRE. Confirma?')) return;

  const { data: sessao } = await supabaseClient
    .from('sessions')
    .select('criado_por')
    .eq('id', sessionId)
    .single();

  if (!sessao || sessao.criado_por !== usuario.id) {
    alert('Só quem criou a sessão pode excluí-la.');
    return;
  }

  const { error } = await supabaseClient
    .from('sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    alert('Erro ao excluir sessão.');
    return;
  }

  carregarSessoesDoGrupo(groupId);
  carregarHistoricoDoGrupo(groupId);
}

async function editarTituloSessao(sessionId, groupId, tituloAtual) {
  const novoTitulo = prompt('Novo título da sessão:', tituloAtual);
  if (!novoTitulo || !novoTitulo.trim() || novoTitulo.trim() === tituloAtual) return;

  const { error } = await supabaseClient
    .from('sessions')
    .update({ titulo: novoTitulo.trim() })
    .eq('id', sessionId)
    .eq('criado_por', usuario.id);

  if (error) {
    alert('Erro ao renomear sessão.');
    return;
  }

  carregarSessoesDoGrupo(groupId);
}

function alternarGrupo(groupId) {
  const corpo = document.getElementById(`corpo-${groupId}`);
  const toggleBtn = document.getElementById(`toggle-${groupId}`);
  const agoraColapsado = corpo.classList.toggle('colapsado');
  toggleBtn.textContent = agoraColapsado ? '▶' : '▼';
  localStorage.setItem(`grupo-colapsado-${groupId}`, agoraColapsado ? '1' : '0');
}

// Fecha dropdowns de autocomplete ao clicar fora
document.addEventListener('click', fecharTodosAutocomplete);

carregarGrupos();
