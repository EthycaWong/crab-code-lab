import { compilerApi } from '../../lib/compiler-api.ts';

/** Netlify handles the public routes; the compiler token stays server-side. */
export default function handler(request, context) {
  return compilerApi(request, {
    COMPILER_URL: process.env.COMPILER_URL,
    COMPILER_TOKEN: process.env.COMPILER_TOKEN,
  }, context.ip);
}

export const config = {
  path: ['/api/status', '/api/compile', '/api/submit'],
};
