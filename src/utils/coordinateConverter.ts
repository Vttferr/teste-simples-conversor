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
    houveCarry?: boolean;
  };
}

export interface ValidacaoCoordenada {
  valido: boolean;
  mensagem?: string;
  tipoDetectado?: TipoCoordenada;
}

/**
 * Detecta se o valor possui sinal negativo de acordo com a norma IEEE 754,
 * tratando corretamente tanto números estritamente negativos quanto o zero negativo (-0.0).
 */
export function isSinalNegativo(valor: number): boolean {
  if (valor < 0) return true;
  return Object.is(valor, -0) || (valor === 0 && 1 / valor === -Infinity);
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
 * Converte valor decimal para Graus, Minutos e Segundos (GMS) com rigor matemático
 * sob o padrão IEEE 754.
 *
 * Utiliza quantização inteira euclidiana no domínio escalonado para eliminar
 * cancelamento catastrófico e saídas espúrias de arredondamento (como 60.00" ou 59.999999"),
 * propagando automaticamente o transporte (carry) para minutos e graus.
 *
 * Ex: -23.5505 -> 23° 33' 1.80" S
 */
export function decimalParaGMS(
  decimal: number,
  tipo: TipoCoordenada = 'latitude',
  precisaoSegundos: number = 2,
  convencao: ConvencaoDirecao = 'PT'
): ResultadoGMS {
  const negativo = isSinalNegativo(decimal);
  const absoluto = Math.abs(decimal);

  // Normalização segura da precisão (0 a 10 casas decimais)
  const p = Math.max(0, Math.min(10, Math.round(precisaoSegundos)));
  const fator = Math.pow(10, p);
  const fatorGrau = 3600 * fator;
  const fatorMinuto = 60 * fator;

  // Quantização escalar no domínio inteiro euclidiano (representável sem perda até 2^53 - 1)
  const totalUnidades = Math.round(absoluto * 3600 * fator);

  let graus = Math.floor(totalUnidades / fatorGrau);
  const restoGrausUnidades = totalUnidades % fatorGrau;

  let minutos = Math.floor(restoGrausUnidades / fatorMinuto);
  const restoMinutosUnidades = restoGrausUnidades % fatorMinuto;

  const segundosNum = restoMinutosUnidades / fator;
  let segundosFormatado = segundosNum.toFixed(p);

  // Clamp de segurança estrita para fronteiras físicas geográficas (Polo e Antimeridiano)
  if (tipo === 'latitude' && graus > 90) {
    graus = 90;
    minutos = 0;
    segundosFormatado = (0).toFixed(p);
  } else if (tipo === 'longitude' && graus > 180) {
    graus = 180;
    minutos = 0;
    segundosFormatado = (0).toFixed(p);
  }

  // Decomposição contínua preliminar (para memória de cálculo e rastreabilidade didática)
  const grausPreliminar = Math.floor(absoluto);
  const restoGrausPreliminar = absoluto - grausPreliminar;
  const minutosFloatPreliminar = restoGrausPreliminar * 60;
  const minutosPreliminar = Math.floor(minutosFloatPreliminar);
  const restoMinutosPreliminar = minutosFloatPreliminar - minutosPreliminar;
  const segundosFloatPreliminar = restoMinutosPreliminar * 60;
  const houveCarry = minutos !== minutosPreliminar || graus !== grausPreliminar;

  // Determinar a direção geográfica respeitando IEEE 754 (-0.0)
  let direcao = '';
  let direcaoNome = '';

  if (tipo === 'latitude') {
    if (negativo) {
      direcao = 'S';
      direcaoNome = 'Sul';
    } else {
      direcao = 'N';
      direcaoNome = 'Norte';
    }
  } else if (tipo === 'longitude') {
    if (negativo) {
      direcao = convencao === 'PT' ? 'O' : 'W';
      direcaoNome = 'Oeste';
    } else {
      direcao = convencao === 'PT' ? 'L' : 'E';
      direcaoNome = 'Leste';
    }
  } else {
    // Livre / Genérico
    direcao = negativo ? '-' : '+';
    direcaoNome = negativo ? 'Negativo' : 'Positivo';
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
      restoGraus: restoGrausPreliminar,
      minutosFloat: minutosFloatPreliminar,
      minutosCalculados: minutos,
      restoMinutos: restoMinutosPreliminar,
      segundosFloat: segundosFloatPreliminar,
      segundosArredondados: segundosFormatado,
      houveCarry,
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
  if (isNegativo && decimalAbsoluto === 0) {
    return -0;
  }
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
    function isSinalNegativo(valor) {
      if (valor < 0) return true;
      return Object.is(valor, -0) || (valor === 0 && 1 / valor === -Infinity);
    }

    function decimalParaGMS(decimal, tipo) {
      const isNeg = isSinalNegativo(decimal);
      const absoluto = Math.abs(decimal);
      const precisao = 2;
      const fator = Math.pow(10, precisao);
      const fatorGrau = 3600 * fator;
      const fatorMinuto = 60 * fator;

      const totalUnidades = Math.round(absoluto * 3600 * fator);

      let graus = Math.floor(totalUnidades / fatorGrau);
      const restoGraus = totalUnidades % fatorGrau;

      let minutos = Math.floor(restoGraus / fatorMinuto);
      const restoMinutos = restoGraus % fatorMinuto;

      const segundosNum = restoMinutos / fator;
      let segundosFormatado = segundosNum.toFixed(precisao);

      if (tipo === 'latitude' && graus > 90) {
        graus = 90;
        minutos = 0;
        segundosFormatado = (0).toFixed(precisao);
      } else if (tipo === 'longitude' && graus > 180) {
        graus = 180;
        minutos = 0;
        segundosFormatado = (0).toFixed(precisao);
      }

      let direcao = '';
      if (tipo === 'latitude') {
        direcao = isNeg ? 'S' : 'N';
      } else {
        direcao = isNeg ? 'O' : 'L';
      }

      return graus + '° ' + minutos + "' " + segundosFormatado + '" ' + direcao;
    }

    function converter() {
      const input = document.getElementById('coordInput');
      const erro = document.getElementById('erroMsg');
      const resultado = document.getElementById('resultado');
      const resultadoTexto = document.getElementById('resultadoTexto');
      const tipo = document.querySelector('input[name="tipo"]:checked').value;

      erro.style.display = 'none';
      const rawVal = input.value.trim();
      if (rawVal === '') {
        resultado.classList.remove('ativo');
        return;
      }

      let val = parseFloat(rawVal.replace(',', '.'));
      if (isNaN(val)) {
        erro.innerText = 'Insira um valor numérico válido.';
        erro.style.display = 'block';
        resultado.classList.remove('ativo');
        return;
      }

      // Preservar -0 caso o usuário digite -0 ou -0.0
      if (rawVal.startsWith('-') && val === 0) {
        val = -0;
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
