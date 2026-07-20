# 💕 Sistema de Reservas - Evento Namorados (JrCoffee)

Backend responsavel por gerenciar as reservas de um evento especial (Dia dos Namorados) da JrCoffee: cardapio, reserva de mesas/eventos, pagamento online e um painel administrativo completo.

---

## 🌟 Sobre o projeto

O sistema permite que clientes visualizem o cardapio do evento, façam uma reserva e paguem online via Mercado Pago. Do lado administrativo, a equipe consegue gerenciar cardapio (com upload de imagens), acompanhar reservas e status de pagamento, alem de contar com um job automatico que libera reservas nao confirmadas apos um tempo limite.

---

## ⚡ Funcionalidades

- Cadastro e consulta de reservas de evento
- - Integracao de pagamento via Mercado Pago (checkout, webhook de notificacao e sincronizacao de status)
  - - CRUD de cardapio com upload de imagens
    - - Painel administrativo para gestao de reservas e cardapio
      - - Autenticacao com JWT e senha criptografada (bcrypt)
        - - Job agendado (cron) para liberar automaticamente reservas nao pagas/expiradas
          - - Validacao de dados com Zod
           
            - ---

            ## 🛠️ Tecnologias utilizadas

            - **Runtime:** Node.js + Express 5
            - - **ORM / Banco de Dados:** Prisma + MariaDB/MySQL
              - - **Autenticacao:** JWT + bcryptjs
                - - **Pagamentos:** Mercado Pago SDK (checkout + webhooks)
                  - - **Upload de arquivos:** Multer
                    - - **Geracao de QR Code:** qrcode
                      - - **Validacao:** Zod
                       
                        - ---

                        ## ⚙️ Como executar localmente

                        ```bash
                        # 1. Clonar e instalar dependencias
                        git clone https://github.com/Brunoso0/backend-namorados.git
                        cd backend-namorados
                        npm install

                        # 2. Configurar variaveis de ambiente
                        cp .env.example .env
                        # preencha DATABASE_URL, credenciais do Mercado Pago, etc.

                        # 3. Rodar as migrations do Prisma
                        npx prisma migrate dev

                        # 4. Iniciar o servidor em modo desenvolvimento
                        npm run dev
                        ```

                        ---

                        ## 📂 Estrutura do projeto

                        ```
                        src/
                        ├── config/        # Configuracoes gerais
                        ├── controllers/   # Regras de negocio das rotas
                        ├── middlewares/   # Autenticacao e validacoes
                        ├── routes/        # Rotas de admin, cardapio, evento, pagamento e upload
                        ├── schemas/       # Schemas de validacao (Zod)
                        ├── services/      # Integracoes externas (Mercado Pago, etc.)
                        └── server.js      # Ponto de entrada da aplicacao
                        ```

                        ---

                        ## 📬 Contato

                        Desenvolvido por [Bruno Santos](https://www.linkedin.com/in/brunoso0).
