const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
// Servera sākotnējie iestatījumi
const PORT = 8080;
const app = express();
app.use(express.json());
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
// JWT daļas konstantes
const JWT_SECRET = 'SECRET';
const username = 'admin';
const passwordHash = bcrypt.hashSync('admin', 10);
// DB setups
const dbFile = './data_points.db';
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    db.run(`CREATE TABLE IF NOT EXISTS data_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value INTEGER,
      timestamp TEXT
    )`);
  }
});
// Mainīgie datu ģenerēšanai
let previousNumber = 50; 
let rangePercent = 30; 

// Funkcija skaitļu ģenerēšanai ar ±procentu robežu
const generateRandomNumber = () => {
  const min = previousNumber - (previousNumber * (rangePercent / 100));
  const max = previousNumber + (previousNumber * (rangePercent / 100));
  const newNumber = Math.max(0, Math.min(100, Math.random() * (max - min) + min));
  previousNumber = newNumber;
  return Math.round(newNumber);
};

// Funkcija, kas nosūta datus visiem klientiem
const broadcast = data => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}
// Funkcijas, kas verificē JWT 
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).send({ auth: false, message: 'No token provided.' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
    req.userId = decoded.id;
    next();
  });
};
// WebSocket loģika
wss.on('connection', (ws,req) => {
  const token = req.url.split('token=')[1];
  if (!token){
    ws.close();
    return console.log("WebSocket savienojums aizvērts, jo neatrada JWT");
  }
  jwt.verify(token, JWT_SECRET, (err) => {
    if (err) {
      ws.close();
      return console.log('WebSocket savienojums aizvērts, jo JWT nav pareizs');
    }
    console.log('Jauns klients pievienojies');
    //Atrod pēdējos 15 datu punktus un nosūta klientam

    db.all('SELECT * FROM data_points ORDER BY id DESC LIMIT 15', [], (err, rows) => {
      if (err) {
        throw err;
      }
      rows.reverse().forEach((row) => {
        ws.send(JSON.stringify({ type: 'data', value: row.value, timestamp: row.timestamp }));
      });
    });

    // Sesisjas slēgšanas gadījumā izdrukā konsolē
    ws.on('close', () => console.log('Klients atvienojies'));
  });
});

// Periodiskais uzdevums datu ģenerēšanai un sūtīšanai
setInterval(() => {
  const randomNumber = generateRandomNumber();
  const timestamp = new Date().toISOString();
  // Saglabā db datu punktu
  db.run('INSERT INTO data_points (value, timestamp) VALUES (?, ?)', [randomNumber, timestamp]);
  // Nosūtām visiem klientiem jauno datu punktu
  broadcast({ type: 'data', value: randomNumber, timestamp });
}, 10000); // 10 sekundes

// REST API route procentuālajai robežai
app.post('/update-range', verifyToken, (req, res) => {
  const { newRange } = req.body;
  if (typeof newRange === 'number' && newRange >= 0 && newRange <= 100) {
    rangePercent = newRange;
    console.log(`Procentuālā robeža atjaunota uz: ${rangePercent}%`);
    broadcast({ type: 'range', rangePercent });
    res.json({ success: true, rangePercent });
  } else {
    res.status(400).json({ success: false, message: 'Nepareiza vērtība robežai' });
  }
});
// REST API route loginam
app.post('/login', (req, res) => {
  const { username: reqUsername, password: reqPassword } = req.body;

  if (reqUsername === username && bcrypt.compareSync(reqPassword, passwordHash)) {
    const token = jwt.sign({ id: reqUsername }, JWT_SECRET, { expiresIn: 86400 }); // Tokens beidzas pēc 24 stundām
    res.status(200).send({ auth: true, token });
  } else {
    res.status(401).send({ auth: false, message: 'Invalid credentials' });
  }
});
// Servera palaišana
server.listen(PORT, () => {
  console.log(`Serveris darbojas uz porta ${PORT}`);
});
