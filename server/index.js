import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runScanPipeline } from './pipeline.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

app.post('/api/scan', async (req, res) => {
  const { imageBase64, mimeType = 'image/jpeg' } = req.body;

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  try {
    const result = await runScanPipeline(imageBase64, mimeType);
    return res.json(result);
  } catch (err) {
    const message = err.message || 'Internal server error';
    const isUserFacing =
      message.startsWith('We could not') ||
      message.startsWith('No packaged') ||
      message.startsWith('This image');
    return res.status(isUserFacing ? 422 : 500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`EcoScan server running on http://localhost:${PORT}`);
});
