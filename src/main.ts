import { greet } from "./greeting";

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.textContent = greet("Market Analysis");
}
