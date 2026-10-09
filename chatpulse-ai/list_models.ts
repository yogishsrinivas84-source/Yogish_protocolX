import { prebuiltAppConfig } from "@mlc-ai/web-llm";
console.log(prebuiltAppConfig.model_list.filter(m => m.model_id.toLowerCase().includes("tiny") || m.model_id.toLowerCase().includes("1b")).map(m => m.model_id));
