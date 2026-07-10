const toPlainObject = (card) => {
  if (card && typeof card === "object" && "toObject" in card && typeof card.toObject === "function") {
    return card.toObject();
  }
  return { ...card };
};

export const serializeCreditCard = (card) => {
  const plain = toPlainObject(card);
  const providerName = plain.providerName ?? plain.bank;
  const displayName = plain.displayName ?? plain.name;
  const network = plain.network ?? plain.type;

  return {
    ...plain,
    providerName,
    displayName,
    network,
    legacy: plain.legacy ?? !plain.presetId,
  };
};

export const serializeCreditCards = (cards) => cards.map(serializeCreditCard);
