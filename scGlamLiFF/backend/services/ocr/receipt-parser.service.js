const RECEIPT_LINE_PATTERN =
  /(?<date>\d{2}[/-]\d{2}[/-]\d{4})\s*(?<time>\d{2}:\d{2})\s*(?:BN[O0]|BNO)\s*[:;.]?\s*(?<bno>[A-Z0-9\-:/ ]+)/i;

const normalizeLine = (line) =>
  String(line || "")
    .replace(/\s+/g, " ")
    .replace(/\bBN[O0]\s*[:;.]?\s*/gi, "BNO:")
    .replace(/\bID\s*:\s*/gi, "")
    .trim();

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

const canonicalizeReceiptLine = (value) => {
  const normalized = normalizeLine(value).toUpperCase();
  const match = RECEIPT_LINE_PATTERN.exec(normalized);

  if (!match?.groups) {
    return normalized;
  }

  const date = match.groups.date.replace(/-/g, "/");
  const time = match.groups.time;
  const bno = match.groups.bno.replace(/\s+/g, "").replace(/[:-]+$/g, "");

  return `${date} ${time} BNO:${bno}`;
};

const buildReceiptLineCandidates = (lines) => {
  const candidates = [...lines];

  for (let index = 0; index < lines.length - 1; index += 1) {
    candidates.push(`${lines[index]} ${lines[index + 1]}`);
  }

  return candidates;
};

const findReceiptLine = (lines) => {
  const candidates = buildReceiptLineCandidates(lines);

  for (const candidate of candidates) {
    if (RECEIPT_LINE_PATTERN.test(candidate)) {
      return canonicalizeReceiptLine(candidate);
    }
  }

  return "";
};

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

  const meaningfulCandidate = candidates.find(
    (candidate) => candidate.numericValue >= 10
  );

  return meaningfulCandidate || candidates[0] || null;
};

const extractReceiptLineParts = (receiptLine) => {
  const match = RECEIPT_LINE_PATTERN.exec(String(receiptLine || ""));

  if (!match?.groups) {
    return {
      receiptDate: "",
      receiptTime: ""
    };
  }

  const [day, month, year] = match.groups.date.replace(/-/g, "/").split("/");

  return {
    receiptDate:
      day && month && year
        ? `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
        : "",
    receiptTime: match.groups.time || ""
  };
};

const formatTotalAmountDisplay = (amountCandidate) =>
  amountCandidate ? `${amountCandidate.display} THB` : "";

export const parseReceiptText = (rawText) => {
  const normalizedText = String(rawText || "").trim();
  const lines = splitReceiptLines(normalizedText);
  const receiptLine = findReceiptLine(lines);
  const totalAmountCandidate = findTotalAmount(lines);
  const { receiptDate, receiptTime } = extractReceiptLineParts(receiptLine);

  return {
    receiptLine,
    totalAmount: formatTotalAmountDisplay(totalAmountCandidate),
    totalAmountValue: totalAmountCandidate?.numericValue ?? null,
    receiptDate,
    receiptTime,
    merchantName: ""
  };
};

export default parseReceiptText;
