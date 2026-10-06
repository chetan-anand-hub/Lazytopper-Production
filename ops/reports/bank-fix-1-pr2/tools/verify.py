import json,sys,collections as C
sys.path.insert(0,'/tmp/claude-0/-home-user-Lazytopper-Production/6630b33a-ac3b-56af-992f-ac80dde5a3d3/scratchpad/fix/tools')
from rowsrc import runtime_index
def verify(before, after, results, allowed_extra=('sourceOverride','pyqYear','pyqSet','working')):
  B=runtime_index(json.load(open(before))); A=runtime_index(json.load(open(after)))
  fixes={(r['surface'],r['id']):r for r in results if r['verdict']=='fix'}
  probs=[]
  assert set(B)==set(A), ('id set changed', set(B)^set(A))
  changed=0
  for k in B:
    b,a=B[k],A[k]
    if k in fixes:
      for f,v in fixes[k]['fields'].items():
        if a.get(f)!=v:
          # factory explanation is derived; skip explanation compare there
          if f=='explanation' and 'questionId' in str(b): continue
          probs.append((k,f,'not applied',str(a.get(f))[:80],str(v)[:80]))
      diff={f for f in set(a)|set(b) if a.get(f)!=b.get(f)}-set(fixes[k]['fields'])-set(allowed_extra)-{'explanation','solutionSteps'}
      if diff: probs.append((k,'unexpected fields changed',diff))
      changed+=1
    else:
      if a!=b: probs.append((k,'UNPATCHED ROW CHANGED',{f for f in set(a)|set(b) if a.get(f)!=b.get(f)}))
  return changed,probs
