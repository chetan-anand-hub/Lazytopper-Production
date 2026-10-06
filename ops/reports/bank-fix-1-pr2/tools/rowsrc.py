import json,sys,re,collections as C
sys.path.insert(0,'/tmp/claude-0/-home-user-Lazytopper-Production/6630b33a-ac3b-56af-992f-ac80dde5a3d3/scratchpad/fix/tools')
from tslit import *
A='/tmp/claude-0/-home-user-Lazytopper-Production/6630b33a-ac3b-56af-992f-ac80dde5a3d3/scratchpad/a/'
def runtime_index(dump):
  idx={}
  for q in dump['raw']: idx.setdefault(('bank',q['id']),q)
  for q in dump['predM']: idx[('predicted',q['id'])]=dict(q,subject='Maths')
  for q in dump['predS']: idx[('predicted',q['id'])]=dict(q,subject='Science')
  for b in dump['hpq']:
    for q in b['questions']: idx[('hpq',q['id'])]=q
  for subj,packs in dump['promptD'].items():
    for k,p in packs.items():
      for q in p['questions']: idx[('promptD',q['id'])]=dict(q,_pack=k,_subject=subj)
  return idx
PREF={'hpq':['data/highlyProbableQuestions.ts','data/hpqCompetencyAdditions.ts'],'predicted':['data/predictedQuestions.ts','data/predictedQuestionsScience.ts'],'promptD':['data/promptDPracticePacks.ts']}
def locate(root, rid, surface, loc_hint):
  files=[]
  if surface in PREF: files=['lazytopper/src/'+f for f in PREF[surface]]
  if loc_hint: files.append(loc_hint.rsplit(':',1)[0])
  for f in files:
    try: s=open(root+'/'+f,encoding='utf-8').read()
    except FileNotFoundError: continue
    objs=find_object_local(s,rid)
    if objs: return f,s,objs
  return None,None,[]
