import type { Dupla, Prova, Resultado, RankingGeral } from "./types";

/**
 * Formata o segundos em mm:ss (usado em FOR_TIME e FOR_TIME_CAP quando finalizado).
 */
export function formatTempo(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Formata o resultado bruto de uma dupla numa prova, no formato exigido
 * pela especificação (120 lb / 85 reps / 08:32 / CAP +20).
 * Retorna null se a dupla não tiver lançado resultado (não participou).
 */
export function formatResultado(prova: Prova, resultado: Resultado | undefined): string | null {
  if (!resultado) return null;
  switch (prova.tipo) {
    case "PESO":
      return resultado.peso_lb != null ? `${resultado.peso_lb} lb` : null;
    case "REPETICOES":
      return resultado.repeticoes != null ? `${resultado.repeticoes} reps` : null;
    case "FOR_TIME":
      return resultado.tempo_seconds != null ? formatTempo(resultado.tempo_seconds) : null;
    case "FOR_TIME_CAP":
      if (resultado.tomou_cap) {
        return resultado.repeticoes_faltantes != null ? `CAP +${resultado.repeticoes_faltantes}` : null;
      }
      return resultado.tempo_seconds != null ? formatTempo(resultado.tempo_seconds) : null;
    default:
      return null;
  }
}

/**
 * Compara dois resultados da MESMA prova e retorna quem fica na frente
 * (-1 = a fica na frente de b, 1 = b fica na frente de a, 0 = empate).
 * "Melhor" depende do tipo de prova.
 */
function compararResultados(prova: Prova, a: Resultado, b: Resultado): number {
  if (prova.tipo === "PESO") {
    return (b.peso_lb ?? -Infinity) - (a.peso_lb ?? -Infinity);
  }
  if (prova.tipo === "REPETICOES") {
    return (b.repeticoes ?? -Infinity) - (a.repeticoes ?? -Infinity);
  }
  if (prova.tipo === "FOR_TIME") {
    return (a.tempo_seconds ?? Infinity) - (b.tempo_seconds ?? Infinity);
  }
  // FOR_TIME_CAP: quem terminou (tomou_cap = false) sempre fica na frente
  // de quem tomou CAP. Entre os que terminaram, menor tempo primeiro.
  // Entre os que tomaram CAP, menos reps faltantes primeiro.
  const aCap = a.tomou_cap;
  const bCap = b.tomou_cap;
  if (aCap !== bCap) return aCap ? 1 : -1;
  if (!aCap) {
    return (a.tempo_seconds ?? Infinity) - (b.tempo_seconds ?? Infinity);
  }
  return (a.repeticoes_faltantes ?? Infinity) - (b.repeticoes_faltantes ?? Infinity);
}

export interface ColocacaoPontos {
  dupla_id: string;
  colocacao: number;
  pontos: number;
}

/**
 * Calcula colocação e pontos de TODAS as duplas de uma categoria numa prova.
 *
 * Regras:
 * - O total de pontos da 1ª colocada é o número de duplas CADASTRADAS na
 *   categoria (fixo), não apenas as que participaram desta prova.
 * - Duplas que não lançaram resultado nesta prova recebem 0 pontos e não
 *   entram na disputa de colocação (ficam sempre atrás de quem pontuou).
 * - Empate: mesma colocação, mesma pontuação (a próxima colocação "pula"
 *   a quantidade de duplas empatadas, no padrão de competição esportiva).
 */
export function calcularColocacoesEPontos(
  prova: Prova,
  duplasDaCategoria: Dupla[],
  resultadosDaProva: Resultado[]
): ColocacaoPontos[] {
  const totalDuplas = duplasDaCategoria.length;
  const resultadoPorDupla = new Map(resultadosDaProva.map((r) => [r.dupla_id, r]));

  const participantes = duplasDaCategoria.filter((d) => resultadoPorDupla.has(d.id));
  const naoParticipantes = duplasDaCategoria.filter((d) => !resultadoPorDupla.has(d.id));

  participantes.sort((a, b) =>
    compararResultados(prova, resultadoPorDupla.get(a.id)!, resultadoPorDupla.get(b.id)!)
  );

  const saida: ColocacaoPontos[] = [];
  let i = 0;
  while (i < participantes.length) {
    // agrupa empatados (comparação = 0 entre todos do grupo)
    let j = i + 1;
    while (
      j < participantes.length &&
      compararResultados(
        prova,
        resultadoPorDupla.get(participantes[i].id)!,
        resultadoPorDupla.get(participantes[j].id)!
      ) === 0
    ) {
      j++;
    }
    const colocacao = i + 1; // posição 1-based do início do grupo
    const pontos = totalDuplas - colocacao + 1;
    for (let k = i; k < j; k++) {
      saida.push({ dupla_id: participantes[k].id, colocacao, pontos });
    }
    i = j;
  }

  for (const d of naoParticipantes) {
    saida.push({ dupla_id: d.id, colocacao: totalDuplas, pontos: 0 });
  }

  return saida;
}

/**
 * Calcula o ranking geral de uma categoria a partir dos resultados de TODAS
 * as provas publicadas. Nunca é persistido — sempre derivado ao vivo.
 *
 * Desempate: compara a sequência de colocações de cada dupla (melhor 1ª
 * colocação, depois melhor 2ª colocação, etc — como um quadro de medalhas),
 * e por último, ordem alfabética do nome da dupla.
 */
export function calcularRankingGeral(
  duplasDaCategoria: Dupla[],
  provasPublicadas: Prova[],
  resultados: Resultado[]
): RankingGeral[] {
  const provasOrdenadas = [...provasPublicadas].sort((a, b) => a.numero - b.numero);

  const linhas: RankingGeral[] = duplasDaCategoria.map((dupla) => {
    const pontosPorProva: Record<string, number | null> = {};
    const colocacoes: number[] = [];
    let totalPontos = 0;

    for (const prova of provasOrdenadas) {
      const resultado = resultados.find((r) => r.prova_id === prova.id && r.dupla_id === dupla.id);
      const pontos = resultado?.pontos ?? 0;
      pontosPorProva[prova.id] = resultado?.pontos ?? null;
      totalPontos += pontos;
      if (resultado?.colocacao != null) colocacoes.push(resultado.colocacao);
    }

    // ordena as colocações da melhor (menor número) para a pior, para o desempate
    colocacoes.sort((a, b) => a - b);

    return {
      dupla_id: dupla.id,
      nome_dupla: dupla.nome_dupla,
      totalPontos,
      colocacoesOrdenadas: colocacoes,
      pontosPorProva,
    };
  });

  linhas.sort((a, b) => {
    if (b.totalPontos !== a.totalPontos) return b.totalPontos - a.totalPontos;
    const len = Math.max(a.colocacoesOrdenadas.length, b.colocacoesOrdenadas.length);
    for (let i = 0; i < len; i++) {
      const ca = a.colocacoesOrdenadas[i] ?? Infinity;
      const cb = b.colocacoesOrdenadas[i] ?? Infinity;
      if (ca !== cb) return ca - cb;
    }
    return a.nome_dupla.localeCompare(b.nome_dupla, "pt-BR");
  });

  return linhas;
}
