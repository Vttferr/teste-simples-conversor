import { TipoCoordenada } from '../utils/coordinateConverter';

export type CategoriaHistorico = 'simples' | 'par' | 'inverso';

export interface ItemHistorico {
    id: string;
    timestamp: number;
    categoria: CategoriaHistorico;
    tipoCoordenada?: TipoCoordenada;
    entradaOriginal: string;
    dadosEntrada: {
        decimal?: number;
        decimalSecundario?: number;
        gms?: { graus: number; minutos: number; segundos: number; direcao: string };
    };
    saidaFormatada: string;
    saidaCompacta: string;
    hemisferios: string[];
    precisaoSegundos?: number;
    marcadoComEstrela?: boolean;
    rotuloPersonalizado?: string;
}

const STORAGE_KEY = 'teste_conversor_historico_v1';
const MAX_ITEMS = 100;

export const historicoService = {
    getHistorico: (): ItemHistorico[] => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    },

    salvarItem: (item: ItemHistorico): void => {
        try {
            const historico = historicoService.getHistorico();
            // Remover duplicatas baseadas no resultado e entrada (evitar spam)
            const novoHistorico = [
                item,
                ...historico.filter(
                    (i) => i.saidaFormatada !== item.saidaFormatada || i.entradaOriginal !== item.entradaOriginal
                ),
            ].slice(0, MAX_ITEMS);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(novoHistorico));
        } catch (e) {
            console.error('Erro ao salvar histórico', e);
        }
    },

    limparHistorico: (): void => {
        localStorage.removeItem(STORAGE_KEY);
    },
};
