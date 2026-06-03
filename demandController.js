//responder Demanda
export const respondDemand = async (req, res) => {
  try {
    const { demandaId, perguntaId, valor } = req.body;
    const perguntaAtual = questions.find((q) => q.id === perguntaId);
 
    if (!perguntaAtual) {
      return res.status(400).json({ error: "Pergunta inválida" });
    }
    //regra de primeira pergunta
    if (perguntaId === 1 && valor === "NAO") {
      return res.json({
        status: "ENCERRADO",
        message: "Obrigado! Demanda cancelada",
      });
    }
    //salva resposta
    await demandService.saveAnswer(demandaId, perguntaAtual.field, valor);
 
    //define proxima pergunta
    let nextId;
    if (typeof perguntaAtual.next === "object") {
      nextId = perguntaAtual.next[valor]; //ex {sim 3, nao: 6}
    } else {
      nextId = perguntaAtual.next;
    }
 
    //fim do fluxo de pergunta
    if (nextId === "END") {
      return res.json({
        status: "FINALIZADO",
      });
    }
 
    //fluxo chegou ao ponto de salvar
    if (nextId === "SAVE") {
      return res.json({
        status: "SALVO",
        message: "Demanda salva com sucesso!",
      });
    }
 
    const proximaPergunta = questions.find((q) => q.id === nextId);
 
    //Tratamento especial para pdf
    if (proximaPergunta.type === "file") {
      return res.json({
        upload: true,
        message: "Envie o PDF",
        pergunta: proximaPergunta,
      });
    }
 
    return res.json({
      nextQuestion: proximaPergunta,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
 
export const getPerguntas = (req, res) => {
  res.json(questions);
};