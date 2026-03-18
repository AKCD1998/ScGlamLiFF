const normalizeLine = (line) => line.replace(/\s+/g, " ").trim();

const splitReceiptLines = (text) =>
  String(text || "")
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

const normalizeAmountCandidate = (value) => {
  const cleaned = String(value || "").replace(/[^\d., ]/g, "").trim();

  if (!cleaned) {
    return null;
  }

  let normalized = "";
  const spacedMatch = cleaned.match(/^(\d[\d,]*)\s(\d{2})$/);

  if (spacedMatch) {
    normalized = `${spacedMatch[1].replace(/,/g, "")}.${spacedMatch[2]}`;
  } else if (/^\d[\d,]*[.,]\d{2}$/.test(cleaned)) {
    normalized = cleaned.replace(/,/g, "");
  } else if (/^\d[\d,]*$/.test(cleaned)) {
    normalized = `${cleaned.replace(/,/g, "")}.00`;
  } else {
    return null;
  }

  const numericValue = Number(normalized);

  if (Number.isNaN(numericValue)) {
    return null;
  }

  return {
    numericValue,
    display: numericValue.toFixed(2)
  };
};

const collectAmountsFromLine = (line) => {
  const matches = new Set([
    ...(line.match(/\d[\d,]*\s\d{2}\b/g) || []),
    ...(line.match(/\d[\d,]*[.,]\d{2}\b/g) || [])
  ]);

  return [...matches]
    .map((match) => normalizeAmountCandidate(match))
    .filter(Boolean);
};

const isReceiptMetaLine = (line) =>
  /\bBNO[:\s]?[A-Z0-9-:/]+\b/i.test(line) ||
  /\b\d{2}[/-]\d{2}[/-]\d{4}\b.*\b\d{2}:\d{2}\b/.test(line);

const findReceiptLine = (lines) =>
  lines.find((line) =>
    /\b\d{2}[/-]\d{2}[/-]\d{4}\b.*\b\d{2}:\d{2}\b.*\bBNO[:\s]?[A-Z0-9-:/]+\b/i.test(
      line
    )
  ) || "";

const findTotalAmount = (lines) => {
  const anchorIndexes = lines.reduce((indexes, line, index) => {
    if (/\b(total|amount|items|cash|change)\b/i.test(line)) {
      indexes.push(index);
    }
    return indexes;
  }, []);

  const anchoredLines = anchorIndexes.flatMap((index) =>
    lines.slice(Math.max(0, index - 1), index + 3)
  );
  const fallbackLines = lines.slice(-6);
  const candidates = [...anchoredLines, ...fallbackLines]
    .filter((line) => !isReceiptMetaLine(line))
    .flatMap((line) => collectAmountsFromLine(line))
    .sort((left, right) => right.numericValue - left.numericValue);

  const meaningfulCandidate = candidates.find((candidate) => candidate.numericValue >= 10);
  return (meaningfulCandidate || candidates[0])?.display || "";
};

export const parseReceiptText = (rawText) => {
  const normalizedText = String(rawText || "").trim();
  const lines = splitReceiptLines(normalizedText);

  return {
    receiptLine: findReceiptLine(lines),
    totalAmount: findTotalAmount(lines)
  };
};

export default parseReceiptText;
