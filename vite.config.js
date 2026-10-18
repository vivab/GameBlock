import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({
  base:'/GameBlock/',
  build:{rollupOptions:{input:{
    main:resolve(import.meta.dirname,'index.html'),
    casting:resolve(import.meta.dirname,'casting.html'),
    showroom:resolve(import.meta.dirname,'showroom.html'),
  }}},
});
