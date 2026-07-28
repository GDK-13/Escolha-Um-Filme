// Alterna entre tema claro e escuro (Frutiger Aero) e lembra a escolha.
(function aplicarTemaSalvo() {
  const salvo = localStorage.getItem('tema') || 'escuro';
  if (salvo === 'claro') document.documentElement.setAttribute('data-theme', 'claro');
})();

function alternarTema() {
  const atual = document.documentElement.getAttribute('data-theme') === 'claro' ? 'claro' : 'escuro';
  const novo = atual === 'claro' ? 'escuro' : 'claro';

  if (novo === 'claro') {
    document.documentElement.setAttribute('data-theme', 'claro');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('tema', novo);
  atualizarBotaoTema();
}

function atualizarBotaoTema() {
  const btn = document.getElementById('btn-tema');
  if (!btn) return;
  const claro = document.documentElement.getAttribute('data-theme') === 'claro';
  btn.textContent = claro ? '🌙 Escuro' : '☀️ Claro';
}

document.addEventListener('DOMContentLoaded', atualizarBotaoTema);
