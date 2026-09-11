<div align="center">

# Kryptos

**Gerenciador de senhas local com criptografia de ponta a ponta**
*Local password manager with end-to-end encryption*

Python · FastAPI · PostgreSQL · Next.js · InsightFace · MediaPipe

</div>

---

## Português

### Sobre

Kryptos é um cofre de credenciais que roda inteiramente na máquina do usuário. Nenhum dado sai do computador: não há servidor remoto, não há sincronização, não há conta na nuvem.

A senha mestra nunca é armazenada. Ela deriva, via Argon2id, a chave que cifra cada registro com AES-256-GCM. Um dump do banco de dados contém apenas bytes cifrados, o salt do KDF e um bloco verificador.

O acesso exige três fatores: senha mestra, reconhecimento facial e um gesto configurável.

### Modelo de segurança

| Camada | Implementação |
|---|---|
| Derivação de chave | Argon2id, 128 MiB de memória, 3 iterações, paralelismo 4 |
| Criptografia | AES-256-GCM com nonce único por registro |
| Verificação da senha | Bloco cifrado de teste, validado pela tag de autenticação do GCM |
| Sessão | Chave mantida apenas em RAM, expira por inatividade |
| Segundo fator | Embedding facial (InsightFace) cifrado com a chave mestra |
| Terceiro fator | Gesto de mão (MediaPipe), exigido em 8 frames consecutivos |

**O que fica cifrado:** email, senha e anotações de cada credencial, além do embedding facial e do gesto escolhido.

**O que fica em texto puro:** título e categoria. Essa é uma decisão deliberada: permite busca e ordenação direto no SQL sem carregar e decifrar o cofre inteiro a cada consulta. Como o banco roda apenas na máquina do usuário, o risco residual é aceitável.

**Limitações conhecidas.** O reconhecimento facial não faz detecção de vivacidade, então uma fotografia pode passar na verificação. A biometria protege contra acesso casual, não contra um atacante determinado. Se a máquina estiver comprometida por malware, nenhum gerenciador de senhas oferece proteção, e este não é exceção. A senha mestra continua sendo a única barreira que resiste a um ataque offline.

### Requisitos

- Python 3.11 ou superior
- Node.js 18 ou superior
- PostgreSQL 14 ou superior
- Webcam, caso queira usar a biometria

### Instalação rápida

No Windows, a partir da raiz do repositório:

```powershell
.\setup.ps1
```

O script cria o ambiente virtual, instala as dependências, baixa o modelo de detecção de mãos, gera os arquivos de configuração e prepara o banco.

### Instalação manual

**1. Banco de dados**

```sql
CREATE DATABASE kryptos;
CREATE USER kryptos_user WITH PASSWORD 'sua_senha_forte';
GRANT ALL PRIVILEGES ON DATABASE kryptos TO kryptos_user;
\c kryptos
GRANT ALL ON SCHEMA public TO kryptos_user;
```

**2. Backend**

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

Crie `backend/.env`:

```
DATABASE_URL=postgresql+psycopg://kryptos_user:sua_senha_forte@localhost:5432/kryptos
SESSION_TIMEOUT_MINUTES=15
```

Baixe o modelo de detecção de mãos para dentro de `backend/`:

```bash
curl -o backend/hand_landmarker.task https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
```

Crie as tabelas:

```bash
cd backend
python init_db.py
```

**3. Frontend**

Crie `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

```bash
cd frontend
npm install
npm run build
```

### Execução

**Windows:** duplo clique em `Kryptos.bat`, ou crie um atalho para ele na área de trabalho. O script sobe os dois servidores, aguarda o backend carregar os modelos e abre o aplicativo. Ao fechar a janela, os processos são encerrados automaticamente.

**Manual:**

```bash
# terminal 1
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000

# terminal 2
cd frontend
npm run start
```

Acesse `http://localhost:3000`.

Na primeira execução o InsightFace baixa cerca de 300 MB de modelo, e o servidor demora mais para iniciar.

### Primeiro uso

1. Abra o aplicativo. Como o cofre ainda não existe, aparece a tela de criação
2. Escolha uma senha mestra com no mínimo 12 caracteres. Ela não pode ser recuperada
3. Cadastre suas credenciais
4. Opcionalmente, abra o menu de segurança e cadastre rosto e gesto

Enquanto não houver rosto cadastrado, o acesso usa apenas a senha mestra. A partir do cadastro, os três fatores passam a ser exigidos.

### Estrutura

```
kryptos/
├── backend/
│   ├── app/
│   │   ├── biometrics.py     reconhecimento facial e de gestos
│   │   ├── crypto.py         Argon2id e AES-256-GCM
│   │   ├── models.py         tabelas do banco
│   │   ├── session.py        sessão em memória e desafio biométrico
│   │   └── routers/
│   └── init_db.py
├── frontend/
│   ├── app/
│   ├── components/
│   └── lib/
├── setup.ps1
└── Kryptos.bat
```

### API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/vault/status` | Estado do cofre |
| `POST` | `/vault/init` | Cria o cofre |
| `POST` | `/vault/unlock` | Valida a senha mestra |
| `POST` | `/vault/lock` | Descarta a chave da memória |
| `POST` | `/vault/change-password` | Recifra o cofre com uma chave nova |
| `GET` | `/credentials` | Lista credenciais |
| `GET` | `/credentials/{id}/reveal` | Decifra uma credencial |
| `POST` | `/biometrics/enroll-face` | Cadastra o rosto |
| `POST` | `/biometrics/enroll-gesture` | Cadastra o gesto |
| `POST` | `/biometrics/verify-face` | Primeiro fator biométrico |
| `POST` | `/biometrics/verify-gesture` | Segundo fator biométrico, emite o token |

Documentação interativa em `http://127.0.0.1:8000/docs` com o servidor rodando.

---

## English

### About

Kryptos is a credential vault that runs entirely on the user's machine. No data leaves the computer: there is no remote server, no synchronization, no cloud account.

The master password is never stored. It derives, through Argon2id, the key that encrypts each record with AES-256-GCM. A database dump contains only ciphertext, the KDF salt and a verifier block.

Access requires three factors: master password, facial recognition and a configurable hand gesture.

### Security model

| Layer | Implementation |
|---|---|
| Key derivation | Argon2id, 128 MiB memory, 3 iterations, parallelism 4 |
| Encryption | AES-256-GCM with a unique nonce per record |
| Password check | Encrypted test block, validated by the GCM authentication tag |
| Session | Key held in RAM only, expires on inactivity |
| Second factor | Face embedding (InsightFace) encrypted with the master key |
| Third factor | Hand gesture (MediaPipe), required across 8 consecutive frames |

**Encrypted:** each credential's email, password and notes, plus the face embedding and the chosen gesture.

**Plaintext:** title and category. This is a deliberate trade-off: it allows search and sorting directly in SQL without loading and decrypting the entire vault on every query. Since the database runs only on the user's machine, the residual risk is acceptable.

**Known limitations.** Facial recognition performs no liveness detection, so a photograph may pass verification. Biometrics protect against casual access, not against a determined attacker. If the machine is compromised by malware, no password manager offers protection, and this one is no exception. The master password remains the only barrier that resists an offline attack.

### Requirements

- Python 3.11 or newer
- Node.js 18 or newer
- PostgreSQL 14 or newer
- A webcam, if you want to use biometrics

### Quick setup

On Windows, from the repository root:

```powershell
.\setup.ps1
```

The script creates the virtual environment, installs dependencies, downloads the hand detection model, generates the configuration files and prepares the database.

### Manual setup

**1. Database**

```sql
CREATE DATABASE kryptos;
CREATE USER kryptos_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE kryptos TO kryptos_user;
\c kryptos
GRANT ALL ON SCHEMA public TO kryptos_user;
```

**2. Backend**

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

Create `backend/.env`:

```
DATABASE_URL=postgresql+psycopg://kryptos_user:your_strong_password@localhost:5432/kryptos
SESSION_TIMEOUT_MINUTES=15
```

Download the hand detection model into `backend/`:

```bash
curl -o backend/hand_landmarker.task https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
```

Create the tables:

```bash
cd backend
python init_db.py
```

**3. Frontend**

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

```bash
cd frontend
npm install
npm run build
```

### Running

**Windows:** double click `Kryptos.bat`, or create a desktop shortcut to it. The script starts both servers, waits for the backend to load its models and opens the application. Closing the window terminates the processes automatically.

**Manual:**

```bash
# terminal 1
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000

# terminal 2
cd frontend
npm run start
```

Open `http://localhost:3000`.

On the first run InsightFace downloads roughly 300 MB of model data, so the server takes longer to start.

### First use

1. Open the application. Since the vault does not exist yet, the creation screen appears
2. Choose a master password with at least 12 characters. It cannot be recovered
3. Add your credentials
4. Optionally, open the security menu and enroll your face and gesture

Until a face is enrolled, access uses the master password alone. Once enrolled, all three factors are required.

### Project layout

```
kryptos/
├── backend/
│   ├── app/
│   │   ├── biometrics.py     face and gesture recognition
│   │   ├── crypto.py         Argon2id and AES-256-GCM
│   │   ├── models.py         database tables
│   │   ├── session.py        in-memory session and biometric challenge
│   │   └── routers/
│   └── init_db.py
├── frontend/
│   ├── app/
│   ├── components/
│   └── lib/
├── setup.ps1
└── Kryptos.bat
```

### API

| Method | Route | Description |
|---|---|---|
| `GET` | `/vault/status` | Vault state |
| `POST` | `/vault/init` | Create the vault |
| `POST` | `/vault/unlock` | Validate the master password |
| `POST` | `/vault/lock` | Discard the key from memory |
| `POST` | `/vault/change-password` | Re-encrypt the vault with a new key |
| `GET` | `/credentials` | List credentials |
| `GET` | `/credentials/{id}/reveal` | Decrypt a credential |
| `POST` | `/biometrics/enroll-face` | Enroll a face |
| `POST` | `/biometrics/enroll-gesture` | Enroll a gesture |
| `POST` | `/biometrics/verify-face` | First biometric factor |
| `POST` | `/biometrics/verify-gesture` | Second biometric factor, issues the token |

Interactive documentation at `http://127.0.0.1:8000/docs` while the server is running.

---

<div align="center">

Desenvolvido por **Matheus Poli Chiarelli** · [matheuspolichiarelli.com](https://matheuspolichiarelli.com)

</div>