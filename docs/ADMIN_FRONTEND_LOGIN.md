**Admin Frontend — Como Fazer Login**

- **Endpoint (login)**: POST /api/v1/admin/login
  - Content-Type: application/json
  - Body JSON:
    {
      "email": "admin@exemplo.com",
      "senha": "sua_senha"
    }
  - Resposta (sucesso):
    {
      "sucesso": true,
      "token": "<JWT_TOKEN>"
    }

- **Exemplo (fetch)**

```javascript
async function login(email, senha) {
  const res = await fetch('/api/v1/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });
  const data = await res.json();
  if (data.sucesso && data.token) {
    // Armazenar token (ex.: localStorage) — ver nota de segurança
    localStorage.setItem('adm_token', data.token);
    return true;
  }
  console.error('Login falhou', data);
  return false;
}
```

- **Usar token em requisições protegidas**

```javascript
function getAuthHeader() {
  const token = localStorage.getItem('adm_token');
  return token ? { Authorization: 'Bearer ' + token } : {};
}

// exemplo: obter dados do perfil
fetch('/api/v1/admin/me', {
  headers: { ...getAuthHeader() }
})
  .then(r => r.json())
  .then(console.log);
```

- **Logout**

```javascript
function logout() {
  localStorage.removeItem('adm_token');
}
```

 - **Registro (criar conta admin pública)**

 ```javascript
 // Cria uma conta admin — rota pública usada apenas na bootstrap inicial
 async function registerAdmin(nome, email, senha) {
   const res = await fetch('/api/v1/admin/register', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ nome, email, senha })
   });
   return res.json();
 }
 ```

 - **Criar outro admin (protegido)**

 A rota `POST /api/v1/admin/create` só pode ser chamada por um admin autenticado. Envie o `Authorization: Bearer <token>` obtido no login.

 ```javascript
 async function createAdmin(nome, email, senha) {
   const token = localStorage.getItem('adm_token');
   const res = await fetch('/api/v1/admin/create', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': 'Bearer ' + token
     },
     body: JSON.stringify({ nome, email, senha })
   });
   return res.json();
 }
 ```

 - **Curl rápido (login)**

 ```bash
 curl -X POST https://seu-dominio.com/api/v1/admin/login \
   -H "Content-Type: application/json" \
   -d '{"email":"admin@exemplo.com","senha":"sua_senha"}'
 ```

 - **Curl protegido (criar admin)**

 ```bash
 curl -X POST https://seu-dominio.com/api/v1/admin/create \
   -H "Content-Type: application/json" \
   -H "Authorization: Bearer <JWT_TOKEN>" \
   -d '{"nome":"Novo Admin","email":"novo@exemplo.com","senha":"senha123"}'
 ```

- **Observações e boas práticas**
  - O token JWT expira em ~8 horas (configurado no backend).
  - Para maior segurança, prefira cookies `HttpOnly` em vez de `localStorage` (evita XSS).
  - Sempre usar HTTPS em produção.
  - Trate erros do backend (401/403) e redirecione para a tela de login quando necessário.
  - O backend espera `Content-Type: application/json` para o `POST /api/v1/admin/login`.

- **Arquivos de referência (backend)**
  - [Rotas admin](src/routes/admin.routes.js#L1-L40)
  - [Controller admin](src/controllers/admin.controller.js#L1-L200)
  - [Service autenticação](src/services/admin.service.js#L1-L200)
  - [Middleware proteção](src/middlewares/auth.middleware.js#L1-L200)

Se quiser, adiciono exemplos em React (hook + contexto) ou integração com `axios`.