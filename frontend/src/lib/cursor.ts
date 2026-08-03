/**
 * Maps the cursor position from the original text to the corrected text
 * using edit distance alignment.
 */
export function mapCursorPosition(
  originalText: string,
  correctedText: string,
  originalIndex: number
): number {
  if (originalIndex <= 0) return 0;
  if (originalIndex >= originalText.length) return correctedText.length;

  const n = originalText.length;
  const m = correctedText.length;

  // Fallback for extremely large text to avoid performance issues
  if (n * m > 1000000) {
    return Math.round((originalIndex / n) * m);
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    const charOrig = originalText[i - 1];
    for (let j = 1; j <= m; j++) {
      if (charOrig === correctedText[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  // Backtrack to find the optimal alignment path
  let i = n;
  let j = m;
  const path: { orig: number; corr: number }[] = [];

  while (i > 0 || j > 0) {
    path.push({ orig: i, corr: j });
    if (i > 0 && j > 0 && originalText[i - 1] === correctedText[j - 1]) {
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      i--;
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j] === dp[i - 1][j] + 1)) {
      i--;
    } else {
      j--;
    }
  }
  path.push({ orig: 0, corr: 0 });
  path.reverse();

  // Find the last mapping in the path for originalIndex
  let bestCorr = -1;
  for (let k = 0; k < path.length; k++) {
    if (path[k].orig === originalIndex) {
      bestCorr = path[k].corr;
    }
  }

  return bestCorr !== -1 ? bestCorr : correctedText.length;
}
