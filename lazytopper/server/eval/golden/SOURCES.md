# Golden set — marking-scheme sources (manifest)

Every golden value point is cited to an official CBSE document by file, PDF page and printed
page (`data/verify/items.verified.json`, field `source` / `scheme[].citation`). The documents
themselves (341 MB of PDFs, zips, text extractions and page renders, folder `golden/sources/`
of the GRADER-AUDIT-1 audit) are **not committed** (controller decision D2: repository size; the
CI replay needs none of them). This manifest records where each one comes from, so anyone can
re-download it and check the hash.

Source of this list: the audit's `golden/README.md` §2 and `golden/tools/sources_sha256.txt`
(scout S2, 2026-10-05). sha256 is of the downloaded file as-is.

## Cited by a golden item

| used for | document | year | public URL (zip#inner path) | local file | sha256 |
|---|---|---|---|---|---|
| Maths M01-M09, M11, M13-M19 | Marking Scheme, Mathematics Standard 041, 30/1/1 | 2025 | https://www.cbse.gov.in/cbsenew/Marking-Scheme/2025/X/Math.zip#Math/041 Mathematics Standard/X_MS_041_Mathematics Standard_30-1-1_2024-25.pdf | MS2025_041_30-1-1.pdf | 88c21cb435a6a817f9c5eb82dbfff48817b9159952031a4288d8b0a2cd7f85b5 |
| Maths M10, M12, M20-M22 | Marking Scheme, Mathematics Standard 041, 30/1/1 | 2024 | https://www.cbse.gov.in/cbsenew/Marking-Scheme/2024/X/Mathematics_Standard.zip#Mathematics_Standard/MS 041_30-1-1 Mathematics 2023-24.pdf | MS2024_041_30-1-1.pdf | fd2faadbb9083e17e7fe3ae028a1f1392f4d7dbb217233917ffc1338554b9b81 |
| Maths M23, M24 | Marking Scheme, Mathematics Standard 041, 30/1/1 | 2023 | https://www.cbse.gov.in/cbsenew/Marking-Scheme/2023/X/Maths_Standard.zip#Maths_Standard/MS 041_30-1-1 Mathematics 2022-23.pdf | MS2023_041_30-1-1.pdf | c68f8df1795c92b4faf437b6cb2b33b4d895a34c7573a6e51173aa3827e5986d |
| Science S01, S02, S04, S06, S07, S09, S10, S13-S16 | Marking Scheme, Science 086, 31/1/1 to 31/1/3 (English) | 2025 | https://www.cbse.gov.in/cbsenew/Marking-Scheme/2025/X/Science.zip#Science/086 Science (English Medium)/X_086_31-1-1 to 3 Science_MS.pdf | MS2025_086_31-1-1to3.pdf | 6aaf56c0f86194a6e9e1933817c72e8473883a9f0735aa6f8be960abc0f5f47a |
| Science S06 (Hindi scheme) | Marking Scheme, Science 086, 31/1/1 to 3 (Hindi medium) | 2025 | https://www.cbse.gov.in/cbsenew/Marking-Scheme/2025/X/Science.zip#Science/086 Science (Hindi Medium)/X_086_31_1-1 to 3_Science _HINDI_Med.pdf | MS2025_086_31-1_HINDI.pdf | d212c221bf412e4df01b42eb2c47df95bb021e11aba3b8ea29af848af70b226f |
| Science S11 | Marking Scheme, Science 086, 31/2/1 to 31/2/3 | 2025 | https://www.cbse.gov.in/cbsenew/Marking-Scheme/2025/X/Science.zip#Science/086 Science (English Medium)/X_086_31-2-1 to 3_Science_MS.pdf | MS2025_086_31-2-1to3.pdf | 6dbdb6a2f5f74f5ccffdeaf9866e82004103e1c2bcf302f6caa5dee358a2476d |
| Science S05, S08, S12 | Marking Scheme, Science 086, 31/1/1 to 31/1/3 (31/1/2 at PDF pp 14-26) | 2024 | https://www.cbse.gov.in/cbsenew/Marking-Scheme/2024/X/Science.zip#Science/Science_English)/science (English) set no. 1.pdf | MS2024_086_31-1_set1.pdf | 829ea13f976d3399b7886322b0b59f143f2e61ae7b6c3cd147e373d637069184 |
| Science S03, S17, S18, S19 | Sample Question Paper 2026-27, Science 086 — Marking Scheme | 2026-27 | https://cbseacademic.nic.in/web_material/SQP/ClassX_2026_27/Science-MS.pdf | SQP2026_27_Science-MS.pdf | 195e5b399354e5334af15e8e42688923272d430876b18e5f1e609e1c6709ce5e |
| question text S01-S16 | Question Paper, Science 31/1/1 (bilingual; English on odd pages) | 2025 | https://www.cbse.gov.in/cbsenew/question-paper/2025/X/086_Science.zip#086_Science/31-1-1_Science.pdf | QP2025_086_31-1-1.pdf | d753039479520adcf8ca690b7a52208a444fc7160667e12452dc867bec025801 |
| question text S11 | Question Paper, Science 31/2/1 | 2025 | https://www.cbse.gov.in/cbsenew/question-paper/2025/X/086_Science.zip#086_Science/31-2-1_Science.pdf | QP2025_086_31-2-1.pdf | 2a280593f17d900309e1d76d5535d14600e48fd84a62537087e3c082e915084b |
| question text S05, S08, S12 (scanned; read visually) | Question Paper, Science 31/1/2 | 2024 | https://www.cbse.gov.in/cbsenew/question-paper/2024/X/SCIENCE.zip#SCIENCE/31_1_2_Science.pdf | QP2024_086_31-1-2.pdf | 32f43e40ef005cd8fc114b8dd88c577232eb302bd77a2f39e305c083091dea5b |
| question text S03, S17-S19 | Sample Question Paper 2026-27, Science 086 | 2026-27 | https://cbseacademic.nic.in/web_material/SQP/ClassX_2026_27/Science-SQP.pdf | SQP2026_27_Science-SQP.pdf | 09bf85a26357d9b3c44976e722a4532c383a99ccbd97e8fc9a0fb06c8ac64eff |

Maths marking schemes embed the question as an image (read visually); Science schemes do not
reprint the question, hence the question-paper rows.

## Errors found in the official sources (the golden set follows the correct mathematics/physics)

- MS 2025 Maths 30/1/1 Q35 (PDF p15): the mode uses class width 3; the class width is 2
  (19.95 printed, 19.64 correct). GS-M16-a expects 19.64 to earn 5/5.
- SQP 2026-27 Science MS Q33(B) (PDF p7): prints n21 = v2/v1; correct is v1/v2 (GS-S19).
- SQP 2026-27 Science MS Q35 (PDF p8): lens formula written 1/f = 1/v + 1/u, garbled
  arithmetic (final f = -12 cm right). Not used as an item.

## Also downloaded by the audit and hashed (not cited by an item)

| file | bytes | sha256 |
|---|---|---|
| MS2023_041_30-2-1.pdf | 826208 | 7c9347a4bd2093f9f1aae64c4de5aa1b5f71b87f9f5d7c3430463ed057342dfd |
| MS2023_086_31-1_set1.pdf | 1322947 | 022212f34c091764db9c21cb51a02464c834676c4f48ebafadd2902cfb5b2417 |
| MS2023_086_31-2_allsets.pdf | 1732753 | 57d51b4b95b33fa18c0a5324cb1821a069bd1000150a0e51a40a9fe32f60a055 |
| MS2024_041_30-2-1.pdf | 1161470 | 91529d466d87e761979c534dac39d752f358a72885d4f2acaef10f4722908154 |
| MS2024_086_31-1_HINDI_set1.pdf | 1983757 | 378ad5104e2e46c57d8e63cf962a038259d0d36e4a4c6327b7b48088c9f9ab0c |
| MS2024_086_31-2_set2.pdf | 1090515 | 10c3f32bcc95f7c52bdc0ad4c1d21fc057ff8aa83a317b6eb8b047a2003dc517 |
| MS2025_041_30-2-1.pdf | 1885351 | fb8e29912fe8275237a02082e9ee5bb7c9acb586331fc9152520a544b6123846 |
| QP2023_086_31-1-1.pdf | 7050818 | 4ac854fa4a93649c92b09d489838651df49a1ea5274c781565e41426e34aada3 |
| QP2024_086_31-1-1.pdf | 3470362 | eea42959a1b10e9920bde24702c647f9287cda8f6f4cb676ace25353915384ec |
| QP2024_086_31-2-1.pdf | 4162739 | 00a165c8fc4cf7b76d089d3f40aecde872ab468d0fbf3ade67d4d415092f80c7 |
| QP2025_086_31-1-3.pdf | 743703 | cbef001bb800e24a5006914368c0bbc7f359c7bdea65d873cb3a43109d5c8497 |
| SQP2025_26_Science-MS.pdf | 823797 | 4e08939a24cff72c336adc2fa444c06924308e945b36873d31f05c7ef23b84d1 |
| SQP2025_26_Science-SQP.pdf | 960352 | ec9f01d34a0fcf3ae0354bb811bda1ca6b8c345db80699959aa46b1c16d5b445 |
| SQP2026_27_MathsStandard-MS.pdf | 2153065 | 5447c8c31176395b51315aec8bf5f92edd4293811013c9ab260dec74592beb29 |
| SQP2026_27_MathsStandard-SQP.pdf | 3014269 | 9dec9cd2850c410b73b08c77d341f3e8b0ec4e533d852c0a25b4dadd49a262be |
| 2023_X_Maths_Standard.zip | 17447334 | 5897682fe503a23681b49c7dfa17e1af0953b46f8ab18e1957965c49c3fc715a |
| 2023_X_Science_English_Medium.zip | 16291635 | ed8da6a0586f3bd79864e3007c42318936b2aca1ab609951b7cea92b6f2403d5 |
| 2024_X_Mathematics_Standard.zip | 23403469 | 09f2ce58f79a8aae3cc741f36d3a64a5fdf94f33e782a11f04289872d402a33a |
| 2024_X_Science.zip | 19367531 | 656d212c42a3c21b58a9c2f9df39a4df842a7e9bb6e0c4ca6ebacfa941508ca8 |
| 2025_X_Math.zip | 56866390 | 11da8f09e6594bad698f5959ed5a8faeead1630eb4569b242395825254df8248 |
| 2025_X_Science.zip | 20277052 | b10406c8a57741ddb33db08ed67e2e0c449fea7797f77dfee7d2e4b407102789 |
| QP_2023_SCIENCE.zip | 50410934 | e1b0053ea7c128fe4bc3af834951df8cbf9f1664288f0afb4c586e79476e4e55 |
| QP_2024_SCIENCE.zip | 43196021 | 9223cdcf7ae29d03d482cb1f3851d61aaee815012d900cb65e7c622936842861 |
| QP_2025_086_Science.zip | 43732463 | 5e288459ad2558db9b6ee2fa652c123e1842047daaa0452133d6d365d2dc426d |

The 2026 board-exam marking schemes (first and second board exam, same CBSE page) were not used
(out of the audit's year range); they are the natural next source for a set refresh.
