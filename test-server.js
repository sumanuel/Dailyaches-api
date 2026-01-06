import http from "http";

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", message: "Test server working" }));
});

server.listen(3000, "localhost", () => {
  console.log("Test server running on http://localhost:3000");
});
