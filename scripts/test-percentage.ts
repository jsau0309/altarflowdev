// Test percentage calculation
const grossAmount = 2199.13
const fees = 4.12

// Current calculation (WRONG)
const currentRate = fees / grossAmount  // = 0.00187
console.log('Current stored value:', currentRate)
console.log('Current display (× 100):', (currentRate * 100).toFixed(2) + '%')  // Shows 0.19%

// What 0.19% actually means
console.log('\nWhat 0.19% means:')
console.log('$100 × 0.19% = $100 × 0.0019 = $0.19')
console.log('$100 × 19% = $100 × 0.19 = $19.00')

// The correct calculation
console.log('\nCorrect calculation:')
console.log('Fees / Gross =', fees, '/', grossAmount, '=', currentRate)
console.log('As percentage:', (currentRate * 100).toFixed(4) + '%')  // 0.1874%

// Verification
console.log('\nVerification:')
console.log('If rate is 0.187%, then $100 × 0.00187 = $0.187')
console.log('If rate is 0.19%, then $100 × 0.0019 = $0.19')
console.log('If rate is 19%, then $100 × 0.19 = $19.00')