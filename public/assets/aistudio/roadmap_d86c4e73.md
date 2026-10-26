# Roadmap de Melhorias Visuais e Funcionais: Histórico de Conversões

## 1. Visão Geral e Diagnóstico Atual

O componente de histórico de conversões do projeto desempenha um papel central na usabilidade diária de profissionais de topografia, engenharia, agrimensura e geoprocessamento. Atualmente, o histórico possui uma implementação básica em [`App.tsx`](file:///c:/Users/T-GAMER/OneDrive/Documentos/GitHub/teste-simples-conversor/teste-simples-conversor/src/App.tsx#L28-L34), caracterizada por:

- **Armazenamento volátil**: O histórico reside apenas no estado em memória (`useState`), sendo perdido a cada atualização de página (*F5*).
- **Escopo restrito de captura**: Apenas conversões manuais disparadas na aba Simples são gravadas; conversões da aba Par Completo (Lat/Lon) e conversões reversas (GMS → Decimal) não são registradas.
- **Interface monocromática simples**: Cada item é renderizado em um contêiner cinza com tipografia básica, sem diferenciação cromática de hemisférios, sem prévias cartográficas e sem métricas visuais de precisão.
- **Ausência de ações em lote e filtros**: Não há ferramentas para buscar termos, filtrar por tipo de coordenada, exportar dados ou manipular itens individualmente.

Este documento estabelece um **roteiro técnico e de design estruturado em 6 fases evolutivas**, com especificações visuais, padrões de cores, regras de acessibilidade e exemplos práticos de código para transformar o histórico em uma central profissional de dados geoespaciais.

---

## 2. Fase 1: Arquitetura de Dados e Persistência Local

### 2.1. Expansão do Modelo de Dados (`ItemHistorico`)

Substituir o modelo simplificado atual por uma estrutura polimórfica e robusta que contemple conversões simples, pares completos e conversões reversas:

```typescript
export type CategoriaHistorico = 'simples' | 'par' | 'inverso';

export interface ItemHistorico {
  id: string;                          // Identificador único (UUID v4 ou nanoid)
  timestamp: number;                   // Timestamp Unix em milissegundos para ordenação
  categoria: CategoriaHistorico;       // Categoria da conversão
  tipoCoordenada?: TipoCoordenada;     // 'latitude' | 'longitude' | 'livre' (se simples)
  
  // Dados de Entrada
  entradaOriginal: string;             // Valor bruto digitado pelo usuário
  dadosEntrada: {
    decimal?: number;                  // Valor decimal primário
    decimalSecundario?: number;        // Segundo decimal (caso de par Lat/Lon)
    gms?: { graus: number; minutos: number; segundos: number; direcao: string };
  };

  // Dados de Saída
  saidaFormatada: string;              // Ex: '23° 33\' 1.80" S' ou '23° 33\' 1.80" S, 46° 38\' 0.00" O'
  saidaCompacta: string;               // Ex: '23°33\'1.80"S'
  hemisferios: string[];               // ['S'], ['O'] ou ['S', 'O']
  precisaoSegundos?: number;          // Casas decimais dos segundos aplicadas
  
  // Metadados
  marcadoComEstrela?: boolean;        // Item favoritado pelo usuário
  rotuloPersonalizado?: string;       // Ex: 'Marco Geodésico 01'
}
```

### 2.2. Camada de Serviço de Persistência (`historicoService.ts`)

Criar um serviço desacoplado com suporte a `localStorage`, controle de capacidade máxima (ex: 100 itens), versionamento de schema e *graceful degradation*:

1. **Chave de armazenamento**: `teste_conversor_historico_v1`.
2. **Capacidade máxima**: Limitar a 100 registros com política FIFO (os mais antigos dão lugar aos novos quando a capacidade atinge o limite).
3. **Resiliência**: Tratamento de exceção `QuotaExceededError` e fallback automático para armazenamento volátil em memória caso os cookies/storage do navegador estejam desativados.

---

## 3. Fase 2: Redesign Visual e Componentização

### 3.1. Design System e Paleta Semântica de Hemisférios

Para conferir legibilidade imediata de relance (*glanceability*), o histórico deve adotar um código de cores semântico padronizado para direções e hemisférios:

| Hemisfério / Direção | Cor de Fundo | Cor da Borda | Cor do Texto / Ícone | Significado Semântico |
| :--- | :--- | :--- | :--- | :--- |
| **Norte (N)** | `bg-emerald-50` | `border-emerald-200` | `text-emerald-700` | Hemisfério Setentrional |
| **Sul (S)** | `bg-sky-50` | `border-sky-200` | `text-sky-700` | Hemisfério Meridional |
| **Leste (L / E)** | `bg-purple-50` | `border-purple-200` | `text-purple-700` | Hemisfério Oriental |
| **Oeste (O / W)** | `bg-amber-50` | `border-amber-200` | `text-amber-700` | Hemisfério Ocidental |
| **Genérico (+ / -)** | `bg-slate-100` | `border-slate-200` | `text-slate-700` | Coordenada Livre |

### 3.2. Anatomia do Card de Histórico Redesenhado

Cada entrada do histórico deve ser estruturada em um card modular contendo:

1. **Cabeçalho do Card**:
   - Badge com a categoria (`Simples • Latitude`, `Par Completo Lat/Lon` ou `GMS → Decimal`).
   - Tempo relativo amigável (`há 2 minutos`, `hoje às 14:32`) acompanhado de tooltip com data e hora completas.
   - Botão de favoritar (ícone de estrela `Star` da biblioteca `lucide-react`) para fixar itens importantes no topo.
2. **Corpo Central (Valores Numéricos)**:
   - Coordenada de saída formatada em tipografia monoespaciada com números tabulares (`font-mono text-base font-bold tabular-nums text-slate-900`).
   - Badges direcionais destacados ao lado da coordenada (ex: pill arredondada `S` em azul e `O` em âmbar).
   - Subtexto explicativo indicando a entrada decimal original e a precisão adotada.
3. **Barra de Ações Rápidas Integrada** (discreta no desktop, revelada no *hover* com transição suave):
   - Botão `Copiar GMS` (com feedback de ícone de check verde por 2 segundos).
   - Botão `Carregar no Conversor` (preenche os inputs e muda para a aba ativa).
   - Botão `Abrir no Mapa` (Google Maps / OpenStreetMap).
   - Botão `Excluir` (ícone de lixeira `Trash2`).

---

## 4. Fase 3: Ações Rápidas e Interatividade Aumentada

### 4.1. Cópia Rápida em Vários Formatos

Ao clicar no botão de cópia rápida ou em um menu suspenso de cópia (`Copy`), permitir a seleção instantânea do formato de exportação textual:
- **GMS Tradicional**: `23° 33' 1.80" S`
- **GMS Compacto**: `23°33'1.80"S`
- **Decimal Puro**: `-23.5505`
- **Par WKT (Well-Known Text)**: `POINT(-46.6333 -23.5505)`

### 4.2. Integração com Provedores Cartográficos

Para qualquer coordenada válida ou par completo registrado no histórico:
- **Google Maps**: `https://www.google.com/maps/search/?api=1&query={lat},{lon}`
- **OpenStreetMap**: `https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=16/{lat}/{lon}`
- **Google Earth Web**: `https://earth.google.com/web/search/{lat},{lon}`

### 4.3. Diálogo de Confirmação para Limpeza Total

Substituir o gatilho imediato de limpeza por um modal ou barra de confirmação (*Inline Confirmation*) com contagem de itens a serem removidos, prevenindo perda acidental de histórico por cliques involuntários.

---

## 5. Fase 4: Busca em Tempo Real, Filtros e Agrupamento Temporal

### 5.1. Barra de Pesquisa Instantânea

Implementar um campo de busca inteligente no topo da aba de histórico com suporte a:
- Busca por valores numéricos decimais ou sexagesimais (ex: `-23`, `5505`, `33'`).
- Busca por direções ou rótulos (ex: `Sul`, `Oeste`, `Lisboa`).

### 5.2. Barra de Filtros por Chips (Pills)

Disponibilizar chips de alternância rápida:
- `Todos` (com contador numérico, ex: `24`)
- `Favoritos ★`
- `Pares Completos`
- `Latitude`
- `Longitude`
- `Reversos (GMS → Dec)`

### 5.3. Agrupamento Temporal Visual

Organizar a listagem em blocos temporais encabeçados por divisores elegantes:
- **Hoje** (itens gravados no dia atual)
- **Ontem**
- **Esta Semana**
- **Anteriores**

---

## 6. Fase 5: Exportação em Lote (Interoperabilidade GIS)

Adicionar uma barra de ferramentas de exportação (`Download`) permitindo descarregar o histórico filtrado ou completo nos formatos padrão de mercado:

1. **CSV (Planilhas Excel e LibreOffice)**:
   - Cabeçalhos: `ID,Timestamp,Categoria,Entrada_Decimal,Graus,Minutos,Segundos,Direcao,Formatado_GMS`
   - Compatível com separador decimal e codificação UTF-8 com BOM.
2. **JSON Estruturado**:
   - Arquivo padronizado para restauração de backup ou consumo por APIs.
3. **GeoJSON (`FeatureCollection`)**:
   - Gera feições do tipo `Point` com propriedades completas de GMS, pronto para ser arrastado e solto no **QGIS**, **ArcGIS** ou bibliotecas como **Leaflet** e **Mapbox**.
4. **KML (Keyhole Markup Language)**:
   - Arquivo `.kml` com marcadores de ponto (*Placemarks*), permitindo visualização direta no **Google Earth Pro** ou **Google Earth Web**.

---

## 7. Fase 6: Acessibilidade (a11y) e Ergonomia de Teclado

1. **Navegação por Teclado Completa**:
   - Cada card e botão do histórico deve possuir anel de foco visível e contrastante (`focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none`).
   - Tecla `Enter` ou `Espaço` em um item ativa a ação primária (carregar no conversor).
2. **Regiões Vivas ARIA (`aria-live`)**:
   - Ao copiar uma coordenada ou limpar o histórico, disparar alertas em uma região `aria-live="polite"` para leitores de tela (ex: *"Coordenada 23 graus 33 minutos 1.8 segundos Sul copiada com sucesso"*).
3. **Atalhos Globais**:
   - `Ctrl + H` ou `Cmd + H`: Alterna rapidamente entre o conversor ativo e a aba de histórico.
   - `Ctrl + K` ou `/`: Direciona o foco imediatamente para a barra de busca do histórico.

---

## 8. Cronograma de Implementação Recomendado

| Sprint | Escopo Principal | Entregáveis Técnicos |
| :---: | :--- | :--- |
| **Sprint 1** | Persistência e Modelo Unificado | Implementação do serviço `historicoService.ts` com `localStorage`, captura automática de conversões simples, pares e inversas. |
| **Sprint 2** | Redesign dos Cards e Badges | Criação do componente `HistoricoCard.tsx` com paleta de cores dos hemisférios, tipografia monoespaciada e feedback tátil de cópia. |
| **Sprint 3** | Interatividade e Mapas | Ações de recarregar no formulário, abertura no Google Maps/OSM e botão de favoritar itens com estrela. |
| **Sprint 4** | Filtros, Busca e Exportação | Barra de busca em tempo real, chips de filtro por tipo de coordenada e modal de exportação em CSV/JSON/GeoJSON/KML. |
| **Sprint 5** | Testes e Auditoria de Acessibilidade | Validação com leitores de tela (NVDA/VoiceOver), testes de contraste de cores WCAG 2.1 AA e suporte a atalhos de teclado. |
