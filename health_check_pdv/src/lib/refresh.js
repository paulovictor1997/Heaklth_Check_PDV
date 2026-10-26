// De quanto em quanto tempo o painel busca os dados de novo sozinho.
// A PDV envia a cada 5 min; 60 s basta para uma mudança aparecer logo depois de chegar,
// sem sobrecarregar a API mesmo com o painel aberto em várias telas.
export const REFRESH_INTERVAL_MS = 60 * 1000;
