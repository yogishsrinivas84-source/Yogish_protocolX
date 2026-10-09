import { CreateMLCEngine } from "@mlc-ai/web-llm";

async function run() {
  console.log("Starting engine...");
  try {
    const engine = await CreateMLCEngine("Llama-3.2-1B-Instruct-q4f16_1-MLC", {
      initProgressCallback: (p) => console.log(p.text)
    });
    console.log("Engine loaded!");
    
    const completion = await engine.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant. Return JSON: { \"test\": true }" },
        { role: "user", content: "Hello" }
      ]
    });
    console.log("Output:", completion.choices[0].message.content);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
