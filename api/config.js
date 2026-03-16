export const config = { runtime: 'edge' };

export default function handler() {
  return new Response(
    JSON.stringify({ gaId: process.env.GA_MEASUREMENT_ID || '' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400',
      },
    }
  );
}
