const API_BASE = "http://localhost:3000/api/demandas";
 
let enviando = false; // trava contra execução dupla
 
async function loadMenu() {
  const res = await fetch("menu.html");
  const html = await res.text();
  const app = document.getElementById("app");
 
  app.innerHTML = `
    <div class="app-shell">
      ${html}
      <main class="main-content" id="main-content"></main>
    </div>
  `;
 
  attachMenuEvents();
  loadPage("chat");
}
 
function attachMenuEvents() {
  document.querySelectorAll(".menu-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const page = item.getAttribute("data-page");
 
      if (page) loadPage(page);
 
      document
        .querySelectorAll(".menu-item")
        .forEach((m) => m.classList.remove("active"));
 
      item.classList.add("active");
    });
  });
}
 
async function loadPage(pageName) {
  const mainContainer = document.getElementById("main-content");
 
  let htmlFile = "";
  if (pageName === "chat") htmlFile = "chat-main.html";
  else if (pageName === "profile") htmlFile = "profile-main.html";
  else if (pageName === "problems") htmlFile = "problems-main.html";
  else return;
 
  const res = await fetch(htmlFile);
  const html = await res.text();
  mainContainer.innerHTML = html;
 
  if (pageName === "chat") initChat();
  if (pageName === "profile") initPerfil();
  if (pageName === "problems") initRelatar(); // ✅ corrigido
}
 
const chatSession = {
  perguntas: [],
  demandaId: null,
  perguntaAtual: null,
  etapa: "perfil",
  perfilStep: "nome",
  dadosPerfil: {},
};
 
async function initChat() {
  const chatWindow = document.getElementById("chat-window");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-btn");
 
  chatSession.demandaId = null;
  chatSession.perguntaAtual = null;
  chatSession.etapa = "perfil";
  chatSession.perfilStep = "nome";
  chatSession.dadosPerfil = {};
  chatSession.perguntas = [];
 
  // Remove eventos antigos
  const novoBtn = sendBtn.cloneNode(true);
  const novoInput = userInput.cloneNode(true);
  sendBtn.parentNode.replaceChild(novoBtn, sendBtn);
  userInput.parentNode.replaceChild(novoInput, userInput);
 
  document.getElementById("send-btn").addEventListener("click", handleEnviar);
 
  // ✅ CORREÇÃO INPUT
  document.getElementById("user-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleEnviar(e);
    }
  });
 
  adicionarMensagem("Conectando...", "bot");
 
  try {
    const resp = await fetch(API_BASE + "/perguntas/lista");
    chatSession.perguntas = await resp.json();
    chatWindow.innerHTML = "";
  } catch (e) {
    adicionarMensagem("Erro ao conectar servidor", "bot");
    return;
  }
 
  adicionarMensagem("Olá! Vou te ajudar. Qual é o seu nome completo?", "bot");
}
 
async function handleEnviar(e) {
  if (e) e.preventDefault();
 
  if (enviando) return;
  enviando = true;
 
  const input = document.getElementById("user-input");
  const texto = input.value.trim();
 
  if (!texto) {
    enviando = false;
    return;
  }
 
  adicionarMensagem(texto, "user");
  input.value = "";
  bloquearInput(true);
 
  try {
    console.log("ETAPA:", chatSession.etapa);
 
    if (chatSession.etapa === "perfil") {
      await coletarPerfil(texto);
    } else if (chatSession.etapa === "fluxo") {
      await responderPergunta(texto);
    } else if (chatSession.etapa === "upload") {
      adicionarMensagem("Use o botao de upload", "bot");
      bloquearInput(false);
    } else if (chatSession.etapa === "fim") {
      if (texto.toUpperCase() === "SIM") {
        initChat();
      } else {
        adicionarMensagem("Ok, encerrado!", "bot");
        bloquearInput(false);
      }
    }
  } finally {
    enviando = false;
  }
}
 
async function coletarPerfil(texto) {
  if (chatSession.perfilStep === "nome") {
    chatSession.dadosPerfil.solicitante = texto;
    chatSession.perfilStep = "email";
    adicionarMensagem("Digite seu email:", "bot");
  } else if (chatSession.perfilStep === "email") {
    chatSession.dadosPerfil.email = texto;
    chatSession.perfilStep = "titulo";
    adicionarMensagem("Titulo da demanda:", "bot");
  } else if (chatSession.perfilStep === "titulo") {
    chatSession.dadosPerfil.titulo = texto;
    chatSession.perfilStep = "descricao";
    adicionarMensagem("Descreva:", "bot");
  } else if (chatSession.perfilStep === "descricao") {
    chatSession.dadosPerfil.descricao = texto;
 
    const resp = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chatSession.dadosPerfil),
    });
 
    const demanda = await resp.json();
 
    chatSession.demandaId = demanda.ID;
    chatSession.etapa = "fluxo";
 
    adicionarMensagem(`Demanda ${demanda.ID} criada`, "bot");
 
    exibirPerguntaPorId(1);
  }
 
  bloquearInput(false);
}
 
async function responderPergunta(texto) {
  const valor = texto.toUpperCase().trim();
 
  if (!chatSession.perguntaAtual) {
    adicionarMensagem("Erro de fluxo", "bot");
    bloquearInput(false);
    return;
  }
 
  const resp = await fetch(API_BASE + "/fluxo/responder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      demandaId: chatSession.demandaId,
      perguntaId: chatSession.perguntaAtual.id,
      valor: valor,
    }),
  });
 
  const data = await resp.json();
 
  if (data.status) {
    chatSession.etapa = "fim";
    adicionarMensagem("Finalizado. Nova demanda? (SIM/NAO)", "bot");
    bloquearInput(false);
    return;
  }
 
  if (!data.nextQuestion) {
    adicionarMensagem("Erro fluxo", "bot");
    bloquearInput(false);
    return;
  }
 
  chatSession.perguntaAtual = data.nextQuestion;
  exibirPergunta(data.nextQuestion);
}
 
function exibirPerguntaPorId(id) {
  const pergunta = chatSession.perguntas.find(
    (p) => String(p.id) === String(id),
  );
 
  if (!pergunta) {
    adicionarMensagem("Pergunta não encontrada", "bot");
    return;
  }
 
  chatSession.perguntaAtual = pergunta;
  exibirPergunta(pergunta);
}
 
function exibirPergunta(pergunta) {
  adicionarMensagem(pergunta.question, "bot");
  bloquearInput(false);
}
 
function adicionarMensagem(texto, sender) {
  const chatWindow = document.getElementById("chat-window");
 
  const div = document.createElement("div");
  div.classList.add("message", sender);
 
  div.innerText = texto;
 
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}
 
function bloquearInput(bloquear) {
  document.getElementById("user-input").disabled = bloquear;
  document.getElementById("send-btn").disabled = bloquear;
}
 
function initRelatar() {
  console.log("Relatar");
}
 
loadMenu();