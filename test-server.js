const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello, world!\n');
});

const port = process.env.PORT || 5000;
const host = '127.0.0.1';

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}/`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});
