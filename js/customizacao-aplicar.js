// Aplica a customização visual do usuário (salva em localStorage como cache)
// e depois busca uma versão atualizada no Supabase, se estiver logado.
// Fica no <head>, igual o theme.js, pra evitar "flash" de estilo padrão.

const FONTES_DISPONIVEIS = {
  padrao: "'Arial', 'Helvetica', sans-serif",
  comic: "'Comic Sans MS', 'Comic Sans', cursive",
  monoespacada: "'Courier New', Courier, monospace",
  serifada: "'Georgia', 'Times New Roman', serif"
};

function lerCustomizacaoCache() {
  const raw = localStorage.getItem('customizacao_cache');
  return raw ? JSON.parse(raw) : {};
}

function reaplicarCoresCustomizadas() {
  const custom = lerCustomizacaoCache();
  aplicarCores(custom.cores);
}

function aplicarCores(cores) {
  if (!cores) return;
  const tema = document.documentElement.getAttribute('data-theme') === 'claro' ? 'claro' : 'escuro';
  const paleta = cores[tema];
  if (!paleta) return;

  if (paleta.bg) document.documentElement.style.setProperty('--bg-pagina', paleta.bg);
  if (paleta.texto) document.documentElement.style.setProperty('--texto-geral', paleta.texto);
}

function aplicarCustomizacao(custom) {
  if (!custom) return;

  if (custom.fonte && FONTES_DISPONIVEIS[custom.fonte]) {
    document.documentElement.style.setProperty('--font-body', FONTES_DISPONIVEIS[custom.fonte]);
  }

  aplicarCores(custom.cores);

  if (custom.bg_imagem_url) {
    document.documentElement.style.setProperty('--bg-imagem-override', `url(${custom.bg_imagem_url})`);
  } else {
    document.documentElement.style.setProperty('--bg-imagem-override', 'none');
  }
}

// Aplica de imediato o que já tiver em cache (sem esperar rede)
(function aplicarCacheImediatamente() {
  aplicarCustomizacao(lerCustomizacaoCache());
})();

// Depois de a página carregar (e o supabaseClient/auth.js já estarem prontos),
// busca a versão mais recente e atualiza o cache.
async function atualizarCacheCustomizacao() {
  if (typeof getUsuarioLogado !== 'function') return;
  const usuario = getUsuarioLogado();
  if (!usuario || typeof supabaseClient === 'undefined') return;

  const { data, error } = await supabaseClient
    .from('users')
    .select('customizacao')
    .eq('id', usuario.id)
    .single();

  if (error || !data) return;

  const customizacao = data.customizacao || {};
  localStorage.setItem('customizacao_cache', JSON.stringify(customizacao));
  aplicarCustomizacao(customizacao);
}

document.addEventListener('DOMContentLoaded', atualizarCacheCustomizacao);
