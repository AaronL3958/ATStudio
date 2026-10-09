import sys, pathlib, json, time
# Optional development tool; install the packages in model-export-requirements.txt.
# Run from the website root with the pinned upstream checkout as the first argument.
import torch, numpy as np, torch.nn as nn, torch.nn.functional as F
import librosa, onnxruntime as ort
from librosa.core.constantq import __vqt_filter_fft
torch.set_num_threads(2)
root=pathlib.Path(sys.argv[1]); out=pathlib.Path('public/models/musicx');out.mkdir(parents=True,exist_ok=True)
SPEC_DIM=252
source=(root/'chordnet_ismir_naive.py').read_text()
exec(source[source.index('class CNNFeatureExtractor'):source.index('class ChordNet(NetworkBehavior)')])
class Model(nn.Module):
 def __init__(self):
  super().__init__();self.audio_feature_block=CNNFeatureExtractor();self.lstm1=nn.LSTM(240,96,bidirectional=True,batch_first=True);self.final_fc1=nn.Linear(192,100)
 def forward(self,x):
  return self.final_fc1(self.lstm1(self.audio_feature_block(x))[0])[0]
torch.serialization.add_safe_globals([np.core.multiarray.scalar,np.dtype,type(np.dtype('float64'))])
for fold in range(5):
 model=Model().eval();checkpoint=torch.load(root/f'cache_data/joint_chord_net_ismir_naive_v1.0_reweight(0.0,10.0)_s{fold}.best.sdict',map_location='cpu',weights_only=True)
 weights={k:v for k,v in checkpoint['net'].items() if not k.startswith('condition_linear.')};model.load_state_dict(weights)
 x=torch.rand(1,160,252);path=out/f'fold-{fold}.onnx'
 torch.onnx.export(model,x,str(path),input_names=['cqt'],output_names=['logits'],dynamic_axes={'cqt':{1:'frames'},'logits':{0:'frames'}},opset_version=17,dynamo=False)
 session=ort.InferenceSession(str(path),providers=['CPUExecutionProvider']);test=torch.rand(1,240,252)
 with torch.no_grad(): expected=model(test).numpy()
 actual=session.run(None,{'cqt':test.numpy()})[0];error=float(np.max(np.abs(actual-expected)));assert error<.0001,error
 print('fold',fold,'bytes',path.stat().st_size,'max_error',error,flush=True)
# Multi-rate complex CQT, with librosa's pseudo-CQT on the highest bins.
freqs=librosa.cqt_frequencies(n_bins=252,fmin=librosa.note_to_hz('C1'),bins_per_octave=36)
lengths,_=librosa.filters.wavelet_lengths(freqs=freqs,sr=22050)
pseudo=2**np.ceil(np.log2(lengths))<1024
groups=[]
for octave in range(7):
 ids=np.array([i for i in range(octave*36,(octave+1)*36) if not pseudo[i]])
 if not len(ids):continue
 factor=2**(6-octave);sr=22050/factor
 basis,nfft,lens=__vqt_filter_fft(sr,freqs[ids],1,1,.01)
 rows=[]
 for idx,row,length in zip(ids,basis,lens):
  row=row.tocsr();values=row.data*np.sqrt(factor)/np.sqrt(length)
  rows.append({'index':int(idx),'bins':row.indices.tolist(),'re':values.real.tolist(),'im':values.imag.tolist()})
 groups.append({'factor':factor,'nfft':nfft,'pseudo':False,'rows':rows})
ids=np.where(pseudo)[0];basis,nfft,lens=__vqt_filter_fft(22050,freqs[ids],1,1,.01,hop_length=512)
rows=[]
for idx,row in zip(ids,basis):
 row=row.tocsr();rows.append({'index':int(idx),'bins':row.indices.tolist(),'re':(abs(row.data)/np.sqrt(nfft)).tolist(),'im':[]})
groups.append({'factor':1,'nfft':nfft,'pseudo':True,'rows':rows})
(out/'cqt-kernels.json').write_text(json.dumps(groups,separators=(',',':')))
(out/'LICENSE').write_text((root/'LICENSE').read_text())
pathlib.Path('.sites-runtime').mkdir(exist_ok=True)
# Reference input/output fixture for JS preprocessing parity, using the same pinned model features.
sr=22050;t=np.arange(sr*8)/sr;y=sum(.1*np.sin(2*np.pi*f*t) for f in [130.8128,164.8138,195.9977,261.6256]).astype(np.float32)
y[:sr//4]=0;y[-sr//4:]=0
y.tofile('.sites-runtime/cqt-input.f32');reference=abs(librosa.hybrid_cqt(y,sr=sr,bins_per_octave=36,fmin=librosa.note_to_hz('F#0'),n_bins=288,tuning=0,hop_length=512)).T[:,18:270]
reference.astype(np.float32).tofile('.sites-runtime/cqt-reference.f32')
print('CQT kernels',[(g['factor'],g['nfft'],len(g['rows'])) for g in groups],flush=True)
