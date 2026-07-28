const usuario = getUsuarioLogado();
if (!usuario) window.location.href = 'index.html';

const params = new URLSearchParams(window.location.search);
const sessionId = params.get('id');

async function carregarSessao() {
  const { data: sessao } = await supabaseClient
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  document.getElementById('sessao-titulo').textContent =
    `🎬 ${sessao.titulo} (${sessao.status})`;

  document.getElementById('btn-fechar').style.display =
    sessao.status === 'fechada' ? 'none' : 'inline-block';

  carregarFilmes(sessao.status);
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

  let vencedor = null;
  if (statusSessao === 'fechada' && filmes.length > 0) {
    vencedor = filmes.reduce((a, b) =>
      (contagem[a.id] || 0) >= (contagem[b.id] || 0) ? a : b
    );
  }

  const container = document.getElementById('lista-filmes');
  container.innerHTML = filmes.map(filme => {
    const votosDoFilme = contagem[filme.id] || 0;
    const jaVotei = meuVoto && meuVoto.movie_id === filme.id;
    const ehVencedor = vencedor && vencedor.id === filme.id;

    return `
        <div class="card filme ${ehVencedor ? 'vencedor' : ''}">
            ${filme.poster_url ? `<img src="${filme.poster_url}" class="poster" alt="${filme.titulo}">` : ''}
            <h3>${filme.titulo} ${ehVencedor ? '🏆' : ''}</h3>
            <p>${votosDoFilme} voto(s)</p>
            ${statusSessao === 'aberta' ? `
            <button ${jaVotei ? 'disabled' : ''} onclick="votar('${filme.id}')">
                ${jaVotei ? 'Você votou aqui' : 'Votar'}
            </button>
            ` : ''}
        </div>
    `;
  }).join('');
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
  const { error } = await supabaseClient.from('votes').insert([
    { session_id: sessionId, movie_id: movieId, user_id: usuario.id }
  ]);

  if (error) {
    alert('Você já votou nessa sessão.');
    return;
  }

  carregarSessao();
}

async function fecharSessao() {
  if (!confirm('Fechar a votação e revelar o vencedor?')) return;

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