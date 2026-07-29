async function hashSenha(senha) {
  const encoder = new TextEncoder();
  const data = encoder.encode(senha);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function criarConta() {
  const nome = document.getElementById('cad-nome').value.trim();
  const senha = document.getElementById('cad-senha').value;
  const erroEl = document.getElementById('cad-erro');
  erroEl.textContent = '';

  if (!nome || !senha) {
    erroEl.textContent = 'Preencha nome e senha.';
    return;
  }

  const senhaHash = await hashSenha(senha);

  const { data, error } = await supabaseClient
    .from('users')
    .insert([{ nome, senha_hash: senhaHash }])
    .select()
    .single();

  if (error) {
    erroEl.textContent = error.code === '23505'
      ? 'Esse nome já está em uso.'
      : 'Erro ao criar conta.';
    return;
  }

  salvarSessaoUsuario(data);
  window.location.href = 'grupos.html';
}

async function fazerLogin() {
  const nome = document.getElementById('login-nome').value.trim();
  const senha = document.getElementById('login-senha').value;
  const erroEl = document.getElementById('login-erro');
  erroEl.textContent = '';

  const senhaHash = await hashSenha(senha);

  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('nome', nome)
    .eq('senha_hash', senhaHash)
    .single();

  if (error || !data) {
    erroEl.textContent = 'Nome ou senha incorretos.';
    return;
  }

  salvarSessaoUsuario(data);
  window.location.href = 'grupos.html';
}

function salvarSessaoUsuario(user) {
  localStorage.setItem('usuario', JSON.stringify({ id: user.id, nome: user.nome }));
}

function getUsuarioLogado() {
  const raw = localStorage.getItem('usuario');
  return raw ? JSON.parse(raw) : null;
}

function logout() {
  localStorage.removeItem('usuario');
  window.location.href = 'index.html';
}

// ---- Utilitário: mini avatar ----
function renderAvatarMini(fotoUrl) {
  if (fotoUrl) {
    return `<img src="${fotoUrl}" class="avatar-mini" alt="foto de perfil">`;
  }
  return `<span class="avatar-mini-vazio">?</span>`;
}

// ---- Utilitário: buscar lista de amigos com foto_url (cacheada por sessão de página) ----
let _cacheAmigosComFoto = null;
async function buscarAmigosComFoto() {
  if (_cacheAmigosComFoto) return _cacheAmigosComFoto;

  const usuario = getUsuarioLogado();
  const { data: comoUser } = await supabaseClient
    .from('friendships')
    .select('amigo_id, users:amigo_id(id, nome, foto_url)')
    .eq('user_id', usuario.id);

  const { data: comoAmigo } = await supabaseClient
    .from('friendships')
    .select('user_id, users:user_id(id, nome, foto_url)')
    .eq('amigo_id', usuario.id);

  const todos = [
    ...(comoUser || []).map(f => f.users),
    ...(comoAmigo || []).map(f => f.users)
  ];

  _cacheAmigosComFoto = Array.from(new Map(todos.map(u => [u.id, u])).values());
  return _cacheAmigosComFoto;
}