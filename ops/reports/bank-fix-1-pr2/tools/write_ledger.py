import json,sys
E=json.load(open(sys.argv[1])); out=sys.argv[2]
order=['id','surface','verdict','fields','stemChanged','origin','originalPyqYear','originalPyqSet','key','keyOptionIndex','keyMustContain','why']
lines=['  { '+', '.join(f'{k}: {json.dumps(e[k],ensure_ascii=False)}' for k in order if k in e)+' },' for e in sorted(E,key=lambda e:(e['surface'],e['id']))]
src=open(out,encoding='utf-8').read()
head=src[:src.index('export const BANK_FIX_1_PR1')]
open(out,'w',encoding='utf-8').write(head+'export const BANK_FIX_1_PR1: readonly BankFix1Entry[] = [\n'+'\n'.join(lines)+'\n];\n')
print(len(lines))
