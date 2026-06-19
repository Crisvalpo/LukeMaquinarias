const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');

const SECRET = 'eb55b73ae63954697aeff2ed429f7bfeb3c00857';
const PORT = 9000;
let deploying = false;

function verifySignature(payload, signature) {
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payload);
  const digest = 'sha256=' + hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', deploying }));
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    return res.end();
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', () => {
    const signature = req.headers['x-hub-signature-256'];
    if (!verifySignature(body, signature)) {
      console.error('[WEBHOOK] Invalid signature');
      res.writeHead(401);
      return res.end('Invalid signature');
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      res.writeHead(400);
      return res.end('Invalid JSON');
    }

    if (deploying) {
      console.log('[WEBHOOK] Deploy already in progress');
      res.writeHead(200);
      return res.end('Deploy already in progress');
    }

    const repoName = payload.repository?.name || 'unknown';
    console.log('[WEBHOOK] Deploy for ' + repoName + ' triggered');
    res.writeHead(200);
    res.end('Deploy started');

    let scriptPath = '/home/cristian/deploy/deploy.sh';
    if (repoName === 'jaime-agent') {
      scriptPath = '/home/cristian/deploy/deploy-jaime.sh';
    } else if (repoName === 'LukeQuiz') {
      scriptPath = '/home/cristian/deploy/deploy-quiz.sh';
    } else if (repoName === 'andina-dashboard') {
      scriptPath = '/home/cristian/deploy/deploy-andina.sh';
    } else if (repoName === 'Delivery') {
      scriptPath = '/home/cristian/deploy/deploy-delivery.sh';
    } else if (repoName === 'ruletavirtual') {
      scriptPath = '/home/cristian/deploy/deploy-ruleta.sh';
    } else if (repoName === 'LukeEquipos') {
      scriptPath = '/home/cristian/deploy/deploy-equipos.sh';
    }

    deploying = true;
    execFile(scriptPath, (err, stdout, stderr) => {
      deploying = false;
      if (err) {
        console.error('[WEBHOOK] Deploy FAILED for ' + repoName + ': ' + err.message);
      } else {
        console.log('[WEBHOOK] Deploy SUCCESS for ' + repoName);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log('[WEBHOOK] Listening on port ' + PORT);
});
