import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({entryPoints:['app/track-source.ts'],outfile:'.sites-runtime/test-track-source.js',bundle:true,platform:'node',format:'esm'});
const {parseSource}=await import('../.sites-runtime/test-track-source.js');
for(const link of ['https://youtu.be/ZhZPxRBP498?t=20','https://www.youtube.com/watch?v=ZhZPxRBP498&list=test','https://m.youtube.com/shorts/ZhZPxRBP498','https://www.youtube.com/live/ZhZPxRBP498']){const source=parseSource(link);assert.equal(source.id,'ZhZPxRBP498');assert.equal(source.url,'https://www.youtube.com/watch?v=ZhZPxRBP498');assert.equal(source.embed,'https://www.youtube-nocookie.com/embed/ZhZPxRBP498')}
const id='A'.repeat(22);for(const link of [`https://open.spotify.com/track/${id}?si=123`,`https://open.spotify.com/intl-de/track/${id}`]){const source=parseSource(link);assert.equal(source.provider,'spotify');assert.equal(source.embed,`https://open.spotify.com/embed/track/${id}`)}
for(const link of ['javascript:alert(1)','http://youtu.be/ZhZPxRBP498','https://youtube.com.evil.test/watch?v=ZhZPxRBP498','https://evil.test/?v=ZhZPxRBP498','https://user:password@youtube.com/watch?v=ZhZPxRBP498','https://youtube.com:8443/watch?v=ZhZPxRBP498','https://youtu.be/short','https://open.spotify.com/playlist/'+id,'https://youtube.com/playlist?list=test',''])assert.equal(parseSource(link),null,link);
console.log('PASS: canonical YouTube/Spotify URLs, provider validation, tracking removal, unsupported playlists, credential URLs, protocol and hostname rejection.');
