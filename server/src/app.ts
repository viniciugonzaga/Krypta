import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Rota de teste para saber se o servidor está no ar
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Krypta API está rodando!' });
});

// Aqui você vai importar suas rotas depois:
// import authRoutes from './routes/authRoutes';
// app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  console.log(`🛡️ Servidor Krypta rodando na porta ${PORT}`);
});