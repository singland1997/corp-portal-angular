# Corp Portal UI (Angular) — agent guide

Angular 21 + PrimeNG 21 + Tailwind, ไทย/อังกฤษ เป็น frontend หลัก (Flutter `../corp_portal_ui` หยุดแก้ไว้ก่อน) API อยู่ที่ `../corp-portal-api` ภาพรวมใน [README.md](README.md)

## วิธีทำงาน (AI-native SDLC)
งานใหม่เดินตาม `~/Documents/home/docs/ai-native-sdlc.md`: `intent.md` → `spec.md` → `plan.md` → โค้ด+เทส → PR เก็บที่ `docs/work/<YYYY-MM-DD>-<slug>/` ถ้างานคร่อม API ให้ intent/spec อยู่ที่ repo API แล้ว `plan.md` ของฝั่ง UI อยู่ที่นี่ งานเข้า `main` ผ่าน PR เท่านั้น review ตาม [REVIEW.md](REVIEW.md)

## คำสั่ง
- Node 24 ตาม `.nvmrc` (`nvm install 24` ถ้ายังไม่มี)
- ตรวจ: `bash scripts/ci/verify.sh dev` (CI รันตัวเดียวกัน) หรือ `npm run format` → `npm test -- --watch=false` → `npm run build` (skill `angular-check`)
- Deploy: `.github/workflows/deploy.yml` → `scripts/ci/deploy.sh` ดู [docs/aws-deployment.md](docs/aws-deployment.md) ห้ามรัน `deploy` เองโดยไม่ได้สั่ง
- ดูหน้าจริง: login ด้วยบัญชีของผู้ใช้เอง ห้ามพิมพ์รหัสผ่านแทน ตรวจทั้งมือถือ (375px) และ desktop

## กฎหน้าจอ
- ค่าไม่รู้หรือข้อความว่างแสดง `—` (`UNKNOWN_VALUE`) ห้ามแสดงเป็น 0
- ข้อความใหม่ต้องมีทั้ง `core/i18n/locales/en.ts` และ `th.ts` (test เช็กครบทุก key)
- response ใหม่ต้องมี validator ใน `data-access/*-response.ts`; ฟิลด์ที่เพิ่มทีหลังใช้ `optional(...)`
- กราฟ: สัดส่วนของทั้งหมดใช้ `cp-segmented-bar`, อัตราส่วนเทียบเพดานใช้ `cp-meter` ไม่ใช้โดนัท 2 ส่วน สีสถานะมีชื่อ/จำนวนกำกับเสมอ
- แก้ `proxy.conf.json` ให้แก้ `../corp_portal_ui/web_dev_config.yaml` ให้ตรงกันด้วย

## สิ่งที่ AI มักพลาดใน repo นี้
- `app.spec.ts` มี `http.verify()` ใน `afterEach`: หน้าที่ยิง request เพิ่มต้อง flush ใน test ไม่งั้น test อื่นพังต่อเนื่อง
- Pool มาจาก CRM แก้ไขใน Portal ไม่ได้; ปุ่มปรับโควตาแสดงเมื่อ `capabilities.quotaAdjust` เป็นจริงเท่านั้น
- ชื่อไทยที่ขึ้นต้นด้วยสระหน้า (เ แ โ ใ ไ) ต้องข้ามสระเมื่อทำอักษรย่อ
- ข้อมูลจาก CRM อาจเป็นข้อความว่าง ไม่ใช่ `null`
