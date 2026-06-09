const DECKS = {
  fibonacci: {
    name: 'Fibonacci',
    values: ['1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'],
  },
  modified_fibonacci: {
    name: 'Modified Fibonacci',
    values: ['0', '½', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'],
  },
  tshirt: {
    name: 'T-Shirt',
    values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '☕'],
  },
  powers_of_2: {
    name: 'Powers of 2',
    values: ['1', '2', '4', '8', '16', '32', '64', '?', '☕'],
  },
  days: {
    name: 'Days',
    values: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?', '☕'],
  },
}

function getNumericValue(vote) {
  const n = parseFloat(vote)
  return isNaN(n) ? null : n
}

function computeStats(votes) {
  const numeric = votes.map(getNumericValue).filter((v) => v !== null)
  if (numeric.length === 0) return null
  const avg = numeric.reduce((a, b) => a + b, 0) / numeric.length
  const min = Math.min(...numeric)
  const max = Math.max(...numeric)
  const counts = {}
  votes.forEach((v) => { counts[v] = (counts[v] || 0) + 1 })
  return { average: Math.round(avg * 10) / 10, min, max, counts }
}

module.exports = { DECKS, computeStats }
