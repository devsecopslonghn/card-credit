const message = (reason, fallback) =>
  reason instanceof Error && reason.message ? reason.message : fallback;

export const loadDashboardResources = async ({ loadCards, loadStatements }) => {
  const [cardsResult, statementsResult] = await Promise.allSettled([
    Promise.resolve().then(loadCards),
    Promise.resolve().then(loadStatements),
  ]);
  return {
    cards: cardsResult.status === "fulfilled" ? cardsResult.value : [],
    statements:
      statementsResult.status === "fulfilled" ? statementsResult.value : [],
    cardsError:
      cardsResult.status === "rejected"
        ? message(cardsResult.reason, "Không thể tải danh sách thẻ.")
        : "",
    statementsError:
      statementsResult.status === "rejected"
        ? message(statementsResult.reason, "Không thể tải kỳ sao kê.")
        : "",
  };
};
