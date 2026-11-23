// gerar-json-toyota.cjs
//
// Le a aba EXPORTACAO_WEB da politica comercial Toyota e gera
// src/data/politica-toyota.json no formato usado pelo simulador multimarcas.
//
// Colunas esperadas:
// A FAMILIA | B Modelo | C AnoModelo | D PPS | E Margem | F Bonus
// G Brasilia | H GBH | I ES | J LESTE & ZM | K TRIMG
//
// Uso:
//   node gerar-json-toyota.cjs --teste
//   node gerar-json-toyota.cjs

const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// ======================= CONFIGURACAO =======================
const ARQUIVO_EXCEL = "./POLITICA/POLITICA VENDAS ATUALIZADA TOYOTA.xlsm";
const NOME_ABA = "EXPORTACAO_WEB";
const MES_REFERENCIA = "NOVEMBRO/2026";
const LINHA_INICIO_DADOS = 2;

const COLUNAS = {
  familia: 0,      // A
  modelo: 1,       // B
  anoModelo: 2,    // C
  pps: 3,          // D
  margem: 4,       // E
  bonusTexto: 5,   // F
  brasilia: 6,     // G
  gbh: 7,          // H
  es: 8,           // I
  lesteZm: 9,      // J
  trimg: 10,       // K
};

// Na Toyota os campos ainda estao sendo completados. Por isso, por padrao,
// PPS zero/ausente NAO elimina o modelo. Mude para true quando PPS estiver
// definitivo e zero passar a significar modelo desativado.
const PULAR_MODELOS_COM_PPS_ZERO = false;

// Grava direto na pasta consumida pelo React.
const ARQUIVO_SAIDA = "./src/data/politica.json";
// ======================= FIM DA CONFIGURACAO =======================

const modoTeste = process.argv.includes("--teste");

function limparTexto(valor) {
  if (valor === undefined || valor === null) return "";
  return String(valor).trim();
}

// Converte numeros do Excel e textos pt-BR.
// Para campos numericos gerais, vazio/invalido vira 0.
function numero(valor) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const texto = limparTexto(valor);
  if (!texto || texto === "*" || /^N\/?D$/i.test(texto)) return 0;

  const semMoeda = texto.replace(/R\$/gi, "").replace(/\s/g, "");
  let normalizado = semMoeda;

  // 1.234,56 -> 1234.56 | 0,08 -> 0.08
  if (semMoeda.includes(",")) {
    normalizado = semMoeda.replace(/\./g, "").replace(",", ".");
  }

  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
}

// Para regionais, ausencia de preco NAO pode virar R$ 0,00.
// null significa "politica ainda nao cadastrada / nao informada".
function numeroRegional(valor) {
  if (valor === undefined || valor === null || valor === "") return null;
  if (typeof valor === "number") return Number.isFinite(valor) && valor > 0 ? valor : null;

  const texto = limparTexto(valor);
  if (!texto || texto === "*" || /^(N\/?D|N\/A|PENDENTE|NAO SE APLICA)$/i.test(texto)) {
    return null;
  }

  const n = numero(texto);
  return n > 0 ? n : null;
}

function main() {
  const caminho = path.resolve(ARQUIVO_EXCEL);

  if (!fs.existsSync(caminho)) {
    console.error(`\nArquivo nao encontrado: ${caminho}`);
    console.error("Confira ARQUIVO_EXCEL no topo do gerar-json-toyota.cjs.\n");
    process.exit(1);
  }

  const workbook = XLSX.readFile(caminho, { cellDates: false });

  if (!workbook.SheetNames.includes(NOME_ABA)) {
    console.error(`\nAba \"${NOME_ABA}\" nao encontrada.`);
    console.error("Abas disponiveis:");
    console.error(workbook.SheetNames.join(", ") + "\n");
    process.exit(1);
  }

  const planilha = workbook.Sheets[NOME_ABA];
  const linhas = XLSX.utils.sheet_to_json(planilha, {
    header: 1,
    blankrows: false,
    defval: "",
    raw: true,
  });

  const modelos = [];
  const avisos = [];
  const pulados = [];

  for (let i = LINHA_INICIO_DADOS - 1; i < linhas.length; i++) {
    const linha = linhas[i];
    const familia = limparTexto(linha[COLUNAS.familia]);
    const modelo = limparTexto(linha[COLUNAS.modelo]);

    // Ignora linhas completamente vazias, mas nao interrompe a leitura.
    if (!familia && !modelo) continue;

    if (!modelo) {
      avisos.push(`Linha ${i + 1}: familia \"${familia}\" sem Modelo. Linha ignorada.`);
      continue;
    }

    const pps = numero(linha[COLUNAS.pps]);
    if (PULAR_MODELOS_COM_PPS_ZERO && pps === 0) {
      pulados.push(`Linha ${i + 1}: ${familia} / ${modelo}`);
      continue;
    }

    if (!familia) {
      avisos.push(`Linha ${i + 1}: modelo \"${modelo}\" sem FAMILIA.`);
    }

    const regionais = {
      "TOYOTA BRASILIA": numeroRegional(linha[COLUNAS.brasilia]),
      "TOYOTA GBH": numeroRegional(linha[COLUNAS.gbh]),
      "TOYOTA ES": numeroRegional(linha[COLUNAS.es]),
      "TOYOTA LESTE & ZM": numeroRegional(linha[COLUNAS.lesteZm]),
      "TOYOTA TRIMG": numeroRegional(linha[COLUNAS.trimg]),
    };

    const regionaisPendentes = Object.entries(regionais)
      .filter(([, valor]) => valor === null)
      .map(([nome]) => nome);

    if (regionaisPendentes.length) {
      avisos.push(
        `Linha ${i + 1}: ${modelo} sem preco em ${regionaisPendentes.join(", ")}.`
      );
    }

    const item = {
      familia,
      modelo,
      anoModelo: limparTexto(linha[COLUNAS.anoModelo]),
      pps,
      margem: numero(linha[COLUNAS.margem]),
      lb: 0,
      bonus: 0,
      regionais,
      observacao: limparTexto(linha[COLUNAS.bonusTexto]),
      tipoAutorizacao: "REGIONAL",
    };

    modelos.push(item);

    if (modoTeste) {
      console.log(`\n--- Linha ${i + 1} da planilha ---`);
      console.dir(item, { depth: null });
    }
  }

  if (pulados.length) {
    console.log("\nModelos IGNORADOS por PPS = 0:");
    pulados.forEach((m) => console.log("  - " + m));
  }

  if (avisos.length) {
    console.log("\nAVISOS DA LEITURA:");
    avisos.forEach((a) => console.log("  - " + a));
  }

  console.log(`\nTotal de modelos Toyota lidos: ${modelos.length}`);

  if (modoTeste) {
    console.log("MODO TESTE: nenhum arquivo foi gravado.");
    console.log("Se os dados estiverem corretos, rode: node gerar-json-toyota.cjs\n");
    return;
  }

  const resultado = {
    marca: "TOYOTA",
    mesReferencia: MES_REFERENCIA,
    modelos,
  };

  const destino = path.resolve(ARQUIVO_SAIDA);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, JSON.stringify(resultado, null, 2), "utf-8");

  console.log(`Arquivo gerado: ${destino}`);
  console.log("O simulador pode importar: src/data/politica.json\n");
}

main();
