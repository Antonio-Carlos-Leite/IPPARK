
# 💡 IPPARK - Sistema de Monitoramento de Postes Públicos

O **IPPARK** é um sistema web para visualização, cadastro e controle de postes públicos em um mapa interativo. Desenvolvido com foco na gestão urbana da cidade de Jucás/CE, ele permite o acompanhamento em tempo real da situação dos postes e facilita a manutenção da iluminação pública.

---

## 🔧 Funcionalidades

- 🔐 Login de usuário com Firebase Authentication
- 🗺️ Mapa interativo com Leaflet.js
- ➕ Adição de postes com localização, ID e status
- 🔍 Busca por ID de poste
- ✏️ Edição de status e identificação
- ❌ Remoção de postes
- 📊 Geração de relatório detalhado com resumo e datas
- 💾 Integração com Firebase Firestore

---

## 🚀 Como executar localmente

```bash
git clone https://github.com/seu-usuario/IPPARK.git
cd IPPARK
```

Abra `index.html` no navegador e faça login com sua conta cadastrada no Firebase.

---

## 🌐 Deploy

Este projeto pode ser publicado gratuitamente via [GitHub Pages](https://pages.github.com/).

---

## 📁 Estrutura do Projeto

```
IPPARK/
├── index.html         # Tela de login
├── mapa.html          # Tela principal com mapa
├── js/
│   ├── config.js      # Configuração do Firebase
│   ├── main.js        # Lógica de login
│   └── mapa.js        # Funcionalidades do mapa
├── css/
│   └── style.css      # Estilo visual
```

---

## 🛠️ Tecnologias

- HTML, CSS, JavaScript
- Leaflet.js
- Firebase (Auth e Firestore)

---

## 🧑‍💻 Autor

Desenvolvido por Antonio Carlos Leite de Oliveira como parte do projeto **IPPARK**.

---
