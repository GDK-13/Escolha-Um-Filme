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
  if (typeof reaplicarCoresCustomizadas === 'function') reaplicarCoresCustomizadas();
}

function atualizarBotaoTema() {
  const btn = document.getElementById('btn-tema');
  if (!btn) return;
  const claro = document.documentElement.getAttribute('data-theme') === 'claro';
  btn.textContent = claro ? 'Escuro' : 'Claro';
}

document.addEventListener('DOMContentLoaded', atualizarBotaoTema);

// ---- Densidade da interface (compacta / confortável) ----
(function aplicarDensidadeSalva() {
  const salva = localStorage.getItem('densidade') || 'confortavel';
  if (salva === 'compacta') document.documentElement.setAttribute('data-densidade', 'compacta');
})();

function alternarDensidade() {
  const atual = document.documentElement.getAttribute('data-densidade') === 'compacta' ? 'compacta' : 'confortavel';
  const nova = atual === 'compacta' ? 'confortavel' : 'compacta';

  if (nova === 'compacta') {
    document.documentElement.setAttribute('data-densidade', 'compacta');
  } else {
    document.documentElement.removeAttribute('data-densidade');
  }
  localStorage.setItem('densidade', nova);
  atualizarBotaoDensidade();
}

function atualizarBotaoDensidade() {
  const btn = document.getElementById('btn-densidade');
  if (!btn) return;
  const compacta = document.documentElement.getAttribute('data-densidade') === 'compacta';
  btn.textContent = compacta ? 'Confortável' : 'Compacto';
}

document.addEventListener('DOMContentLoaded', atualizarBotaoDensidade);

// Aguarda a página carregar
document.addEventListener('DOMContentLoaded', () => {
  // 1. Defina aqui a sua lista de textos malucos/nostálgicos
  const textos = [
    "Esse site conta com acessoria jurídica do escritório Dra. Logarta Littlecouto",
    "Site otimizado para Internet Explorer 5.0 e Netscape Navigator",
    "Você é o visitante nº 004829",
    "Em construção...",
    "Desculpe o transtorno, estamos mudando o país",
    "Perdão, foi a coca.",
    "Oi meu nome é Funéria, tenho 14 anos (Teria se estivesse viva), morri aos 13 em teresina-PI.",
    "Site de Viados Tirões",
    "Capaz...",
    "Não esqueçam de votar no filme! A sessão já vai começar",
    "bete? || é a bete que tá falando || ué, o meu também é bete ||  engraçado o meu também é bete || alô? || alô, quem fala? || bete? || quem é que tá ligando? || bete || bete? || o meu também é bete || o meu nome é bete, o seu também é bete, mas com quem você quer falar? || bete.",
    "I can give you Paris Hilton, I can give you Janet. Could give you Björk, but I don't think you'd understand it. I could give you sex doll, bitch, you love these legend lips.  And baby, I could give you model, with these double A-cup tits.",
    "Pedro Henrique Oliveira Garcia, quem é?    ||   ELE   ||   (╬☉д⊙) ＝ᅳᅳᅳᅴ)๏д๏))･;’. ",
    "Ah, num dá! Eu vou pular fora, que eu vou pra casa. A RÁ RÁ RÁ RÁ RÁ RÁ RÁ RÁ tchatchatchau! Beijinhos pra voceissss meninosxss.",
    "Correspondente da Choquei direto de Ratanabá",
    "Meus pesâmes querida. quero ver quem vai ficar com a roupa dela.",
    "O capitalismo falhou, falha e falhará em cada uma das sociedades aonde ele colocar os seus tentáculos que se baseiam na expropriação e na exploração do homem pelo homem. É isso que nós combatemos!",
    "No grupo de gestão nós temos 5 pessoas e um estágiário.",
    "WHO THE FUCK DARE TO CALL ME WHEN I'M SO BUSY?",
    "WHEEEEERE HAVE YOU BEEEEEEEEENNN ALL MY LAIAAAAAFE, ALLL MY LAAAAAIAAAAFE"
  ];

const marqueeTexto = document.getElementById('texto-aleatorio');

if (marqueeTexto) {
  const trocarTexto = () => {
    const indiceAleatorio = Math.floor(Math.random() * textos.length);
    const novoTexto = textos[indiceAleatorio];
    
    const tempoCalculado = Math.max(12, novoTexto.length * 0.15);

    marqueeTexto.style.animation = 'none';

    marqueeTexto.textContent = novoTexto;

    void marqueeTexto.offsetWidth;

    marqueeTexto.style.animation = `rolar-marquise ${tempoCalculado}s linear forwards`;
  };

  trocarTexto();

  marqueeTexto.addEventListener('animationend', trocarTexto);
}
});