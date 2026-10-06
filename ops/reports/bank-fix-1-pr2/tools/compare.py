import json,re,glob,sys
sys.path.insert(0,'/tmp/claude-0/-home-user-Lazytopper-Production/6630b33a-ac3b-56af-992f-ac80dde5a3d3/scratchpad/fix/tools')
from rowsrc import runtime_index
def normk(s): s=re.sub(r'[()\[\]{}.,:;!?"\']',' ',str(s or '')); return re.sub(r'\s+',' ',s).strip()
def diffcase(o):
  for i in range(len(o)):
    for j in range(i+1,len(o)):
      a,b=normk(o[i]),normk(o[j])
      if a and a!=b and a.lower()==b.lower(): return True
  return False
def resolve(pick,opts):
  N=(lambda s:normk(s)) if diffcase(opts) else (lambda s:normk(s).lower())
  n=N(pick)
  if not n: return -1
  if re.fullmatch(r'[a-h]',n.lower()):
    li=ord(n.lower())-97
    if li<len(opts): return li
  ex=[i for i,o in enumerate(opts) if N(o)==n]
  if ex: return ex[0]
  sub=[i for i,o in enumerate(opts) if (len(N(o))>=3 and N(o) in n) or (len(n)>=3 and N(o) and n in N(o))]
  return sub[0] if sub else -1
def nums(s):
  s=str(s).replace('−','-').replace(',','')
  return {round(float(x),2) for x in re.findall(r'-?\d+(?:\.\d+)?',s)}
