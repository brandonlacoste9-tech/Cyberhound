const forbiddenKeywords = ["startup", "unknown", "pre-revenue", "early stage", "anonymous"];

function isValidCompany(companyName) {
  const cleaned = String(companyName ?? "").trim();
  const isInvalid = 
    !cleaned || 
    cleaned.length < 3 || 
    forbiddenKeywords.some(kw => cleaned.toLowerCase().includes(kw));
  return !isInvalid;
}

const testCases = [
  { name: "Valid Corp", input: "Apple Inc.", expected: true },
  { name: "Too short", input: "AB", expected: false },
  { name: "Empty", input: "", expected: false },
  { name: "Null", input: null, expected: false },
  { name: "Startup keyword", input: "My Tech Startup", expected: false },
  { name: "Unknown keyword", input: "Unknown Company", expected: false },
  { name: "Pre-revenue keyword", input: "Pre-revenue Ventures", expected: false },
  { name: "Early stage keyword", input: "Early stage startup", expected: false },
  { name: "Anonymous keyword", input: "Anonymous Client", expected: false },
  { name: "Valid with parts of keywords", input: "Starbucks", expected: true },
];

console.log("Running Company Name Validation Tests...");
let passed = 0;
testCases.forEach(tc => {
  const result = isValidCompany(tc.input);
  if (result === tc.expected) {
    console.log(`✅ PASS: ${tc.name} ("${tc.input}") -> ${result}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${tc.name} ("${tc.input}") -> Expected ${tc.expected}, got ${result}`);
  }
});

console.log(`\nResults: ${passed}/${testCases.length} passed.`);
if (passed === testCases.length) {
  process.exit(0);
} else {
  process.exit(1);
}
