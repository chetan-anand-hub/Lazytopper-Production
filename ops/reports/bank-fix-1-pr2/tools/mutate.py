import subprocess,sys,json,re,shutil
W='/home/user/LT-worktrees/bf1/lazytopper/'
def run(test):
  r=subprocess.run(['npx','vitest','run',test],cwd=W,capture_output=True,text=True,timeout=900)
  m=re.search(r'Tests\s+(.*)',r.stdout); return r.returncode, (m.group(1).strip() if m else r.stdout[-300:])
def mutate(name,path,old,new,test):
  p=W+path; s=open(p,encoding='utf-8').read(); n=s.count(old)
  if n<1: return (name,'SKIP old not found')
  shutil.copy(p,p+'.bak'); open(p,'w',encoding='utf-8').write(s.replace(old,new,1))
  try: rc,summ=run(test)
  finally: shutil.move(p+'.bak',p)
  return (name,'RED (caught)' if rc!=0 else 'GREEN (NOT caught!)',summ)
T='src/data/bankFix/bankFix1.pr1.test.ts'
M=[
 ('M1 objective key reverted (QE2-053 answer "3"->"1")','src/data/questionBanks/class10/maths/quadraticEquations.pack2.ts','answer: "3", explanation: "The correct answer is 3. Since x = 1/3','answer: "1", explanation: "The correct answer is 3. Since x = 1/3',T),
 ('M2 written value reverted (ST2-006 36.25 -> 34 in answer+finalAnswer)','src/data/questionBanks/class10/maths/statistics.pack2.ts','36.25','34',T),
 ('M3 year re-added to a fixed official row (QE-N-EXMPLR-4-MCQ-001)','src/data/questionBanks/class10/maths/quadraticEquations.exemplar.ts','sourceOverride: "others"','sourceOverride: "others", pyqYear: "2023"',T),
 ('M4 override removed from a fixed NCERT-id row (QE-N-EXMPLR-4-MCQ-001)','src/data/questionBanks/class10/maths/quadraticEquations.exemplar.ts','sourceOverride: "others"','sourceOverrideX: "others"',T),
 ('M5 withheld id dropped (CG2-046)','src/data/canonicalQuestionBank.ts','  "CG2-046",','  // "CG2-046",',T),
 ('M6 PracticePage stops honouring the override','src/pages/PracticePage.tsx','const sourceOverridden = (q as { sourceOverride?: unknown }).sourceOverride === "others";','const sourceOverridden = false as boolean;',T),
 ('M7 isPYQQuestion stops honouring the override','src/utils/isPYQQuestion.ts','if (cast.sourceOverride === "others") return false;','',T),
]
out=[mutate(*m) for m in M]
json.dump(out,open('/tmp/claude-0/-home-user-Lazytopper-Production/6630b33a-ac3b-56af-992f-ac80dde5a3d3/scratchpad/fix/mutations_pr1.json','w'),indent=1)
for o in out: print(o)
