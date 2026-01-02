import axios from 'axios';
import https from 'https';

// Server-side axios instance that accepts self-signed certs in development
// In production, uses normal axios with full SSL verification
export const serverAxios = process.env.NODE_ENV === 'development'
  ? axios.create({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    })
  : axios;

