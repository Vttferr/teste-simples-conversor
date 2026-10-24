/**
 * Funções matemáticas de conversão de coordenadas geográficas
 * Implementação rigorosa e sem dependências externas.
 */

export type TipoCoordenada = 'latitude' | 'longitude' | 'livre';
export type ConvencaoDirecao = 'PT' | 'EN'; // PT: L/O, EN: E/W

export interface ResultadoGMS {
  graus: number;
  minutos: number;
  segundos: string;
  direcao: string;
  direcaoNome: string;
  formatado: string;
  formatadoCompacto: string;
  passoAPasso: {
    decimalOriginal: number;
    absoluto: number;
    grausCalculados: number;
    restoGraus: number;
    minutosFloat: number;
    minutosCalculados: number;
    restoMinutos: number;
    segundosFloat: number;
    segundosArredondados: string;
  };
}

export interface ValidacaoCoordenada {
  valido: boolean;
  mensagem?: string;
  tipoDetectado?: TipoCoordenada;
}

/**
 * Valida os limites geográficos de uma coordenada decimal
 */
export function validarIntervalo(valor: number, tipo: TipoCoordenada): ValidacaoCoordenada {
  if (isNaN(valor)) {
    return { valido: false, mensagem: 'Por favor, insira um valor numérico válido.' };
  }

  if (tipo === 'latitude') {
    if (valor < -90 || valor > 90) {
      return {
        valido: false,
        mensagem: 'Latitude deve estar entre -90° e 90° (Sul: negativo, Norte: positivo).',
      };
    }
  } else if (tipo === 'longitude') {
    if (valor < -180 || valor > 180) {
      return {
        valido: false,
        mensagem: 'Longitude deve estar entre -180° e 180° (Oeste: negativo, Leste: positivo).',
      };
    }
  }

  return { valido: true };
}

/**
 * Converte valor decimal para Graus, Minutos e Segundos (GMS)
 * Ex: -23.5505 -> 23° 33' 1.80" S
 */
export function decimalParaGMS(
  decimal: number,
  tipo: TipoCoordenada = 'latitude',
  precisaoSegundos: number = 2,
  convencao: ConvencaoDirecao = 'PT'
): ResultadoGMS {
  const absoluto = Math.abs(decimal);
  let graus = Math.floor(absoluto);
  const restoGraus = absoluto - graus;
  const minutosFloat = restoGraus * 60;
  let minutos = Math.floor(minutosFloat);
  const restoMinutos = minutosFloat - minutos;
  const segundosFloat = restoMinutos * 60;

  // Lidar com arredondamento nos segundos (ex: 59.9999 -> 60.00)
  let segundosCalculados = Number(segundosFloat.toFixed(precisaoSegundos));
  if (segundosCalculados >= 60) {
    segundosCalculados = 0;
    minutos += 1;
    if (minutos >= 60) {
      minutos = 0;
      graus += 1;
    }
  }

  const segundosFormatado = segundosCalculados.toFixed(precisaoSegundos);

  // Determinar a direção geográfica
  let direcao = '';
  let direcaoNome = '';

  if (tipo === 'latitude') {
    if (decimal < 0) {
      direcao = 'S';
      direcaoNome = 'Sul';
    } else {
      direcao = 'N';
      direcaoNome = 'Norte';
    }
  } else if (tipo === 'longitude') {
    if (decimal < 0) {
      direcao = convencao === 'PT' ? 'O' : 'W';
      direcaoNome = 'Oeste';
    } else {
      direcao = convencao === 'PT' ? 'L' : 'E';
      direcaoNome = 'Leste';
    }
  } else {
    // Livre / Genérico
    direcao = decimal < 0 ? '-' : '+';
    direcaoNome = decimal < 0 ? 'Negativo' : 'Positivo';
  }

  const formatado = `${graus}° ${minutos}' ${segundosFormatado}" ${direcao}`.trim();
  const formatadoCompacto = `${graus}°${minutos}'${segundosFormatado}"${direcao}`;

  return {
    graus,
    minutos,
    segundos: segundosFormatado,
    direcao,
    direcaoNome,
    formatado,
    formatadoCompacto,
    passoAPasso: {
      decimalOriginal: decimal,
      absoluto,
      grausCalculados: graus,
      restoGraus,
      minutosFloat,
      minutosCalculados: minutos,
      restoMinutos,
      segundosFloat,
      segundosArredondados: segundosFormatado,
    },
  };
}

/**
 * Converte Graus, Minutos e Segundos para Decimal
 * Ex: 23° 33' 1.80" S -> -23.5505
 */
export function gmsParaDecimal(
  graus: number,
  minutos: number,
  segundos: number,
  direcao: 'N' | 'S' | 'L' | 'O' | 'E' | 'W' | '+' | '-',
  casasDecimais: number = 6
): number {
  const g = Math.abs(graus) || 0;
  const m = Math.abs(minutos) || 0;
  const s = Math.abs(segundos) || 0;

  const decimalAbsoluto = g + m / 60 + s / 3600;
  const isNegativo = ['S', 'O', 'W', '-'].includes(direcao);
  const sinal = isNegativo ? -1 : 1;

  const resultado = sinal * decimalAbsoluto;
  return Number(resultado.toFixed(casasDecimais));
}

/**
 * Gera o código HTML/JS puro standalone para o usuário exportar
 */
export function gerarCodigoHTMLPuro(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calculadora de Coordenadas (Decimal para GMS)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #f8fafc; color: #0f172a; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
    .container { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; width: 100%; max-width: 440px; padding: 2rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    h1 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: #0f172a; }
    p.desc { font-size: 0.875rem; color: #64748b; margin-bottom: 1.5rem; }
    .form-group { margin-bottom: 1.25rem; }
    label { display: block; font-size: 0.8125rem; font-weight: 500; color: #334155; margin-bottom: 0.5rem; }
    .type-radios { display: flex; gap: 1rem; margin-bottom: 1rem; }
    .radio-label { display: flex; align-items: center; gap: 0.35rem; font-size: 0.875rem; color: #334155; cursor: pointer; }
    input[type="number"] { width: 100%; padding: 0.75rem 1rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; font-family: monospace; transition: border-color 0.15s; outline: none; }
    input[type="number"]:focus { border-color: #0284c7; ring: 2px solid #bae6fd; }
    .buttons { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
    button { flex: 1; padding: 0.75rem; border-radius: 8px; font-weight: 500; font-size: 0.875rem; cursor: pointer; border: none; transition: 0.15s; }
    button.btn-primary { background: #0284c7; color: #ffffff; }
    button.btn-primary:hover { background: #0369a1; }
    button.btn-secondary { background: #f1f5f9; color: #475569; }
    button.btn-secondary:hover { background: #e2e8f0; }
    #resultado { margin-top: 1.5rem; padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; display: none; }
    #resultado.ativo { display: block; }
    .res-label { font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.05em; }
    .res-val { font-size: 1.35rem; font-family: monospace; font-weight: 600; color: #0284c7; margin: 0.35rem 0; word-break: break-all; }
    .erro { color: #dc2626; font-size: 0.8125rem; margin-top: 0.5rem; display: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Decimal para GMS</h1>
    <p class="desc">Conversor de coordenadas geográficas nativo e minimalista.</p>

    <div class="type-radios">
      <label class="radio-label">
        <input type="radio" name="tipo" value="latitude" checked onchange="converter()"> Latitude (-90 a 90)
      </label>
      <label class="radio-label">
        <input type="radio" name="tipo" value="longitude" onchange="converter()"> Longitude (-180 a 180)
      </label>
    </div>

    <div class="form-group">
      <label for="coordInput">Coordenada Decimal</label>
      <input type="number" id="coordInput" step="any" placeholder="Ex: -23.5505" oninput="converter()">
      <div id="erroMsg" class="erro"></div>
    </div>

    <div class="buttons">
      <button class="btn-primary" onclick="converter()">Converter</button>
      <button class="btn-secondary" onclick="limpar()">Limpar</button>
    </div>

    <div id="resultado">
      <span class="res-label">Graus, Minutos e Segundos</span>
      <div class="res-val" id="resultadoTexto"></div>
      <button class="btn-secondary" style="width: 100%; margin-top: 0.5rem;" onclick="copiar()">Copiar Resultado</button>
    </div>
  </div>

  <script>
    function decimalParaGMS(decimal, tipo) {
      const absoluto = Math.abs(decimal);
      const graus = Math.floor(absoluto);
      const minutosFloat = (absoluto - graus) * 60;
      const minutos = Math.floor(minutosFloat);
      const segundos = ((minutosFloat - minutos) * 60).toFixed(2);
      
      let direcao = '';
      if (tipo === 'latitude') {
        direcao = decimal < 0 ? 'S' : 'N';
      } else {
        direcao = decimal < 0 ? 'O' : 'L';
      }

      return graus + '° ' + minutos + "' " + segundos + '" ' + direcao;
    }

    function converter() {
      const input = document.getElementById('coordInput');
      const erro = document.getElementById('erroMsg');
      const resultado = document.getElementById('resultado');
      const resultadoTexto = document.getElementById('resultadoTexto');
      const tipo = document.querySelector('input[name="tipo"]:checked').value;

      erro.style.display = 'none';
      if (input.value === '') {
        resultado.classList.remove('ativo');
        return;
      }

      const val = parseFloat(input.value);
      if (isNaN(val)) {
        erro.innerText = 'Insira um valor numérico válido.';
        erro.style.display = 'block';
        resultado.classList.remove('ativo');
        return;
      }

      if (tipo === 'latitude' && (val < -90 || val > 90)) {
        erro.innerText = 'Latitude deve estar entre -90 e 90.';
        erro.style.display = 'block';
        resultado.classList.remove('ativo');
        return;
      }

      if (tipo === 'longitude' && (val < -180 || val > 180)) {
        erro.innerText = 'Longitude deve estar entre -180 e 180.';
        erro.style.display = 'block';
        resultado.classList.remove('ativo');
        return;
      }

      resultadoTexto.innerText = decimalParaGMS(val, tipo);
      resultado.classList.add('ativo');
    }

    function limpar() {
      document.getElementById('coordInput').value = '';
      document.getElementById('resultado').classList.remove('ativo');
      document.getElementById('erroMsg').style.display = 'none';
      document.getElementById('coordInput').focus();
    }

    function copiar() {
      const texto = document.getElementById('resultadoTexto').innerText;
      navigator.clipboard.writeText(texto).then(() => {
        alert('Copiado: ' + texto);
      });
    }
  </script>
</body>
</html>`;
}
