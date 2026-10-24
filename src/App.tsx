import React, { useState, useEffect, useId } from 'react';
import {
  Compass,
  Copy,
  Check,
  RotateCcw,
  Code2,
  Download,
  MapPin,
  ExternalLink,
  History,
  Info,
  Layers,
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  decimalParaGMS,
  gmsParaDecimal,
  validarIntervalo,
  isSinalNegativo,
  gerarCodigoHTMLPuro,
  TipoCoordenada,
  ConvencaoDirecao,
  ResultadoGMS,
} from './utils/coordinateConverter.ts';
import { historicoService, ItemHistorico } from './services/historicoService';

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState<'simples' | 'par' | 'inverso' | 'codigo' | 'historico'>('simples');

  // Modo Simples
  const [tipoCoord, setTipoCoord] = useState<TipoCoordenada>('latitude');
  const [valorDecimal, setValorDecimal] = useState<string>('-23.5505');
  const [precisaoSegundos, setPrecisaoSegundos] = useState<number>(2);
  const [convencao, setConvencao] = useState<ConvencaoDirecao>('PT');
  const [resultado, setResultado] = useState<ResultadoGMS | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [mostrarPassos, setMostrarPassos] = useState(false);

  // Modo Par Completo (Lat / Lon)
  const [latPar, setLatPar] = useState<string>('-23.5505');
  const [lonPar, setLonPar] = useState<string>('-46.6333');
  const [resultadoPar, setResultadoPar] = useState<{
    lat: ResultadoGMS | null;
    lon: ResultadoGMS | null;
    completo: string;
  } | null>(null);
  const [erroParLat, setErroParLat] = useState<string | null>(null);
  const [erroParLon, setErroParLon] = useState<string | null>(null);
  const [copiadoPar, setCopiadoPar] = useState(false);

  // Modo Inverso (GMS para Decimal)
  const [invGraus, setInvGraus] = useState<string>('23');
  const [invMinutos, setInvMinutos] = useState<string>('33');
  const [invSegundos, setInvSegundos] = useState<string>('1.80');
  const [invDirecao, setInvDirecao] = useState<'N' | 'S' | 'L' | 'O' | 'E' | 'W'>('S');
  const [resultadoInverso, setResultadoInverso] = useState<number | null>(null);
  const [copiadoInverso, setCopiadoInverso] = useState(false);

  // Histórico
  const [historico, setHistorico] = useState<ItemHistorico[]>(historicoService.getHistorico());

  // IDs para acessibilidade
  const inputCoordId = useId();
  const inputLatParId = useId();
  const inputLonParId = useId();

  // Executa o cálculo para o modo simples
  const calcularSimples = (valStr: string, tipo: TipoCoordenada, prec: number, conv: ConvencaoDirecao) => {
    if (!valStr || valStr.trim() === '') {
      setResultado(null);
      setErro(null);
      return;
    }

    const cleanStr = valStr.trim().replace(',', '.');
    let num = parseFloat(cleanStr);
    if (isNaN(num)) {
      setErro('Por favor, digite um número decimal válido (ex: -23.5505).');
      setResultado(null);
      return;
    }

    // Preservar bit de sinal do zero negativo (-0.0) sob IEEE 754
    if (cleanStr.startsWith('-') && num === 0) {
      num = -0;
    }

    const validacao = validarIntervalo(num, tipo);
    if (!validacao.valido) {
      setErro(validacao.mensagem || 'Valor fora dos limites geográficos.');
      setResultado(null);
      return;
    }

    setErro(null);
    const res = decimalParaGMS(num, tipo, prec, conv);
    setResultado(res);
  };

  // Efeito para cálculo em tempo real ao mudar parâmetros simples
  useEffect(() => {
    calcularSimples(valorDecimal, tipoCoord, precisaoSegundos, convencao);
  }, [valorDecimal, tipoCoord, precisaoSegundos, convencao]);

  // Executa cálculo do par completo
  useEffect(() => {
    let latRes: ResultadoGMS | null = null;
    let lonRes: ResultadoGMS | null = null;
    let errLat: string | null = null;
    let errLon: string | null = null;

    if (latPar.trim()) {
      const cleanLat = latPar.trim().replace(',', '.');
      let numLat = parseFloat(cleanLat);
      if (cleanLat.startsWith('-') && numLat === 0) {
        numLat = -0;
      }

      if (isNaN(numLat)) {
        errLat = 'Latitude inválida';
      } else {
        const val = validarIntervalo(numLat, 'latitude');
        if (!val.valido) errLat = val.mensagem!;
        else latRes = decimalParaGMS(numLat, 'latitude', precisaoSegundos, convencao);
      }
    }

    if (lonPar.trim()) {
      const cleanLon = lonPar.trim().replace(',', '.');
      let numLon = parseFloat(cleanLon);
      if (cleanLon.startsWith('-') && numLon === 0) {
        numLon = -0;
      }

      if (isNaN(numLon)) {
        errLon = 'Longitude inválida';
      } else {
        const val = validarIntervalo(numLon, 'longitude');
        if (!val.valido) errLon = val.mensagem!;
        else lonRes = decimalParaGMS(numLon, 'longitude', precisaoSegundos, convencao);
      }
    }

    setErroParLat(errLat);
    setErroParLon(errLon);

    if (latRes && lonRes) {
      setResultadoPar({
        lat: latRes,
        lon: lonRes,
        completo: `${latRes.formatado}, ${lonRes.formatado}`,
      });
    } else {
      setResultadoPar(null);
    }
  }, [latPar, lonPar, precisaoSegundos, convencao]);

  // Executa cálculo do modo inverso
  useEffect(() => {
    const g = parseFloat(invGraus.replace(',', '.')) || 0;
    const m = parseFloat(invMinutos.replace(',', '.')) || 0;
    const s = parseFloat(invSegundos.replace(',', '.')) || 0;

    if (!isNaN(g) && !isNaN(m) && !isNaN(s)) {
      const dec = gmsParaDecimal(g, m, s, invDirecao, 6);
      setResultadoInverso(dec);
    } else {
      setResultadoInverso(null);
    }
  }, [invGraus, invMinutos, invSegundos, invDirecao]);

  // Função manual ao clicar no botão Converter (adiciona ao histórico)
  const lidarComConverter = () => {
    calcularSimples(valorDecimal, tipoCoord, precisaoSegundos, convencao);
    if (resultado) {
      salvarNoHistorico(valorDecimal, tipoCoord, resultado);
    }
  };

  const salvarNoHistorico = (entrada: string, tipo: TipoCoordenada, res: ResultadoGMS) => {
    const novoItem: ItemHistorico = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      categoria: 'simples',
      tipoCoordenada: tipo,
      entradaOriginal: entrada,
      dadosEntrada: { decimal: parseFloat(entrada) },
      saidaFormatada: res.formatado,
      saidaCompacta: res.formatadoCompacto,
      hemisferios: [res.direcao],
      precisaoSegundos: 2, // Default
    };
    historicoService.salvarItem(novoItem);
    setHistorico(historicoService.getHistorico());
  };

  const lidarComLimpar = () => {
    setValorDecimal('');
    setResultado(null);
    setErro(null);
  };

  const copiarTexto = async (texto: string, setStatus: (val: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(texto);
      setStatus(true);
      setTimeout(() => setStatus(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = texto;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setStatus(true);
      setTimeout(() => setStatus(false), 2000);
    }
  };

  const baixarHTMLPuro = () => {
    const conteudo = gerarCodigoHTMLPuro();
    const blob = new Blob([conteudo], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'calculadora-coordenadas-gms.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const aplicarExemplo = (coord: number, tipo: TipoCoordenada) => {
    setTipoCoord(tipo);
    setValorDecimal(coord.toString());
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      {/* Top Header Minimalista */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 leading-none">
                Calculadora Decimal → GMS
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Conversor de coordenadas geográficas nativo e de alta precisão
              </p>
            </div>
          </div>

          {/* Abas Superiores */}
          <nav className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600 w-full sm:w-auto">
            <button
              onClick={() => setAbaAtiva('simples')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${abaAtiva === 'simples'
                ? 'bg-white text-sky-700 shadow-xs font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-200/60'
                }`}
            >
              <span>Coordenada Única</span>
            </button>
            <button
              onClick={() => setAbaAtiva('par')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${abaAtiva === 'par'
                ? 'bg-white text-sky-700 shadow-xs font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-200/60'
                }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Par Lat/Lon</span>
            </button>
            <button
              onClick={() => setAbaAtiva('inverso')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${abaAtiva === 'inverso'
                ? 'bg-white text-sky-700 shadow-xs font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-200/60'
                }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>GMS → Decimal</span>
            </button>
            <button
              onClick={() => setAbaAtiva('historico')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${abaAtiva === 'historico'
                ? 'bg-white text-sky-700 shadow-xs font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-200/60'
                }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Histórico</span>
            </button>
            <button
              onClick={() => setAbaAtiva('codigo')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${abaAtiva === 'codigo'
                ? 'bg-white text-sky-700 shadow-xs font-semibold'
                : 'hover:text-slate-900 hover:bg-slate-200/60'
                }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Código Puro</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10 w-full flex-1">
        {/* ABA 1: COORDENADA ÚNICA (Foco dos Requisitos) */}
        {abaAtiva === 'simples' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Cartão Principal da Calculadora */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs">
              {/* Seletor de Tipo e Limites */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tipo de Coordenada</span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setTipoCoord('latitude')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer flex items-center gap-1.5 ${tipoCoord === 'latitude'
                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                      Latitude (-90° a +90°)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoCoord('longitude')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer flex items-center gap-1.5 ${tipoCoord === 'longitude'
                        ? 'bg-sky-50 text-sky-700 border border-sky-200'
                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                      Longitude (-180° a +180°)
                    </button>
                  </div>
                </div>

                {/* Opções de precisão e convenção */}
                <div className="flex items-center gap-2 self-start sm:self-end">
                  <div className="text-right">
                    <label className="text-[11px] font-semibold text-slate-500 block">Precisão Segundos</label>
                    <select
                      value={precisaoSegundos}
                      onChange={(e) => setPrecisaoSegundos(Number(e.target.value))}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-sky-500 cursor-pointer"
                    >
                      <option value={1}>1 casa (.X)</option>
                      <option value={2}>2 casas (.XX)</option>
                      <option value={3}>3 casas (.XXX)</option>
                      <option value={4}>4 casas (.XXXX)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block">Direção</label>
                    <select
                      value={convencao}
                      onChange={(e) => setConvencao(e.target.value as ConvencaoDirecao)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-sky-500 cursor-pointer"
                    >
                      <option value="PT">PT (N / S / L / O)</option>
                      <option value="EN">EN (N / S / E / W)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Campo de Entrada (Input Decimal) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor={inputCoordId} className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <span>Coordenada Decimal</span>
                    <span className="text-xs font-normal text-slate-400">
                      ({tipoCoord === 'latitude' ? 'Valores negativos = Sul' : 'Valores negativos = Oeste'})
                    </span>
                  </label>
                  <span className="text-xs font-mono text-slate-500">
                    Limite: {tipoCoord === 'latitude' ? '[-90.00 a 90.00]' : '[-180.00 a 180.00]'}
                  </span>
                </div>

                <div className="relative">
                  <input
                    id={inputCoordId}
                    type="number"
                    step="any"
                    value={valorDecimal}
                    onChange={(e) => setValorDecimal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') lidarComConverter();
                      if (e.key === 'Escape') lidarComLimpar();
                    }}
                    placeholder="Ex: -23.5505"
                    className={`w-full px-4 py-3.5 bg-slate-50 border rounded-xl font-mono text-lg text-slate-900 transition-all outline-none ${erro
                      ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500 focus:ring-3 focus:ring-rose-100'
                      : 'border-slate-300 focus:border-sky-500 focus:bg-white focus:ring-3 focus:ring-sky-100'
                      }`}
                  />
                  {valorDecimal && (
                    <button
                      type="button"
                      onClick={lidarComLimpar}
                      title="Limpar campo"
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md text-xs font-medium cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Mensagem de Erro ou Validação */}
                {erro && (
                  <p className="text-xs font-medium text-rose-600 flex items-center gap-1.5 pt-1 animate-fadeIn">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    {erro}
                  </p>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-3 mt-5">
                <button
                  type="button"
                  onClick={lidarComConverter}
                  className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-medium py-3 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <span>Converter</span>
                </button>
                <button
                  type="button"
                  onClick={lidarComLimpar}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Limpar</span>
                </button>
              </div>

              {/* Área de Resultado Formatada */}
              {resultado ? (
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <div className="bg-sky-50/60 border border-slate-200 shadow-sm rounded-xl p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold tracking-wider uppercase text-sky-800">
                        Resultado Formatado (GMS)
                      </span>
                      <span className="text-xs font-medium bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
                        Hemisfério {resultado.direcaoNome} ({resultado.direcao})
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3">
                      <div className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 select-all">
                        {resultado.formatado}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          copiarTexto(resultado.formatado, setCopiado);
                          salvarNoHistorico(valorDecimal, tipoCoord, resultado);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs ${copiado
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                          }`}
                      >
                        {copiado ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Blocos decompostos de visualização */}
                    <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-sky-100/80 text-center">
                      <div className="bg-white/80 p-2 rounded-lg border border-sky-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Graus (°)</span>
                        <span className="font-mono text-base font-semibold text-slate-800">{resultado.graus}°</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-sky-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Minutos (')</span>
                        <span className="font-mono text-base font-semibold text-slate-800">{resultado.minutos}'</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-sky-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Segundos (")</span>
                        <span className="font-mono text-base font-semibold text-slate-800">{resultado.segundos}"</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-lg border border-sky-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Direção</span>
                        <span className="font-mono text-base font-bold text-sky-600">{resultado.direcao}</span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle para Passo a Passo Matemático */}
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setMostrarPassos(!mostrarPassos)}
                      className="text-xs font-semibold text-slate-500 hover:text-sky-700 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>{mostrarPassos ? 'Ocultar memória de cálculo' : 'Ver memória de cálculo matemática'}</span>
                      {mostrarPassos ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {mostrarPassos && (
                      <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-700 space-y-2">
                        <div className="text-slate-500 text-[11px] font-sans font-medium">
                          Memória de cálculo rigorosa (IEEE 754):
                        </div>
                        <div className="p-2.5 bg-white rounded-lg border border-slate-100 space-y-1.5">
                          <div>
                            1. Valor absoluto = <span className="font-semibold">{resultado.passoAPasso.absoluto}</span>
                          </div>
                          <div>
                            2. Graus preliminares = floor({resultado.passoAPasso.absoluto}) = <span className="font-semibold text-sky-700">{Math.floor(resultado.passoAPasso.absoluto)}°</span>
                          </div>
                          <div>
                            3. Resto dos graus = {resultado.passoAPasso.absoluto} - {Math.floor(resultado.passoAPasso.absoluto)} = {resultado.passoAPasso.restoGraus}°
                          </div>
                          <div>
                            4. Minutos contínuos = {resultado.passoAPasso.restoGraus} × 60 = {resultado.passoAPasso.minutosFloat}'
                          </div>
                          <div>
                            5. Minutos preliminares = floor({resultado.passoAPasso.minutosFloat}) = <span className="font-semibold text-sky-700">{Math.floor(resultado.passoAPasso.minutosFloat)}'</span>
                          </div>
                          <div>
                            6. Segundos contínuos = ({resultado.passoAPasso.minutosFloat} - {Math.floor(resultado.passoAPasso.minutosFloat)}) × 60 = {resultado.passoAPasso.segundosFloat}"
                          </div>
                          <div>
                            7. Quantização Inteira (IEEE 754) = <span className="font-semibold text-sky-700">{resultado.graus}° {resultado.minutos}' {resultado.segundos}"</span>
                          </div>
                          <div>
                            8. Detecção de Sinal (IEEE 754) = <span className="font-semibold text-sky-700">{resultado.direcao}</span> ({resultado.direcaoNome})
                          </div>
                          {resultado.passoAPasso.houveCarry && (
                            <div className="mt-2 p-2 bg-sky-50 text-sky-800 rounded border border-sky-100 text-[11px] font-sans">
                              <strong>Ajuste de Arredondamento IEEE 754:</strong> Os segundos atingiram o limiar de quantização da precisão configurada e propagaram transporte (+1) para os minutos/graus, prevenindo saídas anômalas como 60.00" ou 59.999999".
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-6 pt-5 border-t border-slate-100 text-center py-6 text-slate-400">
                  <Compass className="w-8 h-8 stroke-1 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs">Digite uma coordenada acima para ver o resultado em tempo real.</p>
                </div>
              )}
            </div>

            {/* Painel Lateral: Exemplos Rápidos e Histórico */}
            <div className="lg:col-span-4 space-y-5">
              {/* Exemplos Rápidos */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Exemplos Prontos</h2>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: 'São Paulo (Critério)', coord: -23.5505, tipo: 'latitude' as const, note: 'Esperado: 23° 33\' 1.80" S' },
                    { label: 'Rio de Janeiro', coord: -22.9068, tipo: 'latitude' as const, note: 'Latitude Sul' },
                    { label: 'Brasília (Distrito Fed.)', coord: -15.7975, tipo: 'latitude' as const, note: 'Centro-Oeste' },
                    { label: 'Nova York', coord: -74.0060, tipo: 'longitude' as const, note: 'Longitude Oeste' },
                    { label: 'Meridiano de Greenwich', coord: 0.0000, tipo: 'longitude' as const, note: 'Longitude Zero' },
                  ].map((ex) => (
                    <button
                      key={ex.label}
                      type="button"
                      onClick={() => aplicarExemplo(ex.coord, ex.tipo)}
                      className="w-full text-left p-2.5 rounded-lg border border-slate-100 hover:border-sky-300 hover:bg-sky-50/50 transition flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-800 group-hover:text-sky-700">
                          {ex.label}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {ex.coord} ({ex.tipo})
                        </div>
                      </div>
                      <span className="text-[10px] text-sky-600 font-medium opacity-0 group-hover:opacity-100 transition">
                        Usar →
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Histórico Recente */}
              {historico.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs animate-fadeIn">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-slate-500" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Recentes</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHistorico([])}
                      className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {historico.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-mono font-bold text-slate-800">{item.saidaFormatada}</div>
                          <div className="text-[10px] text-slate-400">
                            {item.entradaOriginal} ({item.tipoCoordenada}) • {new Date(item.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setValorDecimal(item.entradaOriginal);
                            if (item.tipoCoordenada) {
                              setTipoCoord(item.tipoCoordenada);
                            }
                          }}
                          className="text-sky-600 hover:text-sky-800 text-[11px] font-medium cursor-pointer"
                        >
                          Carregar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 2: PAR COMPLETO (LATITUDE + LONGITUDE) */}
        {abaAtiva === 'par' && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs">
            <div className="mb-5 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Conversão de Par de Coordenadas (Lat / Lon)</h2>
              <p className="text-xs text-slate-500 mt-1">
                Converta simultaneamente Latitude e Longitude para obter o ponto geográfico completo.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Latitude Input */}
              <div className="space-y-1.5">
                <label htmlFor={inputLatParId} className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Latitude (-90 a 90)
                </label>
                <input
                  id={inputLatParId}
                  type="number"
                  step="any"
                  value={latPar}
                  onChange={(e) => setLatPar(e.target.value)}
                  placeholder="Ex: -23.5505"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm text-slate-900 focus:outline-sky-500 focus:bg-white"
                />
                {erroParLat && <p className="text-xs text-rose-500">{erroParLat}</p>}
              </div>

              {/* Longitude Input */}
              <div className="space-y-1.5">
                <label htmlFor={inputLonParId} className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                  Longitude (-180 a 180)
                </label>
                <input
                  id={inputLonParId}
                  type="number"
                  step="any"
                  value={lonPar}
                  onChange={(e) => setLonPar(e.target.value)}
                  placeholder="Ex: -46.6333"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm text-slate-900 focus:outline-sky-500 focus:bg-white"
                />
                {erroParLon && <p className="text-xs text-rose-500">{erroParLon}</p>}
              </div>
            </div>

            {/* Presets do par */}
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-[11px] font-semibold text-slate-400 self-center">Locais:</span>
              {[
                { nome: 'São Paulo', lat: '-23.5505', lon: '-46.6333' },
                { nome: 'Rio de Janeiro', lat: '-22.9068', lon: '-43.1729' },
                { nome: 'Brasília', lat: '-15.7975', lon: '-47.8919' },
                { nome: 'Lisboa', lat: '38.7223', lon: '-9.1393' },
              ].map((p) => (
                <button
                  key={p.nome}
                  type="button"
                  onClick={() => {
                    setLatPar(p.lat);
                    setLonPar(p.lon);
                  }}
                  className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                >
                  {p.nome}
                </button>
              ))}
            </div>

            {/* Resultado do Par */}
            {resultadoPar && (
              <div className="mt-6 p-4 sm:p-5 bg-sky-50/70 border border-sky-150 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-800">Coordenadas em GMS</span>
                  <button
                    type="button"
                    onClick={() => copiarTexto(resultadoPar.completo, setCopiadoPar)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    {copiadoPar ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoPar ? 'Copiado!' : 'Copiar Par'}</span>
                  </button>
                </div>

                <div className="font-mono text-xl sm:text-2xl font-bold text-slate-900 select-all">
                  {resultadoPar.completo}
                </div>

                <div className="flex items-center gap-3 pt-2 text-xs">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${latPar},${lonPar}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sky-700 hover:underline font-medium"
                  >
                    <span>Abrir no Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-slate-300">•</span>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${latPar}&mlon=${lonPar}#map=14/${latPar}/${lonPar}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sky-700 hover:underline font-medium"
                  >
                    <span>OpenStreetMap</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 3: CONVERSÃO INVERSA (GMS PARA DECIMAL) */}
        {abaAtiva === 'inverso' && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs">
            <div className="mb-5 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Conversão Inversa: GMS → Decimal</h2>
              <p className="text-xs text-slate-500 mt-1">
                Converta valores em Graus, Minutos e Segundos para o formato decimal (-23.5505).
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Graus (°)
                </label>
                <input
                  type="number"
                  min="0"
                  max="180"
                  value={invGraus}
                  onChange={(e) => setInvGraus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm text-slate-900 focus:outline-sky-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Minutos (')
                </label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={invMinutos}
                  onChange={(e) => setInvMinutos(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm text-slate-900 focus:outline-sky-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Segundos (")
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="59.9999"
                  value={invSegundos}
                  onChange={(e) => setInvSegundos(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm text-slate-900 focus:outline-sky-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Direção
                </label>
                <select
                  value={invDirecao}
                  onChange={(e) => setInvDirecao(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-sky-500 cursor-pointer"
                >
                  <option value="S">S (Sul - Negativo)</option>
                  <option value="N">N (Norte - Positivo)</option>
                  <option value="O">O (Oeste - Negativo)</option>
                  <option value="W">W (West - Negativo)</option>
                  <option value="L">L (Leste - Positivo)</option>
                  <option value="E">E (East - Positivo)</option>
                </select>
              </div>
            </div>

            {/* Resultado Inverso */}
            {resultadoInverso !== null && (
              <div className="mt-6 p-5 bg-sky-50/70 border border-sky-150 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-800">
                    Coordenada em Decimal
                  </span>
                  <button
                    type="button"
                    onClick={() => copiarTexto(resultadoInverso.toString(), setCopiadoInverso)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    {copiadoInverso ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiadoInverso ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-bold text-slate-900 select-all">
                  {resultadoInverso}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Fórmula: sinal × (graus + minutos/60 + segundos/3600)
                </p>
              </div>
            )}
          </div>
        )}

        {/* ABA 4: HISTÓRICO DE CONVERSÕES */}
        {abaAtiva === 'historico' && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-sky-600" />
                <span>Histórico de Conversões</span>
              </h2>
              {historico.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistorico([])}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  Limpar Histórico
                </button>
              )}
            </div>

            {historico.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <History className="w-12 h-12 stroke-1 mx-auto mb-3" />
                <p>Nenhuma conversão recente encontrada.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historico.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <div className="font-mono text-lg font-bold text-slate-900">{item.saidaFormatada}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Entrada: {item.entradaOriginal} ({item.tipoCoordenada}) • {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA 5: CÓDIGO PURO NATIVO (Zero-Dependency HTML/JS) */}
        {abaAtiva === 'codigo' && (
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-sky-600" />
                  <span>Código Standalone Nativo (HTML5 + JS Puro)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Atende 100% aos requisitos de arquivo único, zero dependências, sem CDNs nem frameworks.
                </p>
              </div>
              <button
                type="button"
                onClick={baixarHTMLPuro}
                className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                <span>Baixar .HTML Standalone</span>
              </button>
            </div>

            <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[480px]">
              <pre>{gerarCodigoHTMLPuro()}</pre>
            </div>
          </div>
        )}
      </main>

      {/* Footer Minimalista */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Calculadora de Coordenadas Geográficas • Padrão GMS WGS84</span>
          <span>Validação: -90° a +90° (Lat) | -180° a +180° (Lon)</span>
        </div>
      </footer>
    </div>
  );
}
