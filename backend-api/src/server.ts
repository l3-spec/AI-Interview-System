import { app } from './app';
import { config } from './config';

const PORT = process.env.PORT || 5175;

app.listen(PORT, () => {
  console.log(`
🚀 Server ready at: http://localhost:${PORT}
⭐️ See sample requests: http://localhost:${PORT}/api-docs

Environment: ${process.env.NODE_ENV || 'development'}
  `);
}); 