import json,re,os,subprocess
A='/tmp/claude-0/-home-user-Lazytopper-Production/6630b33a-ac3b-56af-992f-ac80dde5a3d3/scratchpad/a/'
SLUG=json.load(open(A+'trends.json'))['slug']
MERGE={'the-human-eye-and-the-colourful-world':'human-eye-and-colourful-world','metals-nonmetals':'metals-and-non-metals','heredity-evolution':'heredity'}
def chapter(row):
  k=row.get('topicKey') or row.get('topic') or ''
  s=SLUG.get(k,k); return MERGE.get(s,s)
OFF={'ncert','exemplar','exemplar2','pyq','pyq2024','pyq2025','pyq2026','sp','sqp','cbe','cfpq','cfpq-sqp25','additionalPQ'}
TP={'chapterwise','fnd','gdr','extract','extract2','expand.extract','z3','preboard'}
def origin(surface,file,ai_ids,rid):
  if surface!='bank': return 'LT-authored('+surface+')'
  if rid in ai_ids: return 'LT-authored(AI pack)'
  f=file.split('/')[-1].replace('.ts',''); ft=f.split('.',1)[1] if '.' in f else f
  if ft in OFF: return 'official('+ft+')'
  if ft in TP: return 'transcribed-third-party('+ft+')'
  return 'LT-authored('+ft+')'
def grep_file(root,rid):
  r=subprocess.run(['grep','-rlF','"'+rid+'"',root+'/lazytopper/src/data/questionBanks',root+'/lazytopper/src/data/canonicalQuestionBank.ts'],capture_output=True,text=True)
  fs=[x for x in r.stdout.split() if 'bankChapters' not in x]
  return [os.path.relpath(x,root) for x in fs]
