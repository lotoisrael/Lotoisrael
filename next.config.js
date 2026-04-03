/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        {
          source: '/',
          destination: '/chat.html',
        },
      ],
      fallback: [],
    };
  },
};

module.exports = nextConfig;
