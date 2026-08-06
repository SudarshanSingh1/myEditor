// Example demonstrating how to use Hamara Editor's API with TypeScript

interface ExecuteRequest {
  language: string;
  code: string;
}

interface ExecuteResponse {
  output: string;
  error?: string;
}

async function executeCodeTS(): Promise<void> {
  const payload: ExecuteRequest = {
    language: 'typescript',
    code: 'const greeting: string = "Hello from TS API"; console.log(greeting);'
  };

  try {
    const response = await fetch('http://localhost:8000/api/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = (await response.json()) as ExecuteResponse;
    console.log("Execution Result:\n", result.output);
  } catch (error) {
    console.error("Failed to execute code", error);
  }
}

executeCodeTS();
