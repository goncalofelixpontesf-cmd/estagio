# ESMAD — Gestão de Propostas de Projectos Finais / Estágio

## Requisitos
- Node.js (v18 ou superior)
- MongoDB (instalar em https://www.mongodb.com/try/download/community)
- VS Code com extensão Live Server

---

## Como correr o projecto

### 1. Iniciar o MongoDB
Abre o terminal e corre:
```
mongod
```
(ou se instalaste como serviço, já está a correr automaticamente)

### 2. Iniciar o Backend
```bash
cd backend
npm install
node server.js
```
Deverás ver:
```
Servidor a correr na porta 5000
MongoDB conectado: localhost
```

### 3. Abrir o Frontend
- Abre o VS Code
- Clica com o botão direito em `frontend/pages/login.html`
- Selecciona "Open with Live Server"
- O browser abre em http://127.0.0.1:5500

---

## Estrutura do projecto
```
esmad-app/
├── backend/
│   ├── config/
│   │   └── db.js              # Ligação ao MongoDB
│   ├── controllers/
│   │   └── authController.js  # Login e Registo
│   ├── middleware/
│   │   └── auth.js            # Verificação JWT
│   ├── models/
│   │   ├── Utilizador.js      # Modelo de utilizador
│   │   ├── Estudante.js       # Perfil de estudante
│   │   └── Entidade.js        # Perfil de entidade
│   ├── routes/
│   │   └── auth.js            # Rotas de autenticação
│   ├── .env                   # Variáveis de ambiente
│   └── server.js              # Servidor Express
│
└── frontend/
    ├── css/
    │   └── style.css          # Estilos ESMAD
    ├── js/
    │   └── api.js             # Helper para chamadas à API
    └── pages/
        ├── login.html         # Página de login
        └── registo.html       # Página de registo
```

---

## API — Endpoints disponíveis

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/auth/registo | Criar nova conta |
| POST | /api/auth/login   | Autenticar utilizador |
| GET  | /api/auth/eu      | Obter utilizador autenticado |

---

## Testar a API (Postman ou curl)

**Registo:**
```json
POST http://localhost:5000/api/auth/registo
{
  "nome": "Gonçalo Pontes",
  "email": "goncalo@esmad.ipp.pt",
  "password": "123456",
  "perfil": "estudante",
  "curso": "TeSP DTAM"
}
```

**Login:**
```json
POST http://localhost:5000/api/auth/login
{
  "email": "goncalo@esmad.ipp.pt",
  "password": "123456"
}
```
