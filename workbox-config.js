module.exports = {
  globDirectory: 'public/',
  globPatterns: [
    '**/*.{js,css,png,html,ejs,json,ico}'
  ],
  swDest: 'public/sw.js',
  swSrc: 'public/sw-src.js' // Our source service worker file
};