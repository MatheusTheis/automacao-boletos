// server.js
import express from 'express';
import { registrarBoleto, EMPRESAS } from './registrarBoleto.js';

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.post('/api/boletos', async (req, res) => {
  try {
    const info = await registrarBoleto(req.body);
    res.json({ ok:true, ...info });
  } catch (e) {
    res.status(400).json({ ok:false, erro: e.message });
  }
});

app.get('/api/empresas', (_,res)=> res.json(EMPRESAS));

app.listen(3000, ()=> console.log('➡ Abra http://localhost:3000 no navegador'));
