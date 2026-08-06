/**
 * Example demonstrating how to use Hamara Editor's API with Node.js
 */
async function executeCode() {
  const code = 'console.log("Hello from Hamara Editor JS API!");';
  
  try {
    const response = await fetch('http://localhost:8000/api/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ language: 'javascript', code })
    });
    
    const result = await response.json();
    console.log("Execution Result:\n", result.output);
  } catch (err) {
    console.error("Failed to execute code:", err);
  }
}

executeCode();
