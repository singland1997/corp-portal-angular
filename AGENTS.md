# Agent guide

ภาพรวมและคำสั่งอยู่ใน [README.md](README.md) งานเข้า `main` ผ่าน PR เท่านั้น ห้ามรัน deploy เองโดยไม่ได้สั่ง

## ก่อนเปิด PR
- `bash scripts/ci/verify.sh dev` ผ่าน
- ดูหน้าจริงทั้งมือถือ (375px) และ desktop; login ด้วยบัญชีของผู้ใช้เอง ห้ามพิมพ์รหัสผ่านแทน

## กฎหน้าจอ
- ค่าไม่รู้แสดง `—` (`UNKNOWN_VALUE`) ห้ามแสดงเป็น 0
- ข้อความใหม่ต้องมีทั้ง `en.ts` และ `th.ts` (test เช็กครบทุก key)
- response ใหม่ต้องมี validator ใน `data-access`; ฟิลด์ที่เพิ่มทีหลังใช้ `optional(...)`
- กราฟ: สัดส่วนใช้ `cp-segmented-bar`, เทียบเพดานใช้ `cp-meter`; ข้อยกเว้นคือวงแหวน Data pool บน dashboard (แสดง % เป็นตัวเลข, เกินเพดานเปลี่ยนสีพร้อมไอคอน)
- ตัวเลขชิดขวา (`align: 'end'`), ยอดเปลี่ยนแปลงใช้ `type: 'signed'`, ตารางหลายหน้ากำหนด `width`
- ใช้ component PrimeNG ตัวใหม่ต้องเพิ่ม theme ใน `core/theme/aura.preset.ts`

## สิ่งที่มักพลาด
- `app.spec.ts` มี `http.verify()` ใน `afterEach`: request ใหม่ต้อง flush ใน test
- หน้าที่โหลดผ่าน `readResource`/`corporateResource` ต้อง `TestBed.tick()` ก่อน expect request
- ข้อมูล CRM อาจเป็นข้อความว่าง ไม่ใช่ `null`
- ชื่อไทยที่ขึ้นต้นด้วยสระหน้า (เ แ โ ใ ไ) ต้องข้ามสระเมื่อทำอักษรย่อ
