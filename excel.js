import ExcelJS from "exceljs";
import fs from "fs";
 
const FILE_PATH = "./data/backlog.xlsx";
 
const columns = [
  "ID",
  "DEMANDA",
  "ESCOPO",
  "ABERTURA VIA CHATBOT",
  "TIPO",
  "DIRETORIA",
  "SOLICITANTE",
  "CLASSIFICAÇÃO",
  "MANDATORIO",
  "TIPO DE OBRIGATORIEDADE",
  "GLOBAL",
  "PAYBACK",
  "BENEFICIO FINANCEIRO",
  "ORÇAMENTO PREVISTO",
  "AFETA NFS",
  "AFETA ANJ",
  "BENEFICIO OPERACIONAL ANATEL",
  "QTD RISCOS",
  "DEADLINE AREA USUARIA",
  "IMPACTOS ASSOCIADOS",
  "CARTEIRA",
  "SQUAD",
  "RESPONSAVEL TECNICO",
  "FAST TRACK / ESTRUTURANTE",
  "SINERGIAS",
  "DIA ENTRADA",
  "HOJE",
  "DIAS ABERTOS",
  "ETAPA ATUAL",
  "PREVISAO INICIO ANALISE",
  "PREVISAO INICIO DEV/EXECUÇÃO",
  "DATA PRIORIZAÇÃO",
  "PREVISAO TERMINO DEV",
  "CONCLUSAO",
  "PRIORIDADE FERRAMENTA",
  "PRIORIDADE DA DIRETORIA",
  "SCORE",
  "RANKING DIRETORIA",
  "RANKING VP",
  "COMPLEXIDADE",
  "HISTORICO",
];
 
const ensureFileExists = async () => {
  if (!fs.existsSync(FILE_PATH)) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Backlog");
 
    sheet.addRow(columns);
 
    await workbook.xlsx.writeFile(FILE_PATH);
  }
};
 
const generateId = (data) => {
  const next = data.length + 1;
  return `DEM-${String(next).padStart(3, "0")}`;
};
 
const calcularDias = (dataEntrada) => {
  const entrada = new Date(dataEntrada);
  const hoje = new Date();
 
  const diff = hoje - entrada;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};
 
const calcularScore = (item) => {
  let score = 0;
 
  if (item.MANDATORIO === "SIM") score += 20;
  if (item.GLOBAL === "SIM") score += 10;
  if (item["AFETA NFS"] === "SIM") score += 5;
  if (item["AFETA ANJ"] === "SIM") score += 5;
 
  // financeiro
  const beneficio = Number(item["BENEFICIO FINANCEIRO"] || 0);
  if (beneficio > 100000) score += 20;
  else if (beneficio > 50000) score += 10;
  else if (beneficio > 10000) score += 5;
 
  // riscos
  const riscos = Number(item["QTD RISCOS"] || 0);
  if (riscos > 5) score += 10;
 
  return score;
};
 
export const readExcel = async () => {
  await ensureFileExists();
 
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(FILE_PATH);
 
  const sheet = workbook.getWorksheet(1);
 
  const rows = [];
 
  sheet.eachRow((row, index) => {
    if (index === 1) return;
 
    const obj = {};
 
    columns.forEach((col, i) => {
      obj[col] = row.getCell(i + 1).value || "";
    });
 
    rows.push(obj);
  });
 
  return rows;
};
 
export const writeExcel = async (data) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Backlog");
 
  sheet.addRow(columns);
 
  data.forEach((item) => {
    const row = columns.map((col) => item[col] || "");
    sheet.addRow(row);
  });
 
  await workbook.xlsx.writeFile(FILE_PATH);
};
 
export const addDemanda = async (body) => {
  const data = await readExcel();
 
  const hoje = new Date();
  const hojeFormat = hoje.toLocaleDateString("pt-BR");
 
  const nova = {
    ID: generateId(data),
    DEMANDA: body.titulo,
    ESCOPO: body.descricao,
    "ABERTURA VIA CHATBOT": "SIM",
    TIPO: body.tipo,
    DIRETORIA: body.diretoria,
    SOLICITANTE: body.solicitante,
 
    CLASSIFICAÇÃO: "",
    MANDATORIO: "NAO",
    "TIPO DE OBRIGATORIEDADE": "",
    GLOBAL: "NAO",
    PAYBACK: "",
    "BENEFICIO FINANCEIRO": "",
    "ORÇAMENTO PREVISTO": "",
    "AFETA NFS": "NAO",
    "AFETA ANJ": "NAO",
    "BENEFICIO OPERACIONAL ANATEL": "",
    "QTD RISCOS": "",
    "DEADLINE AREA USUARIA": "",
    "IMPACTOS ASSOCIADOS": "",
    CARTEIRA: "",
    SQUAD: "",
    "RESPONSAVEL TECNICO": "",
    "FAST TRACK / ESTRUTURANTE": "",
    SINERGIAS: "",
    "DIA ENTRADA": hojeFormat,
    HOJE: hojeFormat,
    "DIAS ABERTOS": 0,
    "ETAPA ATUAL": "NOVO",
    "PREVISAO INICIO ANALISE": "",
    "PREVISAO INICIO DEV/EXECUÇÃO": "",
    "DATA PRIORIZAÇÃO": "",
    "PREVISAO TERMINO DEV": "",
    CONCLUSAO: "",
    "PRIORIDADE FERRAMENTA": "",
    "PRIORIDADE DA DIRETORIA": "",
    SCORE: 0,
    "RANKING DIRETORIA": "",
    "RANKING VP": "",
    COMPLEXIDADE: "",
    HISTORICO: "Criado via chatbot",
  };
 
  // calcular dias e score antes de salvar
  nova["DIAS ABERTOS"] = calcularDias(hoje);
  nova.SCORE = calcularScore(nova);
 
  data.push(nova);
 
  // recalcular TODOS (pra manter atualizado)
  data.forEach((item) => {
    item["DIAS ABERTOS"] = calcularDias(item["DIA ENTRADA"]);
    item.SCORE = calcularScore(item);
  });
 
  await writeExcel(data);
 
  return nova;
};