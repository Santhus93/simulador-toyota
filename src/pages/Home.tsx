import { useMemo, useState } from "react";
import politica from "../data/politica.json";

interface Modelo {
  familia: string;
  modelo: string;
  anoModelo: string;
  pps: number;
  margem: number;
  lb: number;
  bonus: number;
  regionais: Record<string, number | null>;
  observacao: string;
  tipoAutorizacao?: string;
}

function formatarDigitosParaMoeda(valor: string): string {
  const somenteNumeros = valor.replace(/\D/g, "");

  if (!somenteNumeros) return "";

  const valorEmCentavos = Number.parseInt(somenteNumeros, 10);
  const valorEmReais = valorEmCentavos / 100;

  return valorEmReais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function moedaParaNumero(valorFormatado: string): number {
  if (!valorFormatado) return 0;

  const limpo = valorFormatado
    .replace("R$", "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const numero = Number.parseFloat(limpo);
  return Number.isFinite(numero) ? numero : 0;
}

function numeroParaMoedaInicial(valor: number): string {
  if (!valor) return "";

  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatarPercentual(valor: number): string {
  return (valor * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function nomeRegionalExibicao(regional: string): string {
  return regional.replace("TOYOTA ", "");
}

export default function Home() {
  const [familia, setFamilia] = useState("");
  const [modelo, setModelo] = useState("");
  const [anoModelo, setAnoModelo] = useState("");
  const [regional, setRegional] = useState("");
  const [valorNF, setValorNF] = useState("");
  const [bonus, setBonus] = useState("");
  const [incidencia, setIncidencia] = useState("");
  const [cliente, setCliente] = useState("");
  const [chassi, setChassi] = useState("");
  const [usadoNaTroca, setUsadoNaTroca] = useState("");
  const [calculado, setCalculado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const modelos = politica.modelos as Modelo[];

  const familias = useMemo(
    () => [...new Set(modelos.map((item) => item.familia).filter(Boolean))],
    [modelos]
  );

  const modelosDaFamilia = useMemo(
    () => modelos.filter((item) => item.familia === familia),
    [modelos, familia]
  );

  const nomesModelos = useMemo(
    () => [...new Set(modelosDaFamilia.map((item) => item.modelo))],
    [modelosDaFamilia]
  );

  const anosModelo = useMemo(
    () => [
      ...new Set(
        modelosDaFamilia
          .filter((item) => item.modelo === modelo)
          .map((item) => item.anoModelo)
      ),
    ],
    [modelosDaFamilia, modelo]
  );

  const modeloSelecionado = modelos.find(
    (item) =>
      item.familia === familia &&
      item.modelo === modelo &&
      item.anoModelo === anoModelo
  );

  const regionais = modeloSelecionado
    ? Object.keys(modeloSelecionado.regionais)
    : [];

  const valorMinimo =
    modeloSelecionado && regional
      ? modeloSelecionado.regionais[regional]
      : undefined;

  const pps = modeloSelecionado?.pps ?? 0;
  const margem = modeloSelecionado?.margem ?? 0;
  const margemPPS = pps * margem;

  const nValorNF = moedaParaNumero(valorNF);
  const nBonus = moedaParaNumero(bonus);
  const nIncidencia = moedaParaNumero(incidencia);

  const desvioCalculo = pps - (nValorNF + nBonus - nIncidencia);
  const valorAlcancado = margemPPS - desvioCalculo;
  const desvio = nValorNF - (valorMinimo ?? 0);

  const percMargemMinima =
    valorMinimo != null && valorMinimo > 0
      ? (margemPPS - (pps - valorMinimo)) / valorMinimo
      : 0;

  const percMargemAlcancada =
    nValorNF + nBonus > 0 ? valorAlcancado / (nValorNF + nBonus) : 0;

  const desvioMargem = percMargemAlcancada - percMargemMinima;

  let alcada: "LIBERADO" | "AMARELO" | "VERMELHO" = "LIBERADO";

  if (percMargemAlcancada < percMargemMinima - 0.01) {
    alcada = "VERMELHO";
  } else if (percMargemAlcancada < percMargemMinima) {
    alcada = "AMARELO";
  }

  const tipoAutorizacao = modeloSelecionado?.tipoAutorizacao ?? "REGIONAL";

  const textoAlcada =
    alcada === "LIBERADO"
      ? "LIBERADO FATURAMENTO"
      : `AUTORIZAÇÃO ${tipoAutorizacao}`;

  const corAlcada =
    alcada === "LIBERADO"
      ? "#2e7d32"
      : alcada === "AMARELO"
      ? "#f9a825"
      : "#eb0a1e";

  const politicaPendente = valorMinimo == null || valorMinimo <= 0;

  const podeCalcular =
    Boolean(familia && modelo && anoModelo && regional && valorNF) &&
    Boolean(modeloSelecionado) &&
    !politicaPendente;

  function limparResultado() {
    setCalculado(false);
    setCopiado(false);
  }

  function handleSelecionarFamilia(novaFamilia: string) {
    setFamilia(novaFamilia);
    setModelo("");
    setAnoModelo("");
    setRegional("");
    setBonus("");
    limparResultado();
  }

  function handleSelecionarModelo(novoModelo: string) {
    setModelo(novoModelo);
    setAnoModelo("");
    setRegional("");
    setBonus("");
    limparResultado();
  }

  function handleSelecionarAnoModelo(novoAnoModelo: string) {
    setAnoModelo(novoAnoModelo);
    setRegional("");
    limparResultado();

    const encontrado = modelos.find(
      (item) =>
        item.familia === familia &&
        item.modelo === modelo &&
        item.anoModelo === novoAnoModelo
    );

    setBonus(numeroParaMoedaInicial(encontrado?.bonus ?? 0));
  }

  function handleSelecionarRegional(novaRegional: string) {
    setRegional(novaRegional);
    limparResultado();
  }

  function handleCampoMoeda(
    valorDigitado: string,
    setter: (valor: string) => void
  ) {
    setter(formatarDigitosParaMoeda(valorDigitado));
    limparResultado();
  }

  function handleCalcular() {
    if (!podeCalcular) return;

    setCalculado(true);
    setCopiado(false);
  }

  function montarTextoWhatsapp(): string {
    return (
      `🚗 *SOLICITAÇÃO DE AUTORIZAÇÃO TOYOTA*

` +
      `*Cliente:* ${cliente || "-"}
` +
      `*Chassi 0km:* ${chassi || "-"}
` +
      `*Usado na troca:* ${usadoNaTroca || "-"}

` +
      `*Família:* ${familia}
` +
      `*Modelo:* ${modelo}
` +
      `*Ano/Modelo:* ${anoModelo}
` +
      `*Regional:* ${nomeRegionalExibicao(regional)}

` +
      `*Valor NF:* R$ ${formatarMoeda(nValorNF)}
` +
      `*Valor Mínimo:* R$ ${formatarMoeda(valorMinimo ?? 0)}
` +
      `*Valor Alcançado:* R$ ${formatarMoeda(valorAlcancado)}
` +
      `*Bônus:* R$ ${formatarMoeda(nBonus)}
` +
      `*Incidência:* R$ ${formatarMoeda(nIncidencia)}
` +
      `*Margem Mínima:* ${formatarPercentual(percMargemMinima)}%
` +
      `*Margem Alcançada:* ${formatarPercentual(percMargemAlcancada)}%

` +
      `*Desvio:* R$ ${formatarMoeda(desvio)}
` +
      `*Desvio de Margem:* ${desvioMargem > 0 ? "+" : ""}${formatarPercentual(
        desvioMargem
      )}%

` +
      `*ALÇADA:* ${textoAlcada}`
    );
  }

  async function handleCopiarWhatsapp() {
    const texto = montarTextoWhatsapp();

    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      alert(
        `Não foi possível copiar automaticamente. Copie manualmente:

${texto}`
      );
    }
  }

  return (
    <div className="container">
      <div className="header-app">
        <span className="badge-byd">TOYOTA</span>
        <h1>Simulador Comercial</h1>
      </div>

      <p className="subtitulo">{politica.mesReferencia}</p>

      <div className="layout">
        <div className="coluna-form">
          <div className="form-grid-3">
            <div className="campo">
              <label htmlFor="familia">Família</label>
              <select
                id="familia"
                value={familia}
                onChange={(event) =>
                  handleSelecionarFamilia(event.target.value)
                }
              >
                <option value="">Selecione...</option>
                {familias.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="modelo">Modelo</label>
              <select
                id="modelo"
                value={modelo}
                onChange={(event) =>
                  handleSelecionarModelo(event.target.value)
                }
                disabled={!familia}
              >
                <option value="">Selecione...</option>
                {nomesModelos.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="anoModelo">Ano/Modelo</label>
              <select
                id="anoModelo"
                value={anoModelo}
                onChange={(event) =>
                  handleSelecionarAnoModelo(event.target.value)
                }
                disabled={!modelo}
              >
                <option value="">Selecione...</option>
                {anosModelo.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="regional">Regional</label>
              <select
                id="regional"
                value={regional}
                onChange={(event) =>
                  handleSelecionarRegional(event.target.value)
                }
                disabled={!modeloSelecionado}
              >
                <option value="">Selecione...</option>
                {regionais.map((item) => (
                  <option key={item} value={item}>
                    {nomeRegionalExibicao(item)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="secao-card">
            <h3 className="secao-titulo">Dados da Negociação</h3>

            <div className="form-grid-3">
              <div className="campo">
                <label htmlFor="valorNF">Valor NF (Preço Pleiteado)</label>
                <input
                  id="valorNF"
                  type="text"
                  inputMode="numeric"
                  value={valorNF}
                  onChange={(event) =>
                    handleCampoMoeda(event.target.value, setValorNF)
                  }
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="campo">
                <label htmlFor="bonus">Bônus</label>
                <input
                  id="bonus"
                  type="text"
                  inputMode="numeric"
                  value={bonus}
                  onChange={(event) =>
                    handleCampoMoeda(event.target.value, setBonus)
                  }
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="campo">
                <label htmlFor="incidencia">Incidência (Bancagem)</label>
                <input
                  id="incidencia"
                  type="text"
                  inputMode="numeric"
                  value={incidencia}
                  onChange={(event) =>
                    handleCampoMoeda(event.target.value, setIncidencia)
                  }
                  placeholder="R$ 0,00"
                />
              </div>
            </div>
          </div>

          <div className="secao-card">
            <h3 className="secao-titulo">Dados da Venda</h3>

            <div className="form-grid-3">
              <div className="campo">
                <label htmlFor="cliente">Cliente</label>
                <input
                  id="cliente"
                  type="text"
                  value={cliente}
                  onChange={(event) => setCliente(event.target.value)}
                />
              </div>

              <div className="campo">
                <label htmlFor="chassi">Chassi 0km</label>
                <input
                  id="chassi"
                  type="text"
                  value={chassi}
                  onChange={(event) => setChassi(event.target.value)}
                />
              </div>

              <div className="campo">
                <label htmlFor="usadoNaTroca">Usado na troca</label>
                <input
                  id="usadoNaTroca"
                  type="text"
                  value={usadoNaTroca}
                  onChange={(event) => setUsadoNaTroca(event.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="botao-calcular"
            onClick={handleCalcular}
            disabled={!podeCalcular}
          >
            CALCULAR
          </button>
        </div>

        <div className="coluna-resultado">
          {modeloSelecionado && (
            <div className="card-info">
              <p>
                <strong>Família:</strong> {modeloSelecionado.familia}
              </p>
              <p>
                <strong>Ano/Modelo:</strong> {modeloSelecionado.anoModelo}
              </p>
              <p>
                <strong>PPS:</strong> R$ {formatarMoeda(pps)}
              </p>
              <p>
                <strong>Margem PPS:</strong> R$ {formatarMoeda(margemPPS)} ({(margem * 100).toFixed(0)}%)
              </p>
              <p>
                <strong>Observação:</strong>{" "}
                {modeloSelecionado.observacao || "-"}
              </p>

              {politicaPendente && regional ? (
                <p style={{ color: "#f9a825" }}>
                  <strong>
                    Política ainda não informada para esta regional.
                  </strong>
                </p>
              ) : valorMinimo != null && regional ? (
                <p>
                  <strong>
                    Valor Mínimo ({nomeRegionalExibicao(regional)}):
                  </strong>{" "}
                  R$ {formatarMoeda(valorMinimo)}
                </p>
              ) : null}
            </div>
          )}

          {!calculado && (
            <div className="resultado-placeholder">
              Preencha os dados da negociação e clique em{" "}
              <strong>CALCULAR</strong> para ver o resultado aqui.
            </div>
          )}

          {calculado && (
            <div className="resultado-box">
              <h3>Resultado</h3>

              <div className="resultado-linha">
                <span>Desvio</span>
                <span>R$ {formatarMoeda(desvio)}</span>
              </div>
              <div className="resultado-linha">
                <span>Valor Alcançado</span>
                <span>R$ {formatarMoeda(valorAlcancado)}</span>
              </div>
              <div className="resultado-linha">
                <span>Margem Mínima</span>
                <span>{formatarPercentual(percMargemMinima)}%</span>
              </div>
              <div className="resultado-linha">
                <span>Margem Alcançada</span>
                <span>{formatarPercentual(percMargemAlcancada)}%</span>
              </div>
              <div className="resultado-linha">
                <span>Desvio de Margem</span>
                <span
                  style={{
                    color:
                      desvioMargem >= 0
                        ? "#4caf50"
                        : desvioMargem >= -0.01
                        ? "#f9a825"
                        : "#eb0a1e",
                  }}
                >
                  {desvioMargem > 0 ? "+" : ""}
                  {formatarPercentual(desvioMargem)}%
                </span>
              </div>

              <div className="alcada-box" style={{ background: corAlcada }}>
                {textoAlcada}
              </div>

              <button
                type="button"
                className="botao-whatsapp"
                onClick={handleCopiarWhatsapp}
              >
                {copiado ? "✅ COPIADO!" : "📋 COPIAR PARA WHATSAPP"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
