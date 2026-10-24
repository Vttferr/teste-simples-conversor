# Relatório Técnico de Auditoria: Precisão de Ponto Flutuante (IEEE 754) na Conversão Decimal → GMS

> **Revisão 2 (2026-10-24).** Esta versão substitui a anterior, que atribuía incorretamente à função TypeScript original uma falha de transporte (*carry*) nos segundos. Todas as afirmações abaixo foram verificadas executando o código original (`git show HEAD:src/utils/coordinateConverter.ts`) lado a lado com o código corrigido.

## 1. Sumário Executivo

O projeto tem **duas implementações independentes** da conversão Decimal → GMS:

| Implementação | Local | Usada por |
| :--- | :--- | :--- |
| **A. TypeScript** | [`decimalParaGMS`](file:///c:/Users/T-GAMER/OneDrive/Documentos/GitHub/teste-simples-conversor/teste-simples-conversor/src/utils/coordinateConverter.ts) | Aplicação React ([`App.tsx`](file:///c:/Users/T-GAMER/OneDrive/Documentos/GitHub/teste-simples-conversor/teste-simples-conversor/src/App.tsx)) |
| **B. JavaScript embutido** | string devolvida por [`gerarCodigoHTMLPuro`](file:///c:/Users/T-GAMER/OneDrive/Documentos/GitHub/teste-simples-conversor/teste-simples-conversor/src/utils/coordinateConverter.ts) | Ficheiro `.html` standalone que o utilizador descarrega |

Resultado da auditoria:

| # | Falha | Implementação afetada | Gravidade |
| :---: | :--- | :--- | :--- |
| F1 | Segundos iguais a `60.00"` (sem transporte para minutos/graus) | **Apenas B** (HTML standalone) | Alta |
| F2 | Zero negativo (`-0`) classificado como Norte / Leste / `+` | **A e B** | Média |
| F3 | Memória de cálculo ("passo a passo") mostrava operações aritmeticamente inconsistentes quando havia transporte | **Apenas A** (interface React) | Média (didática/confiança) |

> [!IMPORTANT]
> **Na implementação TypeScript (A), os únicos problemas reais eram F2 (sinal de `-0`) e F3 (memória de cálculo).** O resultado GMS formatado da versão TS original **já estava correto** em todos os casos de transporte testados (ex.: `12.1` → `12° 6' 0.00" N`), porque o código original verificava `segundos >= 60` após o `toFixed` e propagava +1 minuto / +1 grau.

---

## 2. Contexto: representação binária inexata (IEEE 754 binary64)

Um `number` em JavaScript é um binary64: 1 bit de sinal, 11 bits de expoente, 52 bits de fração (53 bits de significando, ~15–17 dígitos decimais). Frações decimais com fator 5 no denominador não têm representação finita em base 2. Exemplo:

$$12.1_{10} \;\mapsto\; 12.0999999999999996447286321199499070644378662109375$$

A decomposição contínua clássica

```text
graus   = floor(|D|)
minF    = (|D| - graus) * 60
minutos = floor(minF)
segF    = (minF - minutos) * 60
```

aplicada a `12.1` produz, em binary64:

| Passo | Valor binary64 |
| :--- | :--- |
| `|D| - 12` | `0.09999999999999964` |
| `× 60` → `minF` | `5.999999999999979` |
| `floor(minF)` | `5` (e não `6`) |
| `(minF - 5) × 60` → `segF` | `59.99999999999872` |

`segF` arredondado a 2 casas é `"60.00"`. O que acontece a seguir depende de cada implementação.

---

## 3. Falhas encontradas

### F1 — `60.00"` no HTML standalone (apenas implementação B)

O JavaScript embutido no HTML gerado fazia apenas:

```javascript
const segundos = ((minutosFloat - minutos) * 60).toFixed(2);
```

Sem qualquer verificação de transporte. Saídas reais medidas no código original:

| Entrada | Saída original (B) | Saída corrigida (B) |
| :--- | :--- | :--- |
| `12.1` (lat) | `12° 5' 60.00" N` | `12° 6' 0.00" N` |
| `45 + 1/60` (lat) | `45° 0' 60.00" N` | `45° 1' 0.00" N` |
| `89.99999999` (lat) | `89° 59' 60.00" N` | `90° 0' 0.00" N` |
| `179.99999999` (lon) | `179° 59' 60.00" L` | `180° 0' 0.00" L` |

### F2 — Sinal do zero negativo (implementações A e B)

Em binary64 existe `-0` (bit de sinal = 1). Em ECMAScript, `-0 < 0` é `false`. Ambas as implementações decidiam a direção com `decimal < 0`, pelo que `-0` era tratado como positivo. `parseFloat("-0")` devolve `-0`, logo o caso era alcançável a partir da interface.

| Entrada | Tipo | Original | Corrigido |
| :--- | :--- | :--- | :--- |
| `-0` | Latitude | `0° 0' 0.00" N` | `0° 0' 0.00" S` |
| `-0` | Longitude | `0° 0' 0.00" L` | `0° 0' 0.00" O` |
| `-0` | Livre | `0° 0' 0.00" +` | `0° 0' 0.00" -` |

### F3 — Inconsistência na memória de cálculo (apenas implementação A)

A função TS original aplicava o transporte **depois** de calcular os restos contínuos, mas o painel "Ver memória de cálculo matemática" misturava valores **pós-transporte** (`resultado.graus`, `resultado.minutos`) com valores **pré-transporte** (`restoGraus`, `minutosFloat`) e ainda os arredondava com `toFixed(4)`. O resultado eram linhas aritmeticamente falsas. Texto efetivamente gerado pelo código original:

**Entrada `23.2499988889`:**
```text
5. Minutos = floor(14.9999) = 15'          ← floor(14.9999) é 14
6. Segundos = (14.9999 - 15) × 60 = 0.00"  ← o resultado seria negativo
```

**Entrada `23.9999988889`:**
```text
2. Graus = floor(23.9999988889) = 24°      ← floor é 23
3. Resto = 23.9999988889 - 24 = 0.999999   ← a subtração dá −0.0000011
5. Minutos = floor(59.9999) = 0'           ← floor é 59
```

O resultado final (`23° 15' 0.00" N`, `24° 0' 0.00" N`) estava certo; a explicação apresentada ao utilizador é que estava errada.

---

## 4. Correções aplicadas

### 4.1. F2 — Deteção do bit de sinal

Nova função exportada [`isSinalNegativo`](file:///c:/Users/T-GAMER/OneDrive/Documentos/GitHub/teste-simples-conversor/teste-simples-conversor/src/utils/coordinateConverter.ts):

```typescript
export function isSinalNegativo(valor: number): boolean {
  if (valor < 0) return true;
  return Object.is(valor, -0) || (valor === 0 && 1 / valor === -Infinity);
}
```

Aplicada em `decimalParaGMS` (A) e no script do HTML standalone (B). Em [`App.tsx`](file:///c:/Users/T-GAMER/OneDrive/Documentos/GitHub/teste-simples-conversor/teste-simples-conversor/src/App.tsx), o parsing dos modos "Coordenada Única" e "Par Lat/Lon" força `-0` quando o texto começa por `-` e o valor é zero (ex.: `"-0.000"`). Em `gmsParaDecimal`, uma entrada `0° 0' 0"` com direção S/O/W/- passa a devolver `-0` em vez de `+0` (antes, `(-0).toFixed(6)` perdia o sinal). Na interface isto não é visível, porque o React renderiza `-0` como `"0"`.

### 4.2. F3 — Memória de cálculo coerente

- `passoAPasso` passou a expor explicitamente os valores **contínuos preliminares** (antes do transporte), mais um novo campo `houveCarry: boolean`.
- O painel em `App.tsx` mostra agora os passos 2–6 com os valores preliminares, impressos **sem `toFixed`** (representação binary64 mais curta que faz *round-trip*). Assim cada `floor(x) = n` e cada subtração mostrada é aritmeticamente verdadeira. Exemplo para `12.1`:
  ```text
  5. Minutos preliminares = floor(5.999999999999979) = 5'
  6. Segundos contínuos = (5.999999999999979 - 5) × 60 = 59.99999999999872"
  7. Quantização Inteira (IEEE 754) = 12° 6' 0.00"
  ```
- Quando `houveCarry` é verdadeiro, aparece uma nota a explicar que o arredondamento propagou +1 para minutos/graus.

### 4.3. F1 — Algoritmo de quantização inteira

As implementações A e B passaram a usar o mesmo algoritmo, descrito na secção 5. **Para a implementação A isto é uma refatoração, não uma correção de resultado:** em todos os casos testados (secção 6) as saídas formatadas antiga e nova de A são idênticas, exceto em `-0` (F2). Para a implementação B, é isto que elimina o `60.00"`.

Foram também adicionadas duas salvaguardas defensivas em A, sem efeito observável nos casos testados: normalização de `precisaoSegundos` para um inteiro em `[0, 10]`, e limitação de `graus` a 90 (latitude) / 180 (longitude). Esta última é inalcançável a partir da interface, porque `validarIntervalo` já rejeita valores fora desses limites.

---

## 5. Fundamentação matemática do algoritmo

Seja $D$ o decimal de entrada e $p \in \{0,\dots,10\}$ o número de casas dos segundos. Definem-se:

$$K_s = 10^p,\qquad K_m = 60\,K_s,\qquad K_g = 3600\,K_s$$

$$U = \mathrm{Math.round}\big(\,\mathrm{fl}(|D| \cdot 3600 \cdot K_s)\,\big) \in \mathbb{N}_0$$

onde $\mathrm{fl}(\cdot)$ denota o produto calculado em binary64 e `Math.round` arredonda ao inteiro mais próximo, com empates para $+\infty$ (atenção: **não** é o arredondamento por omissão do IEEE 754, que é *ties-to-even*).

Divisão euclidiana:

$$G = \lfloor U / K_g \rfloor,\quad R_G = U \bmod K_g;\qquad M = \lfloor R_G / K_m \rfloor,\quad R_M = R_G \bmod K_m;\qquad S = R_M / K_s$$

**Proposição 1 — Os segundos nunca chegam a 60.** Como $0 \le R_M \le K_m - 1$:

$$0 \le S \le \frac{60\cdot 10^p - 1}{10^p} = 60 - 10^{-p} < 60$$

$R_M$ é inteiro, logo $S$ tem no máximo $p$ casas decimais, e `S.toFixed(p)` não pode arredondar para cima até `60`.

**Proposição 2 — Os minutos nunca chegam a 60.** Como $0 \le R_G \le K_g - 1$:

$$M \le \left\lfloor \frac{3600\cdot 10^p - 1}{60\cdot 10^p} \right\rfloor = 59$$

**Proposição 3 — O transporte é automático.** Se os segundos contínuos arredondam para $60$ na precisão $p$, o arredondamento de $U$ cruza um múltiplo de $K_m$ (ou de $K_g$). A divisão euclidiana devolve então $R_M = 0$ e incrementa $M$, ou devolve $R_G = 0$ e incrementa $G$. Não é preciso nenhum ramo condicional de transporte.

**Proposição 4 — As operações inteiras são exatas.** No pior caso, $|D| = 180$ e $p = 10$:

$$U_{\max} = 180 \cdot 3600 \cdot 10^{10} = 6.48\times10^{15} < 2^{53}-1 \approx 9.007\times10^{15}$$

Portanto `Math.floor`, `/` e `%` sobre $U$ operam em inteiros representáveis exatamente. (Com a precisão por omissão $p = 2$: $U_{\max} = 6.48\times10^{7}$.)

> [!NOTE]
> **Limite honesto do método.** O produto $\mathrm{fl}(|D|\cdot 3600\cdot 10^p)$ continua sujeito a um erro relativo de arredondamento da ordem de $2^{-53}$ por multiplicação. Por isso, um valor cujos segundos fiquem *exatamente* sobre um empate na casa $p$ pode ser arredondado para qualquer dos lados. O método garante as Proposições 1–3 (forma GMS sempre válida), mas não garante exatidão decimal arbitrária num empate.

---

## 6. Tabela de verificação: original vs. corrigido

Todos os valores foram obtidos executando o código original (`HEAD`) e o código corrigido com `precisaoSegundos = 2`.

| Entrada | Tipo | A original (TS) | A corrigido (TS) | B original (HTML) | Estado |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `12.1` | Latitude | `12° 6' 0.00" N` | `12° 6' 0.00" N` | `12° 5' 60.00" N` | A sem alteração · B corrigido |
| `45 + 1/60` | Latitude | `45° 1' 0.00" N` | `45° 1' 0.00" N` | `45° 0' 60.00" N` | A sem alteração · B corrigido |
| `23.2499988889` | Latitude | `23° 15' 0.00" N` | `23° 15' 0.00" N` | — | A sem alteração (memória de cálculo corrigida, F3) |
| `23.9999988889` | Latitude | `24° 0' 0.00" N` | `24° 0' 0.00" N` | — | A sem alteração (memória de cálculo corrigida, F3) |
| `-0` | Latitude | `0° 0' 0.00" N` | `0° 0' 0.00" S` | `0° 0' 0.00" N` | Corrigido (F2) |
| `-0` | Longitude | `0° 0' 0.00" L` | `0° 0' 0.00" O` | — | Corrigido (F2) |
| `-0` | Livre | `0° 0' 0.00" +` | `0° 0' 0.00" -` | — | Corrigido (F2) |
| `-23.5505` | Latitude | `23° 33' 1.80" S` | `23° 33' 1.80" S` | — | Sem alteração |
| `-23.550520` | Latitude | `23° 33' 1.87" S` | `23° 33' 1.87" S` | — | Sem alteração |
| `45.9999999` | Latitude | `46° 0' 0.00" N` | `46° 0' 0.00" N` | — | Sem alteração |
| `-0.5083333` | Latitude | `0° 30' 30.00" S` | `0° 30' 30.00" S` | — | Sem alteração |
| `89.99999999` | Latitude | `90° 0' 0.00" N` | `90° 0' 0.00" N` | `89° 59' 60.00" N` | A sem alteração · B corrigido |
| `179.99999999` | Longitude | `180° 0' 0.00" L` | `180° 0' 0.00" L` | `179° 59' 60.00" L` | A sem alteração · B corrigido |

"—" = não medido nessa implementação.

---

## 7. Ficheiros alterados

1. [`src/utils/coordinateConverter.ts`](file:///c:/Users/T-GAMER/OneDrive/Documentos/GitHub/teste-simples-conversor/teste-simples-conversor/src/utils/coordinateConverter.ts)
   - Novo `isSinalNegativo` (F2).
   - `decimalParaGMS`: deteção de sinal (F2); `passoAPasso` com valores preliminares e `houveCarry` (F3); algoritmo de quantização inteira (refatoração); salvaguardas defensivas.
   - `gmsParaDecimal`: preserva `-0`.
   - `gerarCodigoHTMLPuro`: script embutido com quantização inteira (F1), deteção de `-0` (F2) e aceitação de vírgula decimal.
2. [`src/App.tsx`](file:///c:/Users/T-GAMER/OneDrive/Documentos/GitHub/teste-simples-conversor/teste-simples-conversor/src/App.tsx)
   - Parsing que preserva `-0` nos modos "Coordenada Única" e "Par Lat/Lon" (F2).
   - Painel de memória de cálculo reescrito com valores coerentes e nota de transporte (F3).
3. `package.json` (não relacionado com a precisão): `esbuild` alinhado de `^0.25.0` para `^0.28.0`, para satisfazer o *peer range* `^0.27.0 || ^0.28.0` do `vite@8`. Assim, `npm install` funciona sem `--legacy-peer-deps`.

## 8. Verificação

- `npm install` (instalação limpa, sem flags): OK.
- `npx tsc --noEmit`: sem erros.
- `npm run build` (vite 8.3.5): OK.
- Tabela da secção 6 reproduzida por script Node que importa o código original e o corrigido.
- **Não verificado:** teste end-to-end no browser (histórico e consola), porque a ferramenta de automação do browser falhou ao descarregar o driver do Playwright (HTTP 404).
