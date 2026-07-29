const usuario = getUsuarioLogado();
if (!usuario) window.location.href = 'index.html';
let filmeEmEdicao = null;

document.getElementById('saudacao-usuario').textContent = '👋 ' + (usuario.nome || 'Visitante');

const params = new URLSearchParams(window.location.search);
const sessionId = params.get('id');

let sessaoAtual = null;

async function carregarSessao() {
  const { data: sessao } = await supabaseClient
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  sessaoAtual = sessao;

  document.getElementById('sessao-titulo').textContent =
    `${sessao.titulo} (${sessao.status})`;

  const detalhes = [
    sessao.data_sessao ? new Date(sessao.data_sessao + 'T00:00:00').toLocaleDateString('pt-BR') : null,
    sessao.horario || null,
    sessao.local || null
  ].filter(Boolean).join(' · ');
  document.getElementById('sessao-detalhes').textContent = detalhes;

  document.getElementById('btn-fechar').style.display =
    sessao.status === 'fechada' ? 'none' : 'inline-block';

  document.getElementById('card-dono-sessao').style.display =
    sessao.criado_por === usuario.id ? 'block' : 'none';

  carregarFilmes(sessao.status);
}

function abrirCardEdicaoSessao() {
  if (!sessaoAtual) return;
  // Preenche os campos com os dados atuais
  document.getElementById('edit-sessao-titulo').value = sessaoAtual.titulo || '';
  document.getElementById('edit-sessao-data').value = sessaoAtual.data_sessao || '';
  document.getElementById('edit-sessao-horario').value = sessaoAtual.horario || '';
  document.getElementById('edit-sessao-local').value = sessaoAtual.local || '';

  // Esconde os botões normais e mostra o form
  document.getElementById('card-dono-sessao').style.display = 'none';
  document.getElementById('card-editar-sessao').style.display = 'block';
}

function fecharCardEdicaoSessao() {
  document.getElementById('card-editar-sessao').style.display = 'none';
  document.getElementById('card-dono-sessao').style.display = 'block';
}

async function salvarEdicaoSessao() {
  const novoTitulo = document.getElementById('edit-sessao-titulo').value.trim();
  const novaData = document.getElementById('edit-sessao-data').value || null;
  const novoHorario = document.getElementById('edit-sessao-horario').value || null;
  const novoLocal = document.getElementById('edit-sessao-local').value.trim() || null;

  if (!novoTitulo) {
    alert('O título não pode ficar vazio.');
    return;
  }

  const { error } = await supabaseClient
    .from('sessions')
    .update({ titulo: novoTitulo, data_sessao: novaData, horario: novoHorario, local: novoLocal })
    .eq('id', sessionId)
    .eq('criado_por', usuario.id);

  if (error) { alert('Erro ao atualizar sessão.'); return; }

  fecharCardEdicaoSessao();
  carregarSessao();
}

async function excluirSessaoAtual() {
  if (!sessaoAtual) return;
  if (!confirm('Isso vai excluir a sessão, os filmes sugeridos e os votos dela PARA SEMPRE. Confirma?')) return;

  const { error } = await supabaseClient
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('criado_por', usuario.id);

  if (error) {
    alert('Erro ao excluir sessão.');
    return;
  }

  window.location.href = `grupos.html`;
}

async function carregarFilmes(statusSessao) {
  const { data: filmes } = await supabaseClient
    .from('movies')
    .select('*')
    .eq('session_id', sessionId);

  const { data: votos } = await supabaseClient
    .from('votes')
    .select('*')
    .eq('session_id', sessionId);

  const meuVoto = (votos || []).find(v => v.user_id === usuario.id);
  const contagem = {};
  (votos || []).forEach(v => {
    contagem[v.movie_id] = (contagem[v.movie_id] || 0) + 1;
  });

  // Descobre o(s) vencedor(es) — pode dar empate entre vários filmes
  let vencedoresIds = new Set();
  if (statusSessao === 'fechada' && filmes.length > 0) {
    const maxVotos = Math.max(...filmes.map(f => contagem[f.id] || 0));
    if (maxVotos > 0) {
      filmes.filter(f => (contagem[f.id] || 0) === maxVotos).forEach(f => vencedoresIds.add(f.id));
    }
  }

  const avisoEl = document.getElementById('aviso-empate');
  if (avisoEl) {
    avisoEl.style.display = vencedoresIds.size > 1 ? 'block' : 'none';
  }

  const container = document.getElementById('lista-filmes');

  if (filmes.length === 0) {
    container.innerHTML = '<p><em>Nenhum filme sugerido ainda.</em></p>';
    return;
  }

  container.innerHTML = filmes.map(filme => {
    const votosDoFilme = contagem[filme.id] || 0;
    const jaVoteiAqui = meuVoto && meuVoto.movie_id === filme.id;
    const ehVencedor = vencedoresIds.has(filme.id);
    const possoEditar = statusSessao === 'aberta' &&
      (filme.sugerido_por === usuario.id || (sessaoAtual && sessaoAtual.criado_por === usuario.id));

    let textoBotaoVoto = 'Votar';
    if (jaVoteiAqui) textoBotaoVoto = 'Seu voto atual';
    else if (meuVoto) textoBotaoVoto = 'Trocar voto pra cá';

    return `
        <div class="card filme ${ehVencedor ? 'vencedor' : ''}">
            ${filme.poster_url ? `<img src="${filme.poster_url}" class="poster" alt="${filme.titulo}">` : ''}
            
            ${filmeEmEdicao === filme.id ? `
              <!-- Modo Edição -->
              <input type="text" id="edit-filme-${filme.id}" value="${filme.titulo.replace(/"/g, '&quot;')}" style="margin-bottom: 8px;">
              <div>
                <button onclick="salvarEdicaoFilme('${filme.id}')">Salvar</button>
                <button class="btn-perigo" onclick="cancelarEdicaoFilme()">Cancelar</button>
              </div>
            ` : `
              <!-- Modo Visualização -->
              <h3>${filme.titulo} ${ehVencedor ? '(vencedor)' : ''}</h3>
              <p>${votosDoFilme} voto(s)</p>
              ${statusSessao === 'aberta' ? `
              <button ${jaVoteiAqui ? 'disabled' : ''} onclick="votar('${filme.id}')">
                  ${textoBotaoVoto}
              </button>
              ` : ''}
              ${possoEditar ? `
              <button onclick="abrirEdicaoFilme('${filme.id}')">Editar</button>
              <button class="btn-perigo" onclick="removerFilme('${filme.id}')">Excluir</button>
              ` : ''}
            `}
        </div>
    `;
  }).join('');
}

function abrirEdicaoFilme(movieId) {
  filmeEmEdicao = movieId;
  carregarFilmes(sessaoAtual.status);
}

function cancelarEdicaoFilme() {
  filmeEmEdicao = null;
  carregarFilmes(sessaoAtual.status);
}

async function salvarEdicaoFilme(movieId) {
  const input = document.getElementById(`edit-filme-${movieId}`);
  const novoTitulo = input.value.trim();
  if (!novoTitulo) return cancelarEdicaoFilme();

  const { data: existentes } = await supabaseClient
    .from('movies').select('id, titulo').eq('session_id', sessionId);
  
  const jaExiste = (existentes || []).some(
    m => m.id !== movieId && m.titulo.toLowerCase() === novoTitulo.toLowerCase()
  );
  if (jaExiste) { alert('Já existe um filme com esse título nessa sessão.'); return; }

  const { error } = await supabaseClient.from('movies').update({ titulo: novoTitulo }).eq('id', movieId);
  if (error) { alert('Erro ao editar filme.'); return; }

  filmeEmEdicao = null;
  carregarSessao();
}

async function removerFilme(movieId) {
  if (!confirm('Remover esse filme sugerido? Os votos nele também serão apagados.')) return;

  const { error } = await supabaseClient
    .from('movies')
    .delete()
    .eq('id', movieId);

  if (error) { alert('Erro ao remover filme.'); return; }
  carregarSessao();
}

async function sugerirFilme() {
  const input = document.getElementById('novo-filme');
  const titulo = input.value.trim();
  if (!titulo) return;

  const { data: existentes } = await supabaseClient
    .from('movies').select('titulo').eq('session_id', sessionId);
  const jaExiste = (existentes || []).some(m => m.titulo.toLowerCase() === titulo.toLowerCase());
  if (jaExiste) { alert('Esse filme já foi sugerido nessa sessão.'); return; }

  const infoTMDB = await buscarFilmeTMDB(titulo);

  const { error } = await supabaseClient.from('movies').insert([{
    session_id: sessionId,
    titulo,
    sugerido_por: usuario.id,
    poster_url: infoTMDB?.poster_url || null
  }]);

  if (error) { alert('Esse filme já foi sugerido nessa sessão.'); return; }

  input.value = '';
  carregarSessao();
}


async function votar(movieId) {
  // Verifica se já existe voto meu nessa sessão
  const { data: votoExistente } = await supabaseClient
    .from('votes')
    .select('id, movie_id')
    .eq('session_id', sessionId)
    .eq('user_id', usuario.id)
    .maybeSingle();

  if (votoExistente) {
    if (votoExistente.movie_id === movieId) return; // já é o voto atual

    const { error } = await supabaseClient
      .from('votes')
      .update({ movie_id: movieId })
      .eq('id', votoExistente.id);

    if (error) { alert('Erro ao trocar voto.'); return; }
  } else {
    const { error } = await supabaseClient.from('votes').insert([
      { session_id: sessionId, movie_id: movieId, user_id: usuario.id }
    ]);

    if (error) { alert('Erro ao votar.'); return; }
  }

  carregarSessao();
}

async function fecharSessao() {
  const { data: filmes } = await supabaseClient
    .from('movies').select('id').eq('session_id', sessionId);

  if (!filmes || filmes.length === 0) {
    if (!confirm('Essa sessão ainda não tem nenhum filme sugerido. Fechar mesmo assim (sem vencedor)?')) return;
  } else {
    const { data: votos } = await supabaseClient
      .from('votes').select('user_id').eq('session_id', sessionId);
    const votantes = new Set((votos || []).map(v => v.user_id)).size;

    const { data: membros } = await supabaseClient
      .from('group_members').select('user_id').eq('group_id', sessaoAtual.group_id);
    const totalMembros = (membros || []).length;

    if (votantes < totalMembros) {
      const faltam = totalMembros - votantes;
      if (!confirm(`Ainda faltam ${faltam} pessoa(s) do grupo votar. Fechar a votação mesmo assim?`)) return;
    } else {
      if (!confirm('Fechar a votação e revelar o vencedor?')) return;
    }
  }

  await supabaseClient
    .from('sessions')
    .update({ status: 'fechada' })
    .eq('id', sessionId);

  carregarSessao();
}

async function buscarFilmeTMDB(titulo) {
  const url = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(titulo)}&language=pt-BR`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${TMDB_TOKEN}` }
  });
  const dados = await resp.json();
  const filme = dados.results?.[0];
  if (!filme) return null;

  return {
    poster_url: filme.poster_path
      ? `https://image.tmdb.org/t/p/w342${filme.poster_path}`
      : null,
    sinopse: filme.overview || null
  };
}

carregarSessao();