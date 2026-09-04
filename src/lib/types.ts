export type TipoProva = "PESO" | "REPETICOES" | "FOR_TIME" | "FOR_TIME_CAP";

export interface Categoria {
  id: string;
  nome: string;
}

export interface Dupla {
  id: string;
  categoria_id: string;
  nome_dupla: string;
  atleta_1: string;
  atleta_2: string;
  created_at: string;
}

export interface Prova {
  id: string;
  numero: number;
  nome: string | null;
  tipo: TipoProva;
  time_cap_seconds: number | null;
  publicado: boolean;
  created_at: string;
}

export interface Resultado {
  id: string;
  prova_id: string;
  dupla_id: string;
  peso_lb: number | null;
  repeticoes: number | null;
  tempo_seconds: number | null;
  tomou_cap: boolean;
  repeticoes_faltantes: number | null;
  colocacao: number | null;
  pontos: number | null;
  created_at: string;
  updated_at: string;
}

/** Linha de ranking geral, calculada em memória (nunca persistida). */
export interface RankingGeral {
  dupla_id: string;
  nome_dupla: string;
  totalPontos: number;
  /** colocação em cada prova publicada, ordenadas por número da prova — usado no desempate */
  colocacoesOrdenadas: number[];
  pontosPorProva: Record<string, number | null>;
}
