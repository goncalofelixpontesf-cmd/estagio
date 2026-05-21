const API_URL = 'http://localhost:5000/api';

const api = {
  // Guardar token
  guardarToken(token, utilizador) {
    localStorage.setItem('token', token);
    localStorage.setItem('utilizador', JSON.stringify(utilizador));
  },

  // Obter token
  obterToken() {
    return localStorage.getItem('token');
  },

  // Obter utilizador guardado
  obterUtilizador() {
    const u = localStorage.getItem('utilizador');
    return u ? JSON.parse(u) : null;
  },

  // Logout
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('utilizador');
    window.location.href = '../pages/login.html';
  },

  // Verificar se está autenticado
  estaAutenticado() {
    return !!this.obterToken();
  },

  // Redirecionar para o dashboard correcto após login
  redirecionarPorPerfil(perfil) {
    const destinos = {
      estudante: 'dashboard-estudante.html',
      docente:   'dashboard-docente.html',
      entidade:  'dashboard-docente.html',
      comissao:  'dashboard-cca.html',
      admin:     'dashboard-cca.html'
    };
    window.location.href = destinos[perfil] || 'login.html';
  },

  // Pedido autenticado
  async pedido(endpoint, opcoes = {}) {
    const token = this.obterToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const resposta = await fetch(`${API_URL}${endpoint}`, {
      ...opcoes,
      headers: { ...headers, ...opcoes.headers }
    });

    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.mensagem || 'Erro na operacao.');
    return dados;
  },

  // POST sem auth
  async post(endpoint, corpo) {
    const resposta = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo)
    });
    const dados = await resposta.json();
    if (!resposta.ok) throw new Error(dados.mensagem || 'Erro na operacao.');
    return dados;
  }
};
