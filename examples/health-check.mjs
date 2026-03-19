import process from "node:process";

const defaultUrl = "http://127.0.0.1:3510/api/health";
const url = resolveUrl(process.argv.slice(2)) ?? defaultUrl;

const response = await fetch(url, {
  method: "GET"
});

const body = await response.text();
console.log(`status: ${response.status}`);
console.log(`body: ${body}`);

function resolveUrl(argv) {
  const index = argv.indexOf("--url");
  if (index === -1) {
    return undefined;
  }
  return argv[index + 1];
}
