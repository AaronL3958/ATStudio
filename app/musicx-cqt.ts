export type KernelGroup={factor:number;nfft:number;pseudo:boolean;rows:{index:number;bins:number[];re:number[];im:number[]}[]};
// Centered, multi-rate CQT. Filters are generated from librosa, the upstream model's frontend.
// Half-band FIR decimation keeps alignment at t=0 (no uncompensated filter delay).
function downsample(x:Float32Array){const taps=65,half=32,h=Float64Array.from({length:taps},(_,i)=>{const k=i-half;return(k===0?.45:Math.sin(2*Math.PI*.225*k)/(Math.PI*k))*(.42-.5*Math.cos(2*Math.PI*i/(taps-1))+.08*Math.cos(4*Math.PI*i/(taps-1)))}),sum=h.reduce((a,b)=>a+b,0),y=new Float32Array(Math.ceil(x.length/2));for(let i=0;i<y.length;i++){let v=0;for(let j=0;j<taps;j++)v+=(x[i*2+j-half]||0)*h[j];y[i]=v/sum}return y}
class FFT{
 readonly reverse:Uint16Array;readonly cos:Float64Array;readonly sin:Float64Array;
 constructor(readonly n:number){this.reverse=new Uint16Array(n);const bits=Math.log2(n);for(let i=0;i<n;i++){let v=i,j=0;for(let b=0;b<bits;b++){j=j*2+(v&1);v>>=1}this.reverse[i]=j}this.cos=Float64Array.from({length:n/2},(_,i)=>Math.cos(-2*Math.PI*i/n));this.sin=Float64Array.from({length:n/2},(_,i)=>Math.sin(-2*Math.PI*i/n))}
 run(re:Float32Array,im:Float32Array){const {n,reverse,cos,sin}=this;for(let i=0;i<n;i++){const j=reverse[i];if(i<j){const v=re[i];re[i]=re[j];re[j]=v}}for(let size=2;size<=n;size*=2){const half=size/2,stride=n/size;for(let a=0;a<n;a+=size)for(let k=0;k<half;k++){const b=a+k+half,c=a+k,w=k*stride,tr=re[b]*cos[w]-im[b]*sin[w],ti=re[b]*sin[w]+im[b]*cos[w];re[b]=re[c]-tr;im[b]=im[c]-ti;re[c]+=tr;im[c]+=ti}}}
}
export async function musicxCQT(samples:Float32Array,groups:KernelGroup[],progress:(p:number)=>void){
 const count=Math.floor(samples.length/512)+1,result=new Float32Array(count*252),levels=new Map<number,Float32Array>([[1,samples]]);for(let f=2;f<=64;f*=2)levels.set(f,downsample(levels.get(f/2)!));
 let done=0;for(const group of groups){const {factor,nfft,pseudo,rows}=group,x=levels.get(factor)!,fft=new FFT(nfft),re=new Float32Array(nfft),im=new Float32Array(nfft),hann=Float32Array.from({length:nfft},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/nfft));
  for(let frame=0;frame<count;frame++){const center=frame*512/factor;for(let i=0;i<nfft;i++)re[i]=(x[center+i-nfft/2]||0)*(pseudo?hann[i]:1);im.fill(0);fft.run(re,im);if(pseudo)for(let i=0;i<=nfft/2;i++)re[i]=Math.hypot(re[i],im[i]);
   for(const row of rows){let a=0,b=0;for(let k=0;k<row.bins.length;k++){const bin=row.bins[k];if(pseudo)a+=re[bin]*row.re[k];else{a+=re[bin]*row.re[k]-im[bin]*row.im[k];b+=re[bin]*row.im[k]+im[bin]*row.re[k]}}result[frame*252+row.index]=pseudo?a:Math.hypot(a,b)}
   if(frame%256===0){progress((done+frame/count)/groups.length);await new Promise(r=>setTimeout(r,0))}
  }done++;
 }progress(1);return result;
}
